import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type CreateRoomPayload = {
  name: string;
  userIds?: string[];
  userEmails?: string[];
};

@Component({
  selector: 'app-create-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        class="absolute inset-0 bg-black/30"
        (click)="close.emit()"
      ></div>
      <div
        class="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">Create room</h2>
          <button
            type="button"
            class="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            (click)="close.emit()"
            aria-label="Close"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
              />
            </svg>
          </button>
        </div>

        <form class="px-6 py-5 space-y-5" (submit)="handleSubmit($event)">
          <div>
            <label class="block text-sm font-medium text-gray-700">Room name</label>
            <input
              type="text"
              [(ngModel)]="name"
              name="name"
              placeholder="General Chat"
              class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
            />
            @if (nameError) {
              <p class="mt-1 text-xs text-red-600">{{ nameError }}</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Invite by user IDs</label>
            <div class="mt-2 rounded-lg border border-gray-200 px-2 py-2 focus-within:border-indigo-500">
              <div class="flex flex-wrap gap-2">
                @for (id of userIds; track id) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {{ id }}
                    <button
                      type="button"
                      class="text-gray-500 hover:text-gray-700"
                      (click)="removeUserId(id)"
                      aria-label="Remove user id"
                    >
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
                      </svg>
                    </button>
                  </span>
                }
                <input
                  type="text"
                  name="userIdInput"
                  [(ngModel)]="userIdInput"
                  (keydown)="handleUserIdKeydown($event)"
                  (input)="maybeCommitUserIds()"
                  (blur)="commitUserIds()"
                  placeholder="Type an ID and press Enter"
                  class="flex-1 min-w-[180px] border-0 px-1 py-1 text-sm text-gray-900 focus:outline-none"
                />
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500">Press Enter to add. Paste multiple IDs separated by commas.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Invite by email</label>
            <div class="mt-2 rounded-lg border border-gray-200 px-2 py-2 focus-within:border-indigo-500">
              <div class="flex flex-wrap gap-2">
                @for (email of userEmails; track email) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                    {{ email }}
                    <button
                      type="button"
                      class="text-indigo-500 hover:text-indigo-700"
                      (click)="removeUserEmail(email)"
                      aria-label="Remove user email"
                    >
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
                      </svg>
                    </button>
                  </span>
                }
                <input
                  type="text"
                  name="userEmailInput"
                  [(ngModel)]="userEmailInput"
                  (keydown)="handleUserEmailKeydown($event)"
                  (input)="maybeCommitUserEmails()"
                  (blur)="commitUserEmails()"
                  placeholder="Type an email and press Enter"
                  class="flex-1 min-w-[180px] border-0 px-1 py-1 text-sm text-gray-900 focus:outline-none"
                />
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500">We will validate emails before creating the room.</p>
            @if (emailError) {
              <p class="mt-1 text-xs text-red-600">{{ emailError }}</p>
            }
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              (click)="close.emit()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create room
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CreateRoomModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() submitRoom = new EventEmitter<CreateRoomPayload>();

  name = '';
  nameError = '';

  userIds: string[] = [];
  userIdInput = '';

  userEmails: string[] = [];
  userEmailInput = '';
  emailError = '';

  handleSubmit(event: Event) {
    event.preventDefault();
    this.nameError = '';
    this.emailError = '';

    this.commitUserIds();
    this.commitUserEmails();

    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.nameError = 'Room name is required.';
      return;
    }

    if (this.emailError) return;

    const payload: CreateRoomPayload = { name: trimmedName };
    if (this.userIds.length) payload.userIds = [...this.userIds];
    if (this.userEmails.length) payload.userEmails = [...this.userEmails];

    this.submitRoom.emit(payload);
  }

  handleUserIdKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitUserIds();
      return;
    }

    if (event.key === 'Backspace' && !this.userIdInput && this.userIds.length) {
      this.userIds.pop();
    }
  }

  handleUserEmailKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitUserEmails();
      return;
    }

    if (event.key === 'Backspace' && !this.userEmailInput && this.userEmails.length) {
      this.userEmails.pop();
    }
  }

  maybeCommitUserIds() {
    if (this.userIdInput.includes(',')) {
      this.commitUserIds();
    }
  }

  maybeCommitUserEmails() {
    if (this.userEmailInput.includes(',')) {
      this.commitUserEmails();
    }
  }

  commitUserIds() {
    const tokens = this.splitTokens(this.userIdInput);
    if (!tokens.length) return;
    const merged = new Set([...this.userIds, ...tokens]);
    this.userIds = Array.from(merged);
    this.userIdInput = '';
  }

  commitUserEmails() {
    const tokens = this.splitTokens(this.userEmailInput);
    if (!tokens.length) return;

    const invalid = tokens.filter((email) => !this.isValidEmail(email));
    if (invalid.length) {
      this.emailError = `Invalid email: ${invalid[0]}`;
      return;
    }

    const merged = new Set([...this.userEmails, ...tokens.map((email) => email.toLowerCase())]);
    this.userEmails = Array.from(merged);
    this.userEmailInput = '';
    this.emailError = '';
  }

  removeUserId(id: string) {
    this.userIds = this.userIds.filter((item) => item !== id);
  }

  removeUserEmail(email: string) {
    this.userEmails = this.userEmails.filter((item) => item !== email);
  }

  private splitTokens(value: string) {
    return value
      .split(/[,\n]/g)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
