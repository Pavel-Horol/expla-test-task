import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  MessageResponseDto,
  MessagesPaginatedResponseDto,
  GetMessagesQueryDto,
} from '@chat-app/shared/dto';
import { Message } from '@chat-app/shared/entities';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: IRoomRepository,
  ) {}

  async getMessages(
    roomId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ): Promise<MessagesPaginatedResponseDto> {
    const isInRoom = await this.roomRepository.isUserInRoom(roomId, userId);
    if (!isInRoom) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const { cursor, follow = 'next', limit = 50 } = query;

    const messages = await this.messageRepository.findByRoomId(roomId, {
      limit: limit + 1,
      cursor,
      follow,
    });

    const hasMore = messages.length > limit;
    let data = hasMore ? messages.slice(0, limit) : messages;

    if (follow !== 'prev') {
      data = [...data].reverse();
    }

    const nextCursor =
      hasMore && data.length > 0
        ? follow === 'prev'
          ? data[data.length - 1].id
          : data[0].id
        : null;

    return {
      data: data.map((msg) => this.toResponse(msg)),
      nextCursor,
      hasMore,
    };
  }

  async getLatestMessages(
    roomId: string,
    userId: string,
    limit = 50,
  ): Promise<MessageResponseDto[]> {
    const isInRoom = await this.roomRepository.isUserInRoom(roomId, userId);
    if (!isInRoom) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const messages = await this.messageRepository.findLatestByRoomId(
      roomId,
      limit,
    );

    return messages.map((msg) => this.toResponse(msg));
  }

  async deleteMessage(
    messageId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new ForbiddenException('Message not found');
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.deleteById(messageId);

    return { deleted: true };
  }

  private toResponse(message: Message): MessageResponseDto {
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
