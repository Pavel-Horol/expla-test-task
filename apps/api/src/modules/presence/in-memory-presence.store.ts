import { Injectable } from '@nestjs/common';
import { PresenceStatusChange, PresenceStore } from './presence.store';

@Injectable()
export class InMemoryPresenceStore implements PresenceStore {
  private readonly userSockets = new Map<string, number>();
  private readonly offlineTimers = new Map<string, NodeJS.Timeout>();
  private readonly disconnectGraceMs = 8000;
  private readonly statusListeners = new Set<(event: PresenceStatusChange) => void>();

  markUserConnected(userId: string): void {
    const wasOnline = this.isUserOnline(userId);

    const existingTimer = this.offlineTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.offlineTimers.delete(userId);
    }

    const current = this.userSockets.get(userId) ?? 0;
    this.userSockets.set(userId, current + 1);

    if (!wasOnline) {
      this.emitStatusChange({ userId, status: 'online' });
    }
  }

  markUserDisconnected(userId: string): void {
    const current = this.userSockets.get(userId) ?? 0;
    const next = Math.max(0, current - 1);
    this.userSockets.set(userId, next);

    if (next > 0) {
      return;
    }

    if (this.offlineTimers.has(userId)) {
      return;
    }

    const timer = setTimeout(() => {
      if ((this.userSockets.get(userId) ?? 0) === 0) {
        this.userSockets.delete(userId);
        this.emitStatusChange({ userId, status: 'offline' });
      }
      this.offlineTimers.delete(userId);
    }, this.disconnectGraceMs);

    this.offlineTimers.set(userId, timer);
  }

  isUserOnline(userId: string): boolean {
    const socketCount = this.userSockets.get(userId) ?? 0;
    return socketCount > 0 || this.offlineTimers.has(userId);
  }

  countOnlineUsers(userIds: string[]): number {
    let count = 0;
    for (const userId of userIds) {
      if (this.isUserOnline(userId)) {
        count += 1;
      }
    }
    return count;
  }

  onStatusChange(listener: (event: PresenceStatusChange) => void): void {
    this.statusListeners.add(listener);
  }

  private emitStatusChange(event: PresenceStatusChange): void {
    for (const listener of this.statusListeners) {
      listener(event);
    }
  }
}
