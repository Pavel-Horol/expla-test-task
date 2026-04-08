import { MessageResponse } from './message.types';

export interface CreateRoomRequest {
  name: string;
  userIds?: string[];
  userEmails?: string[];
}

export interface AddUserToRoomRequest {
  userId: string;
}

export interface RoomResponse {
  id: string;
  name: string;
  userIds: string[];
  onlineCount?: number;
  hasOnline?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: MessageResponse | null;
}
