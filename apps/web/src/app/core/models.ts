import type {
  AddUserToRoomRequest,
  AuthResponse as ApiAuthResponse,
  CreateRoomRequest,
  GetMessagesQuery,
  LoginRequest,
  MessageResponse,
  MessagesPaginatedResponse,
  RefreshTokenRequest,
  RegisterRequest,
  RoomResponse,
  UserResponse,
} from '@chat-app/shared/api-types';

export type { AddUserToRoomRequest, CreateRoomRequest, GetMessagesQuery, LoginRequest, RefreshTokenRequest, RegisterRequest };

export type User = UserResponse;

export type AuthResponse = ApiAuthResponse;

export type AuthTokens = Pick<ApiAuthResponse, 'accessToken' | 'refreshToken'>;

export type Message = Omit<MessageResponse, 'updatedAt'> & {
  updatedAt?: string;
  username?: string;
};

export type Room = Omit<RoomResponse, 'lastMessage'> & {
  lastMessage?: Message | string | null;
  lastMessageAt?: string;
};

export type PaginatedMessages = MessagesPaginatedResponse;

export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
}
