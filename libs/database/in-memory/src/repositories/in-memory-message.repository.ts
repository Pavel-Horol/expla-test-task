import { Injectable } from '@nestjs/common';
import { IMessageRepository } from '@chat-app/shared/interfaces';
import { Message } from '@chat-app/shared/entities';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryMessageRepository implements IMessageRepository {
  private readonly messages = new Map<string, Message>();
  private readonly roomIndex = new Map<string, Set<string>>(); // roomId -> Set<messageId>

  async create(data: {
    content: string;
    userId: string;
    roomId: string;
  }): Promise<Message> {
    const now = new Date();
    const message = new Message(
      randomUUID(),
      data.content,
      data.userId,
      data.roomId,
      now,
      now,
    );

    this.messages.set(message.id, message);

    if (!this.roomIndex.has(data.roomId)) {
      this.roomIndex.set(data.roomId, new Set());
    }
    this.roomIndex.get(data.roomId)!.add(message.id);

    return message;
  }

  async findById(id: string): Promise<Message | null> {
    return this.messages.get(id) || null;
  }

  async findByRoomId(
    roomId: string,
    options?: { limit?: number; cursor?: string; follow?: 'next' | 'prev' },
  ): Promise<Message[]> {
    const messageIds = this.roomIndex.get(roomId);
    if (!messageIds) {
      return [];
    }

    const { limit = 50, cursor, follow = 'next' } = options ?? {};

    const all = Array.from(messageIds)
      .map((id) => this.messages.get(id)!)
      .filter(Boolean);

    if (cursor) {
      const cursorMessage = this.messages.get(cursor);
      if (cursorMessage) {
        if (follow === 'next') {
          return all
            .filter((m) => m.createdAt.getTime() < cursorMessage.createdAt.getTime())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
        } else {
          return all
            .filter((m) => m.createdAt.getTime() > cursorMessage.createdAt.getTime())
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .slice(0, limit);
        }
      }
    }

    return all
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async findLatestByRoomId(roomId: string, limit: number): Promise<Message[]> {
    return this.findByRoomId(roomId, { limit });
  }

  async deleteById(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      this.messages.delete(id);
      this.roomIndex.get(message.roomId)?.delete(id);
    }
  }

  clear(): void {
    this.messages.clear();
    this.roomIndex.clear();
  }
}
