import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#ffffff_60%)]">
      <div class="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
        <div class="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="flex flex-col justify-center">
            <p class="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">
              Expla Chat
            </p>
            <h1 class="mt-4 text-4xl font-semibold text-slate-900 lg:text-5xl">
              Welcome back to your messages.
            </h1>
            <div class="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
              <span class="rounded-full border border-slate-200 bg-white px-3 py-1">
                Realtime ready
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-3 py-1">
                Tailwind + Angular + NestJs + Socket.IO
              </span>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-indigo-100 backdrop-blur">
            <h2 class="text-2xl font-semibold text-slate-900">
              {{ titleText() }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              {{ subtitleText() }}
            </p>

            <form class="mt-6 space-y-4" (ngSubmit)="submit()">
              <label class="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="you@example.com"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                />
              </label>

              @if (isRegister()) {
                <label class="block text-sm font-medium text-slate-700">
                  Username
                  <input
                    type="text"
                    [(ngModel)]="username"
                    name="username"
                    placeholder="yourname"
                    class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                  />
                </label>
              }

              <label class="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                />
              </label>

              <button
                type="submit"
                [disabled]="loading()"
                class="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {{ submitLabel() }}
              </button>
            </form>

            <div class="mt-6 flex items-center justify-between text-sm text-slate-500">
              <button
                type="button"
                class="font-medium text-indigo-600 hover:text-indigo-700"
                (click)="toggleMode()"
              >
                {{ toggleText() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly email = signal('');
  readonly username = signal('');
  readonly password = signal('');
  readonly loading = signal(false);

  readonly isLogin = computed(() => this.mode() === 'login');
  readonly isRegister = computed(() => this.mode() === 'register');
  readonly titleText = computed(() => (this.isLogin() ? 'Sign in' : 'Create account'));
  readonly subtitleText = computed(() =>
    this.isLogin() ? 'Use your credentials.' : 'Pick a username to get started.'
  );
  readonly submitLabel = computed(() => {
    if (this.loading()) {
      return this.isLogin() ? 'Signing in...' : 'Creating account...';
    }
    return this.isLogin() ? 'Sign in' : 'Create account';
  });
  readonly toggleText = computed(() =>
    this.isLogin() ? 'Create an account' : 'Back to sign in'
  );

  toggleMode() {
    this.mode.set(this.isLogin() ? 'register' : 'login');
  }

  submit() {
    if (this.loading()) return;
    this.loading.set(true);
    const request$ = this.isLogin()
      ? this.auth.login(this.email(), this.password())
      : this.auth.register(this.email(), this.username(), this.password());

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.auth.setTokens(response);
          this.auth.user.set(response.user);
          this.auth.startAutoRefresh();
          this.router.navigateByUrl('/chat');
        },
        error: () => {},
      });
  }
}
