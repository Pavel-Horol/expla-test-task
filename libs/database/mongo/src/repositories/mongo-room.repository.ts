import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { IRoomRepository } from '@chat-app/shared/interfaces';
import { Room } from '@chat-app/shared/entities';
import { RoomSchema, RoomDocument } from '../schemas/room.schema';

@Injectable()
export class MongoRoomRepository implements IRoomRepository {
  constructor(
    @InjectModel(RoomSchema.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {}

  async create(data: { name: string; userIds: string[] }): Promise<Room> {
    const doc = await this.roomModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Room | null> {
    const doc = await this.roomModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByUserId(userId: string): Promise<Room[]> {
    const docs = await this.roomModel.find({ userIds: userId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByUserIdSorted(userId: string): Promise<Room[]> {
    const docs = await this.roomModel
      .aggregate([
        { $match: { userIds: userId } },
        {
          $lookup: {
            from: 'messages',
            let: { roomId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$roomId', '$$roomId'] } } },
              { $sort: { createdAt: -1, _id: -1 } },
              { $limit: 1 },
              { $project: { createdAt: 1 } },
            ],
            as: 'lastMessage',
          },
        },
        {
          $addFields: {
            lastMessageCreatedAt: {
              $ifNull: [{ $arrayElemAt: ['$lastMessage.createdAt', 0] }, '$createdAt'],
            },
          },
        },
        { $sort: { lastMessageCreatedAt: -1, createdAt: -1, _id: -1 } },
        { $project: { lastMessage: 0, lastMessageCreatedAt: 0 } },
      ])
      .exec();

    const rooms = docs.map((doc) => this.toDomain(doc as RoomDocument));
    return rooms;
  }

  async findAll(): Promise<Room[]> {
    const docs = await this.roomModel.find({}).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async addUser(roomId: string, userId: string): Promise<Room> {
    const doc = await this.roomModel
      .findByIdAndUpdate(
        roomId,
        { $addToSet: { userIds: userId } },
        { new: true },
      )
      .exec();

    if (!doc) {
      throw new Error(`Room with id ${roomId} not found`);
    }

    return this.toDomain(doc);
  }

  async removeUser(roomId: string, userId: string): Promise<Room> {
    const doc = await this.roomModel
      .findByIdAndUpdate(
        roomId,
        { $pull: { userIds: userId } },
        { new: true },
      )
      .exec();

    if (!doc) {
      throw new Error(`Room with id ${roomId} not found`);
    }

    return this.toDomain(doc);
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) return false;
    return room.userIds.map((id) => id.toString()).includes(userId);
  }

  private toDomain(doc: HydratedDocument<RoomSchema>): Room {
    return new Room(
      doc._id.toString(),
      doc.name,
      doc.userIds.map((id) => id.toString()),
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
