import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { IUserRepository } from '@chat-app/shared/interfaces';
import { User } from '@chat-app/shared/entities';
import { UserSchema, UserDocument } from '../schemas/user.schema';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(UserSchema.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    const doc = await this.userModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ email }).exec();
    return count > 0;
  }

  private toDomain(doc: HydratedDocument<UserSchema>): User {
    return new User(
      doc._id.toString(),
      doc.email,
      doc.username,
      doc.passwordHash,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
