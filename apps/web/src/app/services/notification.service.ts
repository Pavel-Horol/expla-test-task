import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  roomId?: string;
  createdAt: number;
}

const DEFAULT_TTL_MS = 4500;
const MAX_TOASTS = 2;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly notifications = signal<ToastNotification[]>([]);

  show(notification: Omit<ToastNotification, 'id' | 'createdAt'>, ttlMs = DEFAULT_TTL_MS): void {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const entry: ToastNotification = {
      id,
      createdAt: Date.now(),
      ...notification,
    };
    const previous = this.notifications();
    const next = [entry, ...previous].slice(0, MAX_TOASTS);
    this.notifications.set(next);
    for (const removed of previous.filter((note) => !next.some((nextNote) => nextNote.id === note.id))) {
      this.dismiss(removed.id);
    }
    this.scheduleDismiss(id, ttlMs);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notifications.set(this.notifications().filter((note) => note.id !== id));
  }

  private scheduleDismiss(id: string, ttlMs: number): void {
    const timer = setTimeout(() => this.dismiss(id), ttlMs);
    this.timers.set(id, timer);
  }
}
