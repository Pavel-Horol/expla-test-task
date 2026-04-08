import { Module } from '@nestjs/common';
import {
  USER_REPOSITORY,
  MESSAGE_REPOSITORY,
  ROOM_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  InMemoryUserRepository,
  InMemoryMessageRepository,
  InMemoryRoomRepository,
} from './repositories';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: InMemoryUserRepository,
    },
    {
      provide: MESSAGE_REPOSITORY,
      useClass: InMemoryMessageRepository,
    },
    {
      provide: ROOM_REPOSITORY,
      useClass: InMemoryRoomRepository,
    },
  ],
  exports: [USER_REPOSITORY, MESSAGE_REPOSITORY, ROOM_REPOSITORY],
})
export class InMemoryDatabaseModule {}
