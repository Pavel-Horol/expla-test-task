import { Injectable } from '@nestjs/common';
import { ActiveRoomStore } from './active-room.store';

@Injectable()
export class InMemoryActiveRoomStore implements ActiveRoomStore {
  private readonly activeRooms = new Map<string, string | null>();

  setActiveRoom(userId: string, roomId: string | null): void {
    this.activeRooms.set(userId, roomId);
  }

  getActiveRoom(userId: string): string | null {
    return this.activeRooms.get(userId) ?? null;
  }

  clearActiveRoom(userId: string): void {
    this.activeRooms.delete(userId);
  }
}
