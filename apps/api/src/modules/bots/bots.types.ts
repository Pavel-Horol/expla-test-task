import { BOT_DEFINITIONS } from './bots.constants';

export type BotKey = (typeof BOT_DEFINITIONS)[number]['key'];

export type BotDefinition = {
  key: BotKey;
  email: string;
  username: string;
};

export type BotUser = BotDefinition & {
  id: string;
};

export type BotMessagePayload = {
  id: string;
  content: string;
  userId: string;
  username: string;
  roomId: string;
  createdAt: string;
};

export type EmitMessageFn = (roomId: string, payload: BotMessagePayload) => void;
