import { User } from '@chat-app/shared/entities';

export interface IUserRepository {

  create(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findByIdOrFail(id: string): Promise<User>;

  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
