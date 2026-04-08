import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
  IUserRepository,
  USER_REPOSITORY,
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  CreateRoomDto,
  RoomResponseDto,
  AddUserToRoomDto,
  MessageResponseDto,
} from '@chat-app/shared/dto';
import { Room, Message } from '@chat-app/shared/entities';
import { PRESENCE_STORE } from '../presence/presence.constants';
import { PresenceStore } from '../presence/presence.store';
import { ROOM_EVENTS, RoomCreatedEvent, RoomUserAddedEvent } from '@chat-app/shared/events';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: IRoomRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRoom(
    dto: CreateRoomDto,
    creatorId: string,
  ): Promise<RoomResponseDto> {
    const userIdsFromDto = dto.userIds ?? [];
    const userEmailsFromDto = dto.userEmails ?? [];

    if (userIdsFromDto.length === 0 && userEmailsFromDto.length === 0) {
      throw new BadRequestException(
        'At least one userId or userEmail must be provided',
      );
    }

    const emailUsers = [];
    for (const email of userEmailsFromDto) {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      emailUsers.push(user);
    }

    const emailUserIds = emailUsers.map((user) => user.id);
    const userIds = [...new Set([creatorId, ...userIdsFromDto, ...emailUserIds])];

    for (const userId of userIdsFromDto) {
      const exists = await this.userRepository.findById(userId);
      if (!exists) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
    }

    const room = await this.roomRepository.create({ name: dto.name, userIds });

    const recipientIds = userIds.filter((id) => id !== creatorId);
    this.eventEmitter.emit(ROOM_EVENTS.ROOM_CREATED, {
      roomId: room.id,
      roomName: room.name,
      creatorId,
      recipientIds,
      createdAt: room.createdAt.toISOString(),
    } satisfies RoomCreatedEvent);

    return this.toResponse(room);
  }

  async getUserRooms(
    userId: string,
    online?: boolean,
  ): Promise<RoomResponseDto[]> {
    const rooms = await this.roomRepository.findByUserIdSorted(userId);
    console.log(`Found ${rooms.length} rooms for user ${userId}`);
    const responses = await Promise.all(
      rooms.map((room) => this.toResponse(room, userId)),
    );
    const sortedResponses = responses;

    if (online === undefined) return sortedResponses;

    return sortedResponses.filter((room) => {
      const hasOnline = (room.onlineCount ?? 0) > 0;
      return online ? hasOnline : !hasOnline;
    });
  }

  async getRoomById(roomId: string, userId: string): Promise<RoomResponseDto> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) throw new NotFoundException('Room not found');

    if (!room.userIds.includes(userId)) {
      throw new ForbiddenException('You are not a member of this room');
    }

    return this.toResponse(room, userId);
  }

  async addUserToRoom(
    roomId: string,
    dto: AddUserToRoomDto,
    requesterId: string,
  ): Promise<RoomResponseDto> {
    const isRequesterInRoom = await this.roomRepository.isUserInRoom(roomId, requesterId);
    if (!isRequesterInRoom) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const userExists = await this.userRepository.findById(dto.userId);
    if (!userExists) {
      throw new NotFoundException(`User with id ${dto.userId} not found`);
    }

    const room = await this.roomRepository.addUser(roomId, dto.userId);

    this.eventEmitter.emit(ROOM_EVENTS.USER_ADDED, {
      roomId: room.id,
      roomName: room.name,
      addedUserId: dto.userId,
      addedByUserId: requesterId,
      addedAt: room.updatedAt.toISOString(),
    } satisfies RoomUserAddedEvent);

    return this.toResponse(room);
  }

  async leaveRoom(roomId: string, userId: string): Promise<{ left: boolean }> {
    const isInRoom = await this.roomRepository.isUserInRoom(roomId, userId);
    if (!isInRoom) {
      throw new ForbiddenException('You are not a member of this room');
    }

    await this.roomRepository.removeUser(roomId, userId);
    return { left: true };
  }

  private async toResponse(room: Room, viewerUserId?: string): Promise<RoomResponseDto> {
    const userIds =
      viewerUserId === undefined
        ? room.userIds
        : room.userIds.filter((id) => id !== viewerUserId);
    const onlineCount = this.presenceStore.countOnlineUsers(userIds);
    const lastMessage = await this.getLastMessage(room.id);
    return {
      id: room.id,
      name: room.name,
      userIds: room.userIds,
      onlineCount,
      hasOnline: onlineCount > 0,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      lastMessage,
    };
  }

  private async getLastMessage(roomId: string): Promise<MessageResponseDto | null> {
    const messages = await this.messageRepository.findLatestByRoomId(roomId, 1);
    if (messages.length === 0) return null;
    return this.toMessageResponse(messages[messages.length - 1]);
  }

  private toMessageResponse(message: Message): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      userId: message.userId,
      roomId: message.roomId,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }
}
