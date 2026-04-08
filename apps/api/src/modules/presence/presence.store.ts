export interface PresenceStatusChange {
  userId: string;
  status: 'online' | 'offline';
}

export interface PresenceStore {
  markUserConnected(userId: string): void;
  markUserDisconnected(userId: string): void;
  isUserOnline(userId: string): boolean;
  countOnlineUsers(userIds: string[]): number;
  onStatusChange(listener: (event: PresenceStatusChange) => void): void;
}
