import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '@chat-app/shared/interfaces';
import { User } from '@chat-app/shared/entities';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private readonly emailIndex = new Map<string, string>();

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    const now = new Date();
    const user = new User(
      randomUUID(),
      data.email,
      data.username,
      data.passwordHash,
      now,
      now,
    );

    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    return userId ? this.users.get(userId) || null : null;
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.emailIndex.has(email.toLowerCase());
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}
