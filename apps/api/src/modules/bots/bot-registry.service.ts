import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUserRepository, USER_REPOSITORY } from '@chat-app/shared/interfaces';
import { BcryptService } from '../auth/services/bcrypt.service';
import { BOT_DEFINITIONS } from './bots.constants';
import { BotKey, BotUser } from './bots.types';

@Injectable()
export class BotRegistryService {
  private readonly logger = new Logger(BotRegistryService.name);
  private botUsers: BotUser[] | null = null;
  private readonly botIdSet = new Set<string>();
  private readonly enabled: boolean;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly bcryptService: BcryptService,
    private readonly config: ConfigService,
  ) {
    this.enabled = this.config.get<boolean>('BOTS_ENABLED') ?? true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async ensureBots(): Promise<BotUser[]> {
    if (!this.enabled) {
      return [];
    }

    if (this.botUsers) {
      return this.botUsers;
    }

    const createdBots: BotUser[] = [];

    for (const def of BOT_DEFINITIONS) {
      let user = await this.userRepository.findByEmail(def.email);

      if (!user) {
        const passwordHash = await this.bcryptService.hash(
          `bot-${def.key}-${Date.now()}-${Math.random()}`,
        );

        user = await this.userRepository.create({
          email: def.email,
          username: def.username,
          passwordHash,
        });

        this.logger.log(`Created bot user: ${def.username}`);
      }

      const botUser: BotUser = {
        id: user.id,
        key: def.key,
        email: user.email,
        username: user.username,
      };

      createdBots.push(botUser);
      this.botIdSet.add(user.id);
    }

    this.botUsers = createdBots;
    return createdBots;
  }

  async getBots(): Promise<BotUser[]> {
    return this.ensureBots();
  }

  async getBotIds(): Promise<string[]> {
    return (await this.ensureBots()).map((bot) => bot.id);
  }

  async getBotByKey(key: BotKey): Promise<BotUser | null> {
    const bots = await this.ensureBots();
    return bots.find((bot) => bot.key === key) || null;
  }

  async isBotId(userId: string): Promise<boolean> {
    await this.ensureBots();
    return this.botIdSet.has(userId);
  }
}
