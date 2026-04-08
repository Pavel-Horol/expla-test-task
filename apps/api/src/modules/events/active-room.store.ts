export interface ActiveRoomStore {
  setActiveRoom(userId: string, roomId: string | null): void;
  getActiveRoom(userId: string): string | null;
  clearActiveRoom(userId: string): void;
}
