import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserSchema>;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class UserSchema {
  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true, unique: true, index: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserMongoSchema = SchemaFactory.createForClass(UserSchema);