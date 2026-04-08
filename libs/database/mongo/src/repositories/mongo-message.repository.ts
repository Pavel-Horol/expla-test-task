import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument, PipelineStage, FilterQuery } from 'mongoose';
import { IMessageRepository } from '@chat-app/shared/interfaces';
import { Message } from '@chat-app/shared/entities';
import { MessageSchema, MessageDocument } from '../schemas/message.schema';

@Injectable()
export class MongoMessageRepository implements IMessageRepository {
  constructor(
    @InjectModel(MessageSchema.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async create(data: {
    content: string;
    userId: string;
    roomId: string;
  }): Promise<Message> {
    const doc = await this.messageModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Message | null> {
    const doc = await this.messageModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByRoomId(
    roomId: string,
    options?: { limit?: number; cursor?: string; follow?: 'next' | 'prev' },
  ): Promise<Message[]> {
    const { limit = 50, cursor, follow = 'next' } = options ?? {};
    const cursorMatch: FilterQuery<MessageDocument> = {};

    if (cursor) {
      const cursorDoc = await this.messageModel.findById(cursor).exec();
      if (cursorDoc) {
        if (follow === 'next') {
          cursorMatch['$or'] = [
            { createdAt: { $lt: cursorDoc.createdAt } },
            {
              createdAt: cursorDoc.createdAt,
              _id: { $lt: cursorDoc._id },
            },
          ];
        } else {
          cursorMatch['$or'] = [
            { createdAt: { $gt: cursorDoc.createdAt } },
            {
              createdAt: cursorDoc.createdAt,
              _id: { $gt: cursorDoc._id },
            },
          ];
        }
      }
    }

    const sortOrder = follow === 'prev' ? 1 : -1;
    const pipeline: PipelineStage[] = [{ $match: { roomId } }];
    if (Object.keys(cursorMatch).length > 0) {
      pipeline.push({ $match: cursorMatch });
    }
    pipeline.push({ $sort: { createdAt: sortOrder, _id: sortOrder } });
    pipeline.push({ $limit: limit });

    const docs = await this.messageModel.aggregate(pipeline).exec();

    return docs.map((doc) => this.toDomain(doc as MessageDocument));
  }

  async findLatestByRoomId(roomId: string, limit: number): Promise<Message[]> {
    const docs = await this.messageModel
      .aggregate([
        { $match: { roomId } },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: limit },
        { $sort: { createdAt: 1, _id: 1 } },
      ])
      .exec();

    return docs.map((doc) => this.toDomain(doc as MessageDocument));
  }

  async deleteById(id: string): Promise<void> {
    await this.messageModel.findByIdAndDelete(id).exec();
  }

  private toDomain(doc: HydratedDocument<MessageSchema>): Message {
    return new Message(
      doc._id.toString(),
      doc.content,
      doc.userId.toString(),
      doc.roomId.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

}
