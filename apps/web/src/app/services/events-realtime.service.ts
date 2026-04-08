import { inject, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../core/api-tokens';
import { AuthService } from './auth.service';
import type { EventClientToServerEvents, EventServerToClientEvents } from '@chat-app/shared/types';

type ErrorPayload = { message: string };

export type MessageNotification = Parameters<EventServerToClientEvents['messageNotification']>[0];
export type PresenceUpdate = Parameters<EventServerToClientEvents['presenceUpdate']>[0];
export type RoomAddedEvent = Parameters<EventServerToClientEvents['roomAdded']>[0];

type ServerToClientEvents = EventServerToClientEvents & {
  error: (data: ErrorPayload) => void;
};

type ClientToServerEvents = EventClientToServerEvents;

@Injectable({ providedIn: 'root' })
export class EventsRealtimeService {
  private auth = inject(AuthService);
  private wsBaseUrl = inject(WS_BASE_URL);
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  readonly connected = signal(false);

  connect(): void {
    if (this.socket) {
      this.socket.connect();
      return;
    }
    this.socket = io(`${this.wsBaseUrl}/events`, {
      auth: {
        token: this.auth.getAccessToken(),
      },
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  updateToken(token: string | null): void {
    if (!this.socket || !token) return;
    this.socket.auth = { token };
  }

  setActiveRoom(roomId: string | null): void {
    this.emit('setActiveRoom', { roomId });
  }

  onMessageNotification(handler: (data: MessageNotification) => void): void {
    this.socket?.on('messageNotification', handler);
  }

  onPresenceUpdate(handler: (data: PresenceUpdate) => void): void {
    this.socket?.on('presenceUpdate', handler);
  }

  onRoomAdded(handler: (data: RoomAddedEvent) => void): void {
    this.socket?.on('roomAdded', handler);
  }

  onConnect(handler: () => void): void {
    this.socket?.on('connect', handler);
  }

  onDisconnect(handler: (reason: string) => void): void {
    this.socket?.on('disconnect', handler);
  }

  onConnectError(handler: (error: Error) => void): void {
    this.socket?.on('connect_error', handler);
  }

  onError(handler: (data: ErrorPayload) => void): void {
    this.socket?.on('error', handler);
  }

  private emit<TEvent extends keyof ClientToServerEvents>(
    event: TEvent,
    ...args: Parameters<ClientToServerEvents[TEvent]>
  ): void {
    this.socket?.emit(event, ...args);
  }
}
