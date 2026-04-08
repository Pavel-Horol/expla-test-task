import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  MESSAGE_REPOSITORY,
  ROOM_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  UserSchema,
  UserMongoSchema,
  MessageSchema,
  MessageMongoSchema,
  RoomSchema,
  RoomMongoSchema,
} from './schemas';
import {
  MongoUserRepository,
  MongoMessageRepository,
  MongoRoomRepository,
} from './repositories';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI')!,
      }),
    }),
    MongooseModule.forFeature([
      { name: UserSchema.name, schema: UserMongoSchema },
      { name: MessageSchema.name, schema: MessageMongoSchema },
      { name: RoomSchema.name, schema: RoomMongoSchema },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MongoUserRepository,
    },
    {
      provide: MESSAGE_REPOSITORY,
      useClass: MongoMessageRepository,
    },
    {
      provide: ROOM_REPOSITORY,
      useClass: MongoRoomRepository,
    },
  ],
  exports: [USER_REPOSITORY, MESSAGE_REPOSITORY, ROOM_REPOSITORY],
})
export class MongoDatabaseModule {}
