import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSidebarComponent } from '../components/chat-sidebar';
import { ChatWindowComponent } from '../components/chat-window';
import { ChatStore } from '../services/chat-store.service';
import { NotificationStackComponent } from '../components/notification-stack';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatSidebarComponent, ChatWindowComponent, NotificationStackComponent],
  template: `
    <div class="h-screen flex bg-white overflow-hidden">
      <!-- Sidebar -->
      <div class="hidden md:block w-64 flex-shrink-0 border-r border-gray-200">
        <app-chat-sidebar />
      </div>

      <!-- Mobile Menu Button -->
      <div class="md:hidden absolute top-4 left-4 z-10">
        <button
          (click)="toggleMobileMenu()"
          class="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg
            class="w-6 h-6 text-gray-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Sidebar Overlay -->
      @if (mobileMenuOpen()) {
        <div
          class="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          (click)="toggleMobileMenu()"
        ></div>
        <div class="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-50 shadow-lg">
          <div class="absolute top-4 right-4">
            <button
              (click)="toggleMobileMenu()"
              class="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg
                class="w-6 h-6 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <app-chat-sidebar />
        </div>
      }

      <!-- Chat Window -->
      <div class="flex-1 flex flex-col min-h-0">
        <app-chat-window />
      </div>
    </div>
    <app-notification-stack />
  `,
  host: {
    class: 'block h-screen',
  },
})
export class ChatPageComponent implements OnInit {
  constructor(private chatStore: ChatStore) {}

  mobileMenuOpen = signal(false);

  ngOnInit() {
    this.chatStore.init();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }
}
