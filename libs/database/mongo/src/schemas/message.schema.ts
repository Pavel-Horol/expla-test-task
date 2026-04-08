import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<MessageSchema>;

@Schema({
  collection: 'messages',
  timestamps: true,
})
export class MessageSchema {
  @Prop({ required: true })
  content!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserSchema', index: true })
  userId!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'RoomSchema', index: true })
  roomId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MessageMongoSchema = SchemaFactory.createForClass(MessageSchema);

MessageMongoSchema.index({ roomId: 1, createdAt: -1 });