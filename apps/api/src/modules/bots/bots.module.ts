import { Module } from '@nestjs/common';
import { BcryptService } from '../auth/services/bcrypt.service';
import { PresenceModule } from '../presence/presence.module';
import { BotRegistryService } from './bot-registry.service';
import { BotOrchestratorService } from './bot-orchestrator.service';

@Module({
  imports: [PresenceModule],
  providers: [BcryptService, BotRegistryService, BotOrchestratorService],
  exports: [BotRegistryService, BotOrchestratorService],
})
export class BotsModule {}
