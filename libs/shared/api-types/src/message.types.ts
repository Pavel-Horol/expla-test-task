export interface CreateMessageRequest {
  content: string;
  roomId: string;
}

export interface MessageResponse {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetMessagesQuery {
  limit?: number;
  cursor?: string;
  follow?: 'next' | 'prev';
}

export interface MessagesPaginatedResponse {
  data: MessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}
