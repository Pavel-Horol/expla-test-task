import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [AuthModule, PresenceModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
