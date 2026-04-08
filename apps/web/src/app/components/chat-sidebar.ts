import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../services/chat-store.service';
import { Room } from '../core/models';
import { CreateRoomModalComponent, CreateRoomPayload } from './create-room-modal';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateRoomModalComponent],
  template: `
    <div class="w-full h-full flex flex-col bg-gray-50 border-r border-gray-200">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-gray-900">Chats</h1>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            @if (chatStore.loadingRooms()) {
              <span>Loading...</span>
            }
            <button
              class="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              (click)="createRoom()"
            >
              New
            </button>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="p-3 border-b border-gray-200">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQueryValue"
            placeholder="Search chats"
            class="w-full pl-9 pr-3 py-2.5 rounded-md text-sm text-gray-900 bg-transparent placeholder-gray-400/60 focus:outline-none focus:bg-white/60 focus:ring-2 focus:ring-indigo-500/20 focus:placeholder-transparent"
          />
        </div>
      </div>

      <!-- Chat List -->
      <div class="flex-1 overflow-y-auto">
        @for (room of filteredRooms(); track room.id) {
          <div
            class="px-3 py-3 cursor-pointer hover:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
            [class.bg-gray-100]="chatStore.selectedRoomId() === room.id"
            (click)="chatStore.selectRoom(room.id)"
          >
            <div class="flex gap-3">
              <div class="relative flex-shrink-0">
                <img
                  [src]="avatarFor(room.name)"
                  alt="{{ room.name }}"
                  class="w-12 h-12 rounded-full object-cover"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-baseline gap-2">
                  <h3 class="text-sm font-medium text-gray-900 truncate">
                    {{ room.name }}
                  </h3>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs text-gray-500">
                      {{ lastMessageTime(room) }}
                    </span>
                    @if (unreadCount(room.id) > 0) {
                      <span
                        class="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center"
                      >
                        {{ unreadCount(room.id) }}
                      </span>
                    }
                  </div>
                </div>
                <p class="text-sm text-gray-600 truncate">
                  {{ lastMessageText(room) }}
                </p>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 p-3">
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button
            class="px-3 py-2 text-sm font-medium rounded-lg transition"
            [class.bg-indigo-600]="chatStore.roomsFilter() === 'all'"
            [class.text-white]="chatStore.roomsFilter() === 'all'"
            [class.shadow-sm]="chatStore.roomsFilter() === 'all'"
            [class.bg-white]="chatStore.roomsFilter() !== 'all'"
            [class.text-gray-600]="chatStore.roomsFilter() !== 'all'"
            [class.hover:bg-gray-50]="chatStore.roomsFilter() !== 'all'"
            (click)="setRoomsFilter('all')"
          >
            All users
          </button>
          <button
            class="px-3 py-2 text-sm font-medium rounded-lg transition"
            [class.bg-indigo-600]="chatStore.roomsFilter() === 'online'"
            [class.text-white]="chatStore.roomsFilter() === 'online'"
            [class.shadow-sm]="chatStore.roomsFilter() === 'online'"
            [class.bg-white]="chatStore.roomsFilter() !== 'online'"
            [class.text-gray-600]="chatStore.roomsFilter() !== 'online'"
            [class.hover:bg-gray-50]="chatStore.roomsFilter() !== 'online'"
            (click)="setRoomsFilter('online')"
          >
            Online users
          </button>
        </div>
      </div>
    </div>

    @if (isCreateModalOpen()) {
      <app-create-room-modal
        (close)="closeCreateModal()"
        (submitRoom)="handleCreateRoom($event)"
      />
    }
  `,
})
export class ChatSidebarComponent {
  chatStore = inject(ChatStore);
  searchQuery = signal('');
  isCreateModalOpen = signal(false);

  filteredRooms = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const rooms = this.chatStore.rooms();
    if (!query) return rooms;
    return rooms.filter((room) => room.name.toLowerCase().includes(query));
  });

  get searchQueryValue() {
    return this.searchQuery();
  }

  set searchQueryValue(value: string) {
    this.searchQuery.set(value);
  }

  avatarFor(name: string) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  }

  lastMessageText(room: Room) {
    const lastMessage = room.lastMessage;
    if (!lastMessage) return 'No messages yet';
    if (typeof lastMessage === 'string') return lastMessage;
    return lastMessage.content ?? 'No messages yet';
  }

  lastMessageTime(room: Room) {
    if (room.lastMessageAt) return this.formatShortRelative(room.lastMessageAt);
    const lastMessage = room.lastMessage;
    if (!lastMessage || typeof lastMessage === 'string') return '';
    return lastMessage.createdAt ? this.formatShortRelative(lastMessage.createdAt) : '';
  }

  unreadCount(roomId: string) {
    return this.chatStore.unreadCount(roomId);
  }

  private formatShortRelative(iso: string) {
    const timestamp = Date.parse(iso);
    if (Number.isNaN(timestamp)) return '';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 'now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  createRoom() {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  handleCreateRoom(payload: CreateRoomPayload) {
    this.chatStore.createRoom(payload);
    this.isCreateModalOpen.set(false);
  }

  setRoomsFilter(filter: 'all' | 'online') {
    this.chatStore.setRoomsFilter(filter);
  }

  addUser() {
    const roomId = this.chatStore.selectedRoomId();
    if (!roomId) return;
    const userId = prompt('User ID to add?');
    if (!userId) return;
    this.chatStore.addUserToRoom(roomId, userId);
  }

  leaveRoom() {
    const roomId = this.chatStore.selectedRoomId();
    if (!roomId) return;
    this.chatStore.leaveRoom(roomId);
  }
}
