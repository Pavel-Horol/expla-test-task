import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { BotsModule } from '../bots/bots.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [AuthModule, BotsModule, PresenceModule],
  providers: [ChatGateway],
})
export class ChatModule {}
