import { Component, computed, effect, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../services/chat-store.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col bg-white min-h-0 flex-1">
      <!-- Chat Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <img
            [src]="avatarFor(activeRoom()?.name ?? 'Room')"
            alt="{{ activeRoom()?.name ?? 'Room' }}"
            class="w-10 h-10 rounded-full"
          />
          <div>
            <h2 class="font-semibold text-gray-900">
              {{ activeRoom()?.name ?? (chatStore.selectedRoomId() ? 'Loading room...' : 'Select a room') }}
            </h2>
            <p class="text-sm text-gray-500 flex items-center gap-1">
              <span
                class="w-2 h-2 rounded-full"
                [class.bg-green-500]="activeRoom()?.hasOnline"
                [class.bg-gray-400]="activeRoom() && !activeRoom()?.hasOnline"
                [class.bg-gray-300]="!activeRoom()"
              ></span>
              {{ activeRoom()?.hasOnline ? 'Online' : activeRoom() ? 'Offline' : 'Idle' }}
            </p>
          </div>
        </div>
      </div>

      @if (socketStatus() !== 'connected') {
        <div class="px-4 py-2 text-xs bg-amber-50 text-amber-700 border-b border-amber-100">
          {{ socketStatus() === 'connecting' ? 'Connecting to realtime...' : 'Disconnected from realtime.' }}
          @if (socketError()) {
            <span class="ml-2 text-amber-600">({{ socketError() }})</span>
          }
        </div>
      }

      <!-- Messages -->
      <div #messageScroll class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        @if (hasMore()) {
          <div class="flex justify-center">
            <button
              class="rounded-full border border-gray-200 px-4 py-1 text-xs text-gray-600 hover:bg-gray-100"
              (click)="loadOlder()"
            >
              {{ loadingOlder() ? 'Loading...' : 'Load older' }}
            </button>
          </div>
        }
        @for (message of messages(); track message.id) {
          @if (message.userId === 'system') {
            <div class="text-center text-xs text-gray-400">
              {{ message.content }}
            </div>
          } @else if (message.userId !== currentUserId()) {
            <div class="flex gap-3 items-end">
              <img
                [src]="avatarFor(activeRoom()?.name ?? 'Room')"
                alt="{{ activeRoom()?.name ?? 'Room' }}"
                class="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div class="max-w-xs">
                <div
                  class="px-4 py-2 bg-gray-100 text-gray-900 rounded-3xl rounded-tl-none text-sm"
                >
                  {{ message.content }}
                </div>
              </div>
            </div>
          } @else {
            <div class="flex justify-end">
              <div
                class="max-w-xs px-4 py-2 bg-indigo-600 text-white rounded-3xl rounded-br-none text-sm"
              >
                {{ message.content }}
              </div>
            </div>
          }
        }
        @if (typingUsers().length > 0) {
          <div class="text-sm text-gray-500">
            {{ typingLabel() }}
          </div>
        }
      </div>

      <!-- Message Input -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex gap-2 items-end">
          <input
            type="text"
            [(ngModel)]="messageInput"
            (input)="handleInput()"
            [disabled]="!activeRoom()"
            [placeholder]="activeRoom() ? 'Type a message' : 'Select a room to start'"
            (keyup.enter)="sendMessage()"
            class="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            (click)="sendMessage()"
            class="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex-shrink-0"
          >
            <svg
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346272 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4429026 C0.994623095,2.0574281 0.837654326,3.1469694 1.15159189,3.93246629 L3.03521743,10.3734593 C3.03521743,10.5305566 3.34915502,10.6876541 3.50612381,10.6876541 L16.6915026,11.4731409 C16.6915026,11.4731409 17.1624089,11.4731409 17.1624089,12.0016974 C17.1624089,12.5302538 16.6915026,12.4744748 16.6915026,12.4744748 Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class ChatWindowComponent {
  chatStore = inject(ChatStore);
  messageInput = '';
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('messageScroll') messageScroll?: ElementRef<HTMLDivElement>;

  activeRoom = computed(() => this.chatStore.selectedRoom());
  messages = computed(() => this.chatStore.selectedMessages());
  typingUsers = computed(() => this.chatStore.typingUsers());
  hasMore = computed(() => this.chatStore.selectedHasMore());
  loadingOlder = computed(() => this.chatStore.loadingOlder());
  socketStatus = computed(() => this.chatStore.socketStatus());
  socketError = computed(() => this.chatStore.socketError());
  currentUserId = computed(() => this.chatStore.currentUserId());

  typingLabel = computed(() => {
    const names = this.typingUsers();
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(', ')} are typing...`;
  });

  avatarFor(name: string) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  }

  constructor() {
    effect(() => {
      this.messages();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  handleInput() {
    if (!this.activeRoom()) return;
    this.chatStore.notifyTyping(true);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.chatStore.notifyTyping(false);
    }, 1200);
  }

  sendMessage() {
    if (!this.messageInput.trim()) return;
    this.chatStore.sendMessage(this.messageInput);
    this.messageInput = '';
  }

  loadOlder() {
    this.chatStore.loadOlderMessages();
  }

  private scrollToBottom() {
    const el = this.messageScroll?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
