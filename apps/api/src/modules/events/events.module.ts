import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';
import { EventsGateway } from './events.gateway';
import { ACTIVE_ROOM_STORE } from './events.constants';
import { InMemoryActiveRoomStore } from './in-memory-active-room.store';

@Module({
  imports: [AuthModule, PresenceModule],
  providers: [
    EventsGateway,
    {
      provide: ACTIVE_ROOM_STORE,
      useClass: InMemoryActiveRoomStore,
    },
  ],
  exports: [EventsGateway],
})
export class EventsModule {}
