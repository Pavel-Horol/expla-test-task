export interface EventClientToServerEvents {
  setActiveRoom: (data: { roomId: string | null }) => void;
}

export interface EventServerToClientEvents {
  messageNotification: (data: {
    roomId: string;
    messageId: string;
    fromUserId: string;
    preview: string;
    createdAt: string;
  }) => void;
  presenceUpdate: (data: {
    userId: string;
    status: 'online' | 'offline';
    updatedAt: string;
  }) => void;
  roomAdded: (data: {
    roomId: string;
    roomName: string;
    addedByUserId: string;
    addedAt: string;
  }) => void;
}
