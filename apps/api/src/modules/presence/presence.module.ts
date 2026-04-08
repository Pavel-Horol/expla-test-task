import { Module } from '@nestjs/common';
import { PRESENCE_STORE } from './presence.constants';
import { InMemoryPresenceStore } from './in-memory-presence.store';

@Module({
  providers: [
    {
      provide: PRESENCE_STORE,
      useClass: InMemoryPresenceStore,
    },
  ],
  exports: [PRESENCE_STORE],
})
export class PresenceModule {}
