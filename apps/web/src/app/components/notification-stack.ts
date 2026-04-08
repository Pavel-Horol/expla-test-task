import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification-stack',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      @for (note of notifications(); track note.id) {
        <div
          class="pointer-events-auto rounded-xl border border-gray-200 bg-white shadow-lg px-4 py-3 text-sm text-gray-900 transition"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 truncate">{{ note.title }}</p>
              <p class="text-gray-600 max-h-10 overflow-hidden">{{ note.body }}</p>
            </div>
            <button
              class="text-gray-400 hover:text-gray-600 transition"
              (click)="dismiss(note.id)"
              aria-label="Dismiss notification"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"
                />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationStackComponent {
  private notificationsService = inject(NotificationService);
  notifications = computed(() => this.notificationsService.notifications());

  dismiss(id: string) {
    this.notificationsService.dismiss(id);
  }
}
