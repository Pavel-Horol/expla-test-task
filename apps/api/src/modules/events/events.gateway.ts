import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { UseGuards, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WsAuthService } from '../auth/services/ws-auth.service';
import {
  EventClientToServerEvents,
  EventServerToClientEvents,
  SocketData,
} from '@chat-app/shared/types';
import { ACTIVE_ROOM_STORE } from './events.constants';
import { ActiveRoomStore } from './active-room.store';
import { PRESENCE_STORE } from '../presence/presence.constants';
import { PresenceStore } from '../presence/presence.store';
import { IRoomRepository, ROOM_REPOSITORY } from '@chat-app/shared/interfaces';
import { CHAT_EVENTS, MessageSentEvent, ROOM_EVENTS, RoomCreatedEvent, RoomUserAddedEvent } from '@chat-app/shared/events';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/events',
})
@UseGuards(WsJwtGuard)
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server<EventClientToServerEvents, EventServerToClientEvents, {}, SocketData>;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly wsAuthService: WsAuthService,
    @Inject(ACTIVE_ROOM_STORE)
    private readonly activeRoomStore: ActiveRoomStore,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: IRoomRepository,
  ) {}

  afterInit() {
    this.presenceStore.onStatusChange((event) => {
      void this.notifyPresenceUpdate(event.userId, event.status);
    });
  }

  async handleConnection(
    client: Socket<EventClientToServerEvents, EventServerToClientEvents, {}, SocketData>,
  ) {
    const user = await this.wsAuthService.authenticateSocket(client);
    if (!user) {
      this.logger.warn(`Client connected without valid token: ${client.id}`);
      client.disconnect(true);
      return;
    }

    this.logger.log(`Events client connected: ${client.id} (User: ${user.email})`);

    await client.join(this.userRoom(user.userId));
  }

  handleDisconnect(
    client: Socket<EventClientToServerEvents, EventServerToClientEvents, {}, SocketData>,
  ) {
    const user = client.data.user;
    if (!user) return;
    this.activeRoomStore.clearActiveRoom(user.userId);
    this.logger.log(`Events client disconnected: ${client.id} (User: ${user.email})`);
  }

  @SubscribeMessage('setActiveRoom')
  handleSetActiveRoom(
    @ConnectedSocket() client: Socket<EventClientToServerEvents, EventServerToClientEvents, {}, SocketData>,
    @MessageBody() data: { roomId: string | null },
  ) {
    const user = client.data.user;
    if (!user) return;

    this.activeRoomStore.setActiveRoom(user.userId, data.roomId ?? null);
  }

  @OnEvent(CHAT_EVENTS.MESSAGE_SENT)
  async onMessageSent(event: MessageSentEvent) {
    await this.notifyNewMessage(event);
  }

  @OnEvent(ROOM_EVENTS.ROOM_CREATED)
  async onRoomCreated(event: RoomCreatedEvent) {
    if (event.recipientIds.length === 0) return;
    await this.notifyRoomAdded({
      recipientIds: event.recipientIds,
      roomId: event.roomId,
      roomName: event.roomName,
      addedByUserId: event.creatorId,
      addedAt: event.createdAt,
    });
  }

  @OnEvent(ROOM_EVENTS.USER_ADDED)
  async onUserAddedToRoom(event: RoomUserAddedEvent) {
    await this.notifyRoomAdded({
      recipientIds: [event.addedUserId],
      roomId: event.roomId,
      roomName: event.roomName,
      addedByUserId: event.addedByUserId,
      addedAt: event.addedAt,
    });
  }

  async notifyNewMessage(options: MessageSentEvent) {
    const payload = {
      roomId: options.roomId,
      messageId: options.messageId,
      fromUserId: options.fromUserId,
      preview: options.preview,
      createdAt: options.createdAt,
    };

    for (const userId of options.recipientIds) {
      if (this.activeRoomStore.getActiveRoom(userId) === options.roomId) continue;
      this.server.to(this.userRoom(userId)).emit('messageNotification', payload);
    }
  }

  async notifyPresenceUpdate(userId: string, status: 'online' | 'offline') {
    const rooms = await this.roomRepository.findByUserId(userId);
    const recipients = new Set<string>();

    for (const room of rooms) {
      for (const memberId of room.userIds) {
        if (memberId !== userId) recipients.add(memberId);
      }
    }

    if (recipients.size === 0) return;

    const payload = { userId, status, updatedAt: new Date().toISOString() };

    for (const recipientId of recipients) {
      this.server.to(this.userRoom(recipientId)).emit('presenceUpdate', payload);
    }
  }

  async notifyRoomAdded(options: {
    recipientIds: string[];
    roomId: string;
    roomName: string;
    addedByUserId: string;
    addedAt: string;
  }) {
    const payload = {
      roomId: options.roomId,
      roomName: options.roomName,
      addedByUserId: options.addedByUserId,
      addedAt: options.addedAt,
    };

    for (const recipientId of options.recipientIds) {
      this.server.to(this.userRoom(recipientId)).emit('roomAdded', payload);
    }
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
