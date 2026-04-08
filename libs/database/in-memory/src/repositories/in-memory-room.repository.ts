import { Injectable } from '@nestjs/common';
import { IRoomRepository } from '@chat-app/shared/interfaces';
import { Room } from '@chat-app/shared/entities';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryRoomRepository implements IRoomRepository {
  private readonly rooms = new Map<string, Room>();
  private readonly userIndex = new Map<string, Set<string>>(); // userId -> Set<roomId>

  async create(data: { name: string; userIds: string[] }): Promise<Room> {
    const now = new Date();
    const room = new Room(randomUUID(), data.name, data.userIds, now, now);

    this.rooms.set(room.id, room);

    for (const userId of data.userIds) {
      if (!this.userIndex.has(userId)) {
        this.userIndex.set(userId, new Set());
      }
      this.userIndex.get(userId)!.add(room.id);
    }

    return room;
  }

  async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Room[]> {
    const roomIds = this.userIndex.get(userId);
    if (!roomIds) {
      return [];
    }

    return Array.from(roomIds)
      .map((id) => this.rooms.get(id)!)
      .filter(Boolean);
  }

  async findByUserIdSorted(userId: string): Promise<Room[]> {
    const rooms = await this.findByUserId(userId);
    return [...rooms].sort((a, b) => {
      const aPrimary = a.createdAt.getTime();
      const bPrimary = b.createdAt.getTime();
      if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      return b.id.localeCompare(a.id);
    });
  }

  async findAll(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async addUser(roomId: string, userId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id ${roomId} not found`);
    }

    const updatedRoom = new Room(
      room.id,
      room.name,
      [...new Set([...room.userIds, userId])],
      room.createdAt,
      new Date(),
    );

    this.rooms.set(roomId, updatedRoom);

    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(roomId);

    return updatedRoom;
  }

  async removeUser(roomId: string, userId: string): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id ${roomId} not found`);
    }

    const updatedRoom = new Room(
      room.id,
      room.name,
      room.userIds.filter((id) => id !== userId),
      room.createdAt,
      new Date(),
    );

    this.rooms.set(roomId, updatedRoom);

    this.userIndex.get(userId)?.delete(roomId);

    return updatedRoom;
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    return room ? room.userIds.includes(userId) : false;
  }

  clear(): void {
    this.rooms.clear();
    this.userIndex.clear();
  }
}
