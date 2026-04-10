import { inject, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../core/api-tokens';
import { AuthService } from './auth.service';
import type { ClientToServerEvents, ServerToClientEvents } from '@chat-app/shared/types';
import { msgpackParser } from '@chat-app/shared/types';

type NewMessagePayload = Parameters<ServerToClientEvents['newMessage']>[0];
type UserPresencePayload = Parameters<ServerToClientEvents['userJoined']>[0];
type UserTypingPayload = Parameters<ServerToClientEvents['userTyping']>[0];

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private wsBaseUrl = inject(WS_BASE_URL);
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private joinRoomDebounceMs = 400;
  private joinRoomTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingJoinRoomId: string | null = null;
  private lastJoinedRoomId: string | null = null;

  readonly connected = signal(false);

  connect(): void {
    if (this.socket) {
      this.socket.connect();
      return;
    }
    this.socket = io(`${this.wsBaseUrl}/chat`, {
      auth: {
        token: this.auth.getAccessToken(),
      },
      parser: msgpackParser,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.clearPendingJoin();
  }

  updateToken(token: string | null): void {
    if (!this.socket || !token) return;
    this.socket.auth = { token };
  }

  joinRoom(roomId: string): void {
    if (!this.joinRoomTimer) {
      this.lastJoinedRoomId = roomId;
      this.emit('joinRoom', { roomId });
      this.joinRoomTimer = setTimeout(() => this.flushPendingJoin(), this.joinRoomDebounceMs);
      return;
    }

    this.pendingJoinRoomId = roomId;
    clearTimeout(this.joinRoomTimer);
    this.joinRoomTimer = setTimeout(() => this.flushPendingJoin(), this.joinRoomDebounceMs);
  }

  leaveRoom(roomId: string): void {
    if (this.pendingJoinRoomId === roomId) {
      this.clearPendingJoin();
    }
    this.emit('leaveRoom', { roomId });
  }

  sendMessage(roomId: string, content: string): void {
    this.emit('sendMessage', { roomId, content });
  }

  typing(roomId: string, isTyping: boolean): void {
    this.emit('typing', { roomId, isTyping });
  }

  onNewMessage(handler: (message: NewMessagePayload) => void): void {
    this.socket?.on('newMessage', handler);
  }

  onConnect(handler: () => void): void {
    this.socket?.on('connect', handler);
  }

  onDisconnect(handler: (reason: string) => void): void {
    this.socket?.on('disconnect', handler);
  }

  onConnectError(handler: (error: Error) => void): void {
    this.socket?.on('connect_error', handler);
  }

  onUserTyping(handler: (data: UserTypingPayload) => void): void {
    this.socket?.on('userTyping', handler);
  }

  onUserJoined(handler: (data: UserPresencePayload) => void): void {
    this.socket?.on('userJoined', handler);
  }

  onUserLeft(handler: (data: UserPresencePayload) => void): void {
    this.socket?.on('userLeft', handler);
  }

  onError(handler: (data: { message: string }) => void): void {
    this.socket?.on('error', handler);
  }

  private emit<TEvent extends keyof ClientToServerEvents>(
    event: TEvent,
    ...args: Parameters<ClientToServerEvents[TEvent]>
  ): void {
    this.socket?.emit(event, ...args);
  }

  private clearPendingJoin(): void {
    if (this.joinRoomTimer) clearTimeout(this.joinRoomTimer);
    this.joinRoomTimer = null;
    this.pendingJoinRoomId = null;
  }

  private flushPendingJoin(): void {
    const id = this.pendingJoinRoomId;
    this.clearPendingJoin();
    if (id && id !== this.lastJoinedRoomId) {
      this.lastJoinedRoomId = id;
      this.emit('joinRoom', { roomId: id });
    }
  }
}
