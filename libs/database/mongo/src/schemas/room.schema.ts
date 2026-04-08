import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RoomDocument = HydratedDocument<RoomSchema>;

@Schema({
  collection: 'rooms',
  timestamps: true,
})
export class RoomSchema {
  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    type: [{ type: Types.ObjectId, ref: 'UserSchema' }],
    default: [],
  })
  userIds!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const RoomMongoSchema = SchemaFactory.createForClass(RoomSchema);