import { Message } from '@chat-app/shared/entities';

export interface IMessageRepository {

  create(data: {
    content: string;
    userId: string;
    roomId: string;
  }): Promise<Message>;


  findById(id: string): Promise<Message | null>;


  findByRoomId(
    roomId: string,
    options?: { limit?: number; cursor?: string; follow?: 'next' | 'prev' },
  ): Promise<Message[]>;

  findLatestByRoomId(roomId: string, limit: number): Promise<Message[]>;

  deleteById(id: string): Promise<void>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
