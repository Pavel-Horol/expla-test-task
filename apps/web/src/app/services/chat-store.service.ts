import { computed, effect, inject, Injectable, Injector, runInInjectionContext, signal } from '@angular/core';
import { RoomsService } from './rooms.service';
import { MessagesService } from './messages.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';
import { EventsRealtimeService, MessageNotification, PresenceUpdate, RoomAddedEvent } from './events-realtime.service';
import { NotificationService } from './notification.service';
import { Message, Room } from '../core/models';
import { catchError, finalize, of } from 'rxjs';

const MESSAGES_PAGE_LIMIT = 50;
type TypingEvent = { userId: string; username: string; roomId: string; isTyping: boolean };

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private roomsService = inject(RoomsService);
  private messagesService = inject(MessagesService);
  private auth = inject(AuthService);
  private realtime = inject(RealtimeService);
  private eventsRealtime = inject(EventsRealtimeService);
  private notifications = inject(NotificationService);
  private injector = inject(Injector);
  private typingThrottleMs = 1000;
  private typingStopDelayMs = 1500;
  private typingLastSentAt = 0;
  private typingLastState = false;
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;

  readonly rooms = signal<Room[]>([]);
  readonly selectedRoomId = signal<string | null>(null);
  readonly activeRoomId = signal<string | null>(null);
  readonly selectedRoomDetails = signal<Room | null>(null);
  readonly messagesByRoom = signal<Record<string, Message[]>>({});
  readonly messageCursorByRoom = signal<Record<string, string | null>>({});
  readonly hasMoreByRoom = signal<Record<string, boolean>>({});
  readonly unreadByRoom = signal<Record<string, number>>({});
  readonly presenceByUserId = signal<Record<string, 'online' | 'offline'>>({});
  readonly loadingRooms = signal(false);
  readonly loadingMessages = signal(false);
  readonly loadingOlder = signal(false);
  readonly error = signal<string | null>(null);
  readonly typingUsers = signal<string[]>([]);
  readonly socketStatus = signal<'connected' | 'disconnected' | 'connecting'>('connecting');
  readonly socketError = signal<string | null>(null);
  readonly roomsFilter = signal<'all' | 'online'>('all');
  readonly currentUserId = computed(() => this.auth.user()?.id ?? null);
  readonly currentUsername = computed(() => this.auth.user()?.username ?? null);

  readonly selectedRoom = computed(() => {
    const id = this.selectedRoomId();
    if (!id) return null;
    const details = this.selectedRoomDetails();
    if (details && details.id === id) return details;
    return this.rooms().find((room) => room.id === id) ?? null;
  });

  readonly selectedMessages = computed(() => {
    const id = this.selectedRoomId();
    if (!id) return [];
    return this.messagesByRoom()[id] ?? [];
  });

  readonly selectedHasMore = computed(() => {
    const id = this.selectedRoomId();
    if (!id) return false;
    return this.hasMoreByRoom()[id] ?? false;
  });

  init(): void {
    if (this.auth.hasToken()) {
      this.auth.profile().subscribe({
        next: (user) => this.auth.user.set(user),
      });
      this.auth.startAutoRefresh();
      this.loadRoomsFromApi();
      this.socketStatus.set('connecting');
      this.realtime.connect();
      this.eventsRealtime.connect();
      this.realtime.onNewMessage((message) => this.insertIncoming(message));
      this.realtime.onUserTyping((data) => this.handleTyping(data));
      this.eventsRealtime.onMessageNotification((data) => this.handleMessageNotification(data));
      this.eventsRealtime.onPresenceUpdate((data) => this.handlePresenceUpdate(data));
      this.eventsRealtime.onRoomAdded((data) => this.handleRoomAdded(data));
      this.realtime.onConnect(() => {
        this.socketStatus.set('connected');
        this.socketError.set(null);
        const current = this.selectedRoomId();
        if (current) this.realtime.joinRoom(current);
      });
      this.eventsRealtime.onConnect(() => {
        const current = this.activeRoomId();
        this.eventsRealtime.setActiveRoom(current ?? null);
      });
      this.realtime.onDisconnect((reason) => {
        this.socketStatus.set('disconnected');
        this.typingUsers.set([]);
        if (reason === 'io server disconnect') {
          const refresh$ = this.auth.refreshAccessToken();
          if (refresh$) {
            refresh$.subscribe({
              next: (tokens) => {
                this.auth.setTokens(tokens);
                this.realtime.updateToken(tokens.accessToken);
                this.socketStatus.set('connecting');
                this.realtime.connect();
              },
            });
          }
        }
      });
      this.realtime.onConnectError((error) => {
        this.socketStatus.set('disconnected');
        this.socketError.set(error.message);
      });
      this.eventsRealtime.onConnectError((error) => {
        this.socketError.set(error.message);
      });

      runInInjectionContext(this.injector, () => {
        effect(() => {
          const token = this.auth.accessToken();
          this.realtime.updateToken(token);
          this.eventsRealtime.updateToken(token);
        });
        effect(() => {
          const roomId = this.selectedRoomId();
          this.activeRoomId.set(roomId);
          this.eventsRealtime.setActiveRoom(roomId ?? null);
          if (roomId) {
            this.clearUnread(roomId);
          }
        });
        effect(() => {
          const roomId = this.selectedRoomId();
          if (!roomId) {
            this.selectedRoomDetails.set(null);
            return;
          }
          this.loadRoomDetailsFromApi(roomId);
        });
      });
    }
  }

  setRoomsFilter(filter: 'all' | 'online'): void {
    if (this.roomsFilter() === filter) return;
    this.roomsFilter.set(filter);
    this.loadRoomsFromApi(filter);
  }

  selectRoom(roomId: string): void {
    if (this.selectedRoomId() === roomId) return;
    const previous = this.selectedRoomId();
    if (previous) this.realtime.leaveRoom(previous);

    this.selectedRoomId.set(roomId);
    this.selectedRoomDetails.set(null);
    this.typingUsers.set([]);
    this.realtime.joinRoom(roomId);

    if (!this.messagesByRoom()[roomId]) {
      this.loadMessagesFromApi(roomId);
    }
  }

  sendMessage(content: string): void {
    const roomId = this.selectedRoomId();
    if (!roomId || !content.trim()) return;

    if (this.auth.hasToken()) {
      this.bumpRoomOnMessage(roomId, content, new Date().toISOString());
      this.realtime.sendMessage(roomId, content);
    }
  }

  notifyTyping(isTyping: boolean): void {
    const roomId = this.selectedRoomId();
    if (!roomId || !this.auth.hasToken()) return;
    if (isTyping) {
      const now = Date.now();
      const shouldSend = !this.typingLastState || now - this.typingLastSentAt >= this.typingThrottleMs;
      if (shouldSend) {
        this.realtime.typing(roomId, true);
        this.typingLastSentAt = now;
        this.typingLastState = true;
      }
      if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
      this.typingStopTimer = setTimeout(() => {
        if (this.typingLastState) {
          this.realtime.typing(roomId, false);
          this.typingLastState = false;
        }
        this.typingStopTimer = null;
      }, this.typingStopDelayMs);
      return;
    }

    if (this.typingLastState) {
      this.realtime.typing(roomId, false);
      this.typingLastState = false;
    }
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    this.typingStopTimer = null;
  }

  createRoom(payload: { name: string; userIds?: string[]; userEmails?: string[] }): void {
    if (!this.auth.hasToken()) return;
    this.roomsService.create(payload).subscribe({
      next: (room) => {
        this.rooms.set([room, ...this.rooms()]);
        this.selectRoom(room.id);
      },
    });
  }

  addUserToRoom(roomId: string, userId: string): void {
    if (!this.auth.hasToken()) return;
    this.roomsService.addUser(roomId, userId).subscribe({
      next: (room) => {
        const updated = this.rooms().map((r) => (r.id === room.id ? room : r));
        this.rooms.set(updated);
      },
    });
  }

  leaveRoom(roomId: string): void {
    if (!this.auth.hasToken()) return;
    this.roomsService.leave(roomId).subscribe({
      next: () => {
        const filtered = this.rooms().filter((room) => room.id !== roomId);
        this.rooms.set(filtered);
        this.clearUnread(roomId);
        if (this.selectedRoomId() === roomId) {
          this.selectedRoomId.set(filtered[0]?.id ?? null);
        }
      },
    });
  }

  loadOlderMessages(): void {
    const roomId = this.selectedRoomId();
    if (!roomId || !this.selectedHasMore() || this.loadingOlder()) return;
    const cursor = this.messageCursorByRoom()[roomId];
    this.loadingOlder.set(true);
    this.messagesService
      .getMessages(roomId, { limit: MESSAGES_PAGE_LIMIT, cursor: cursor ?? undefined, follow: 'next' })
      .pipe(finalize(() => this.loadingOlder.set(false)))
      .subscribe((page) => {
        const current = this.messagesByRoom()[roomId] ?? [];
        this.messagesByRoom.set({
          ...this.messagesByRoom(),
          [roomId]: [...current, ...page.data],
        });
        this.messageCursorByRoom.set({
          ...this.messageCursorByRoom(),
          [roomId]: page.nextCursor,
        });
        this.hasMoreByRoom.set({
          ...this.hasMoreByRoom(),
          [roomId]: page.hasMore,
        });
      });
  }

  private insertIncoming(message: Message): void {
    const roomMessages = this.messagesByRoom()[message.roomId] ?? [];
    this.messagesByRoom.set({
      ...this.messagesByRoom(),
      [message.roomId]: [...roomMessages, message],
    });
    this.bumpRoomOnMessage(message.roomId, message);
    const currentRoom = this.selectedRoomId();
    if (message.roomId === currentRoom) {
      this.clearUnread(message.roomId);
    }
  }

  private handleTyping(data: TypingEvent): void {
    if (data.roomId !== this.selectedRoomId()) return;
    const current = new Set(this.typingUsers());
    if (data.isTyping) {
      current.add(data.username);
    } else {
      current.delete(data.username);
    }
    this.typingUsers.set([...current]);
  }

  private loadRoomsFromApi(filter: 'all' | 'online' = this.roomsFilter()): void {
    this.loadingRooms.set(true);
    this.roomsService
      .list({ online: filter === 'online' })
      .pipe(
        catchError(() => {
          this.error.set('Failed to load rooms.');
          return of([] as Room[]);
        }),
        finalize(() => this.loadingRooms.set(false))
      )
      .subscribe((rooms) => {
        const previous = this.selectedRoomId();
        this.rooms.set(rooms.map((room) => this.applyPresenceToRoom(room)));
        this.pruneUnread(rooms);

        if (!rooms.length) {
          if (previous) this.realtime.leaveRoom(previous);
          this.selectedRoomId.set(null);
          return;
        }

        if (previous && rooms.some((room) => room.id === previous)) {
          return;
        }

        if (previous) this.realtime.leaveRoom(previous);
        this.selectedRoomId.set(rooms[0].id);
        this.selectedRoomDetails.set(null);
        this.loadMessagesFromApi(rooms[0].id);
      });
  }

  private loadRoomDetailsFromApi(roomId: string): void {
    this.roomsService.getById(roomId).subscribe({
      next: (room) => {
        if (this.selectedRoomId() !== roomId) return;
        this.selectedRoomDetails.set(this.applyPresenceToRoom(room));
      },
    });
  }

  private loadMessagesFromApi(roomId: string): void {
    this.loadingMessages.set(true);
    this.messagesService
      .getMessages(roomId, { limit: MESSAGES_PAGE_LIMIT })
      .pipe(
        catchError(() => {
          this.error.set('Failed to load messages.');
          return of({ data: [], nextCursor: null, hasMore: false });
        }),
        finalize(() => this.loadingMessages.set(false))
      )
      .subscribe((page) => {
        this.messagesByRoom.set({
          ...this.messagesByRoom(),
          [roomId]: page.data,
        });
        this.messageCursorByRoom.set({
          ...this.messageCursorByRoom(),
          [roomId]: page.nextCursor,
        });
        this.hasMoreByRoom.set({
          ...this.hasMoreByRoom(),
          [roomId]: page.hasMore,
        });
      });
  }

  unreadCount(roomId: string): number {
    return this.unreadByRoom()[roomId] ?? 0;
  }

  private clearUnread(roomId: string): void {
    if (!roomId) return;
    const current = this.unreadByRoom();
    if (!current[roomId]) return;
    const { [roomId]: _, ...rest } = current;
    this.unreadByRoom.set(rest);
  }

  private pruneUnread(rooms: Room[]): void {
    const allowed = new Set(rooms.map((room) => room.id));
    const next: Record<string, number> = {};
    for (const [roomId, count] of Object.entries(this.unreadByRoom())) {
      if (allowed.has(roomId) && count > 0) next[roomId] = count;
    }
    this.unreadByRoom.set(next);
  }

  private handleMessageNotification(data: MessageNotification): void {
    if (data.roomId === this.activeRoomId()) return;
    const rooms = this.rooms();
    const target = rooms.find((room) => room.id === data.roomId);
    if (!target) return;
    this.unreadByRoom.set({
      ...this.unreadByRoom(),
      [data.roomId]: (this.unreadByRoom()[data.roomId] ?? 0) + 1,
    });
    this.bumpRoomOnMessage(data.roomId, data.preview, data.createdAt);
    this.notifications.show({
      title: target.name,
      body: data.preview,
      roomId: data.roomId,
    });
  }

  private handlePresenceUpdate(data: PresenceUpdate): void {
    const presence = {
      ...this.presenceByUserId(),
      [data.userId]: data.status,
    };
    this.presenceByUserId.set(presence);
    const updatedRooms = this.rooms().map((room) => this.applyPresenceToRoom(room, presence));
    this.rooms.set(updatedRooms);
    const details = this.selectedRoomDetails();
    if (details) {
      this.selectedRoomDetails.set(this.applyPresenceToRoom(details, presence));
    }
  }

  private handleRoomAdded(data: RoomAddedEvent): void {
    const existing = this.rooms().some((room) => room.id === data.roomId);
    if (existing) return;
    this.roomsService.getById(data.roomId).subscribe({
      next: (room) => {
        const rooms = this.rooms();
        if (rooms.some((r) => r.id === room.id)) return;
        this.rooms.set([this.applyPresenceToRoom(room), ...rooms]);
      },
    });
  }

  private bumpRoomOnMessage(roomId: string, lastMessage: Message | string, createdAt?: string): void {
    const rooms = this.rooms();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index === -1) return;
    const room = rooms[index];
    const timestamp =
      createdAt ?? (typeof lastMessage === 'string' ? room.lastMessageAt : lastMessage.createdAt);
    const updated: Room = {
      ...room,
      lastMessage,
      ...(timestamp ? { lastMessageAt: timestamp } : {}),
    };
    const next = [updated, ...rooms.slice(0, index), ...rooms.slice(index + 1)];
    this.rooms.set(next);
    const details = this.selectedRoomDetails();
    if (details && details.id === roomId) {
      this.selectedRoomDetails.set({
        ...details,
        lastMessage: updated.lastMessage,
        lastMessageAt: updated.lastMessageAt,
      });
    }
  }

  private applyPresenceToRoom(
    room: Room,
    presence = this.presenceByUserId()
  ): Room {
    if (!room.userIds || !room.userIds.length) return room;
    const currentUserId = this.currentUserId();
    const otherUserIds = room.userIds.filter((userId) => userId !== currentUserId);
    let known = 0;
    let onlineCount = 0;
    for (const userId of otherUserIds) {
      const status = presence[userId];
      if (!status) continue;
      known += 1;
      if (status === 'online') onlineCount += 1;
    }
    if (known === 0) {
      return room;
    }
    return {
      ...room,
      onlineCount,
      hasOnline: onlineCount > 0,
    };
  }
}
