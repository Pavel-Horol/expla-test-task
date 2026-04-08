export const ROOM_EVENTS = {
  ROOM_CREATED: 'room.created',
  USER_ADDED: 'room.user.added',
} as const;

export interface RoomCreatedEvent {
  roomId: string;
  roomName: string;
  creatorId: string;
  recipientIds: string[];
  createdAt: string;
}

export interface RoomUserAddedEvent {
  roomId: string;
  roomName: string;
  addedUserId: string;
  addedByUserId: string;
  addedAt: string;
}
