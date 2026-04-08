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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WsAuthService } from '../auth/services/ws-auth.service';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
  IRoomRepository,
  ROOM_REPOSITORY,
  IUserRepository,
  USER_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@chat-app/shared/types';
import { BotOrchestratorService } from '../bots/bot-orchestrator.service';
import { PRESENCE_STORE } from '../presence/presence.constants';
import { PresenceStore } from '../presence/presence.store';
import { CHAT_EVENTS, MessageSentEvent } from '@chat-app/shared/events';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN,
    credentials: true,
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: IRoomRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly wsAuthService: WsAuthService,
    private readonly botOrchestrator: BotOrchestratorService,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) {
    this.botOrchestrator.setEmitter((roomId, payload) => {
      server.to(roomId).emit('newMessage', payload);
      void (async () => {
        try {
          const room = await this.roomRepository.findById(roomId);
          if (!room) return;
          const recipients = room.userIds.filter((id) => id !== payload.userId);
          this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_SENT, {
            roomId,
            messageId: payload.id,
            fromUserId: payload.userId,
            preview: payload.content,
            createdAt: payload.createdAt,
            recipientIds: recipients,
          } satisfies MessageSentEvent);
        } catch (error) {
          this.logger.error(`Failed to emit bot message notification: ${error instanceof Error ? error.message : String(error)}`);
        }
      })();
    });

    void this.botOrchestrator.start();
  }

  async handleConnection(client: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) {
    const user = await this.wsAuthService.authenticateSocket(client);
    if (!user) {
      this.logger.warn(`Client connected without valid token: ${client.id}`);
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${client.id} (User: ${user.email})`);

    const rooms = await this.roomRepository.findByUserId(user.userId);
    for (const room of rooms) {
      await client.join(room.id);
      this.logger.debug(`User ${user.email} auto-joined room ${room.name}`);
    }

    this.presenceStore.markUserConnected(user.userId);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    this.logger.log(`Client disconnected: ${client.id} (User: ${user?.email})`);
    if (!user) return;
    this.presenceStore.markUserDisconnected(user.userId);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;

    try {
      const isInRoom = await this.roomRepository.isUserInRoom(data.roomId, user.userId);

      if (!isInRoom) {
        client.emit('error', { message: 'Not a member of this room' });
        return;
      }

      await client.join(data.roomId);

      const userEntity = await this.userRepository.findById(user.userId);

      client.to(data.roomId).emit('userJoined', {
        userId: user.userId,
        username: userEntity?.username || user.email,
        roomId: data.roomId,
      });

      this.logger.log(`User ${user.email} joined room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error joining room: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;

    await client.leave(data.roomId);

    const userEntity = await this.userRepository.findById(user.userId);

    client.to(data.roomId).emit('userLeft', {
      userId: user.userId,
      username: userEntity?.username || user.email,
      roomId: data.roomId,
    });

    this.logger.log(`User ${user.email} left room ${data.roomId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const user = client.data.user;

    try {
      const isInRoom = await this.roomRepository.isUserInRoom(data.roomId, user.userId);

      if (!isInRoom) {
        client.emit('error', { message: 'Not a member of this room' });
        return;
      }

      const message = await this.messageRepository.create({
        content: data.content,
        userId: user.userId,
        roomId: data.roomId,
      });

      const userEntity = await this.userRepository.findById(user.userId);

      this.server.to(data.roomId).emit('newMessage', {
        id: message.id,
        content: message.content,
        userId: message.userId,
        username: userEntity?.username || user.email,
        roomId: message.roomId,
        createdAt: message.createdAt.toISOString(),
      });

      const room = await this.roomRepository.findById(data.roomId);
      if (room) {
        const recipients = room.userIds.filter((id) => id !== user.userId);
        this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_SENT, {
          roomId: data.roomId,
          messageId: message.id,
          fromUserId: user.userId,
          preview: message.content,
          createdAt: message.createdAt.toISOString(),
          recipientIds: recipients,
        } satisfies MessageSentEvent);
      }

      this.logger.debug(`Message sent in room ${data.roomId} by ${user.email}`);

      void this.botOrchestrator.handleUserMessage(data.roomId, data.content, user.userId);
    } catch (error) {
      this.logger.error(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    try {
      const user = client.data.user;
      const userEntity = await this.userRepository.findById(user.userId);

      client.to(data.roomId).emit('userTyping', {
        userId: user.userId,
        username: userEntity?.username || user.email,
        roomId: data.roomId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      this.logger.error(`Error handling typing event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
