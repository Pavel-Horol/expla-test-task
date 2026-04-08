import { Room } from '@chat-app/shared/entities';

export interface IRoomRepository {

  create(data: { name: string; userIds: string[] }): Promise<Room>;

  findById(id: string): Promise<Room | null>;

  findByUserId(userId: string): Promise<Room[]>;

  findByUserIdSorted(userId: string): Promise<Room[]>;

  findAll(): Promise<Room[]>;

  addUser(roomId: string, userId: string): Promise<Room>;

  removeUser(roomId: string, userId: string): Promise<Room>;

  isUserInRoom(roomId: string, userId: string): Promise<boolean>;
}

export const ROOM_REPOSITORY = Symbol('ROOM_REPOSITORY');
