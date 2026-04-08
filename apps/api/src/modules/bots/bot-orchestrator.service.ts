import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@chat-app/shared/interfaces';
import { BotRegistryService } from './bot-registry.service';
import { EmitMessageFn } from './bots.types';
import { SPAM_PHRASES } from './bots.constants';
import { PRESENCE_STORE } from '../presence/presence.constants';
import { PresenceStore } from '../presence/presence.store';
import { ROOM_EVENTS, RoomCreatedEvent, AUTH_EVENTS, UserRegisteredEvent } from '@chat-app/shared/events';

@Injectable()
export class BotOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(BotOrchestratorService.name);
  private emitMessage: EmitMessageFn | null = null;
  private readonly spamTimers = new Map<string, NodeJS.Timeout>();
  private readonly spamMinSeconds: number;
  private readonly spamMaxSeconds: number;
  private botsMarkedOnline = false;

  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: IRoomRepository,
    private readonly botRegistry: BotRegistryService,
    private readonly config: ConfigService,
    @Inject(PRESENCE_STORE)
    private readonly presenceStore: PresenceStore,
  ) {
    this.spamMinSeconds = this.config.get<number>('SPAM_BOT_MIN_SECONDS') ?? 10;
    this.spamMaxSeconds = this.config.get<number>('SPAM_BOT_MAX_SECONDS') ?? 120;
  }

  setEmitter(emitMessage: EmitMessageFn): void {
    this.emitMessage = emitMessage;
  }

  async start(): Promise<void> {
    if (!this.botRegistry.isEnabled()) return;
    await this.botRegistry.ensureBots();
    await this.markBotsOnline();
    await this.startSpamBots();
  }

  async handleUserMessage(
    roomId: string,
    content: string,
    senderId: string,
  ): Promise<void> {
    if (!this.botRegistry.isEnabled()) return;

    const isBot = await this.botRegistry.isBotId(senderId);
    if (isBot) return;

    const room = await this.roomRepository.findById(roomId);
    if (!room) return;

    const echoBot = await this.botRegistry.getBotByKey('echo');
    if (echoBot && room.userIds.includes(echoBot.id)) {
      await this.sendBotMessage(roomId, echoBot.id, echoBot.username, content, 0);
    }

    const reverseBot = await this.botRegistry.getBotByKey('reverse');
    if (reverseBot && room.userIds.includes(reverseBot.id)) {
      const reversed = content.split('').reverse().join('');
      await this.sendBotMessage(roomId, reverseBot.id, reverseBot.username, reversed, 3000);
    }
  }

  @OnEvent(AUTH_EVENTS.USER_REGISTERED)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    if (!this.botRegistry.isEnabled()) return;

    await this.markBotsOnline();
    const bots = await this.botRegistry.getBots();

    for (const bot of bots) {
      const room = await this.roomRepository.create({
        name: bot.username,
        userIds: [event.userId, bot.id],
      });
      await this.startBotsInRoom(room.id);
    }
  }

  @OnEvent(ROOM_EVENTS.ROOM_CREATED)
  async onRoomCreated(event: RoomCreatedEvent): Promise<void> {
    if (!this.botRegistry.isEnabled()) return;
    await this.markBotsOnline();
    await this.startBotsInRoom(event.roomId);
  }

  onModuleDestroy(): void {
    for (const timeout of this.spamTimers.values()) {
      clearTimeout(timeout);
    }
    this.spamTimers.clear();
  }

  private async markBotsOnline(): Promise<void> {
    if (this.botsMarkedOnline) return;

    const botIds = await this.botRegistry.getBotIds();
    for (const botId of botIds) {
      this.presenceStore.markUserConnected(botId);
    }

    this.botsMarkedOnline = true;
  }

  private async startSpamBots(): Promise<void> {
    const rooms = await this.roomRepository.findAll();
    for (const room of rooms) {
      await this.startBotsInRoom(room.id);
    }
  }

  private async startBotsInRoom(roomId: string): Promise<void> {
    if (this.spamTimers.has(roomId)) return;

    const spamBot = await this.botRegistry.getBotByKey('spam');
    if (!spamBot) return;

    const room = await this.roomRepository.findById(roomId);
    if (!room || !room.userIds.includes(spamBot.id)) return;

    const scheduleNext = () => {
      const delayMs = this.randomDelayMs();

      const timeout = setTimeout(async () => {
        try {
          const phrase = this.pickSpamPhrase();
          await this.sendBotMessage(roomId, spamBot.id, spamBot.username, phrase, 0);
        } catch (error) {
          this.logger.error(`Spam bot failed in room ${roomId}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          scheduleNext();
        }
      }, delayMs);

      this.spamTimers.set(roomId, timeout);
    };

    scheduleNext();
  }

  private randomDelayMs(): number {
    const min = Math.max(1, this.spamMinSeconds);
    const max = Math.max(min, this.spamMaxSeconds);
    const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
    return seconds * 1000;
  }

  private pickSpamPhrase(): string {
    return SPAM_PHRASES[Math.floor(Math.random() * SPAM_PHRASES.length)];
  }

  private async sendBotMessage(
    roomId: string,
    botUserId: string,
    username: string,
    content: string,
    delayMs: number,
  ): Promise<void> {
    const send = async () => {
      if (!this.emitMessage) {
        this.logger.warn('Bot emitter is not ready. Skipping message.');
        return;
      }

      const message = await this.messageRepository.create({ content, userId: botUserId, roomId });

      this.emitMessage(roomId, {
        id: message.id,
        content: message.content,
        userId: message.userId,
        username,
        roomId: message.roomId,
        createdAt: message.createdAt.toISOString(),
      });
    };

    if (delayMs > 0) {
      setTimeout(() => void send(), delayMs);
      return;
    }

    await send();
  }
}
