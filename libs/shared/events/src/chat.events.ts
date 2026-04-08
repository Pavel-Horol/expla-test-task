export const CHAT_EVENTS = {
  MESSAGE_SENT: 'chat.message.sent',
} as const;

export interface MessageSentEvent {
  roomId: string;
  messageId: string;
  fromUserId: string;
  preview: string;
  createdAt: string;
  recipientIds: string[];
}
