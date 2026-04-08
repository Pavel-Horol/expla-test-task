import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-tokens';
import { AuthResponse, AuthTokens, User } from '../core/models';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const DEFAULT_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL);

  readonly user = signal<User | null>(null);
  readonly accessToken = signal<string | null>(this.readToken(ACCESS_TOKEN_KEY));
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  getAccessToken(): string | null {
    return this.readToken(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.readToken(REFRESH_TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getAccessToken();
  }

  setTokens(tokens: AuthTokens): void {
    this.writeToken(ACCESS_TOKEN_KEY, tokens.accessToken);
    this.writeToken(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.accessToken.set(tokens.accessToken);
  }

  clearTokens(): void {
    this.removeToken(ACCESS_TOKEN_KEY);
    this.removeToken(REFRESH_TOKEN_KEY);
    this.user.set(null);
    this.accessToken.set(null);
  }

  register(email: string, username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/register`, {
      email,
      username,
      password,
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, {
      email,
      password,
    });
  }

  refresh(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.apiBaseUrl}/auth/refresh`, {
      refreshToken,
    });
  }

  profile(): Observable<User> {
    return this.http.get<User>(`${this.apiBaseUrl}/auth/profile`);
  }

  refreshAccessToken(): Observable<AuthTokens> | null {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    return this.refresh(refreshToken);
  }

  startAutoRefresh(intervalMs = DEFAULT_REFRESH_INTERVAL_MS): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      const refresh$ = this.refreshAccessToken();
      if (!refresh$) return;
      refresh$.subscribe({
        next: (tokens) => this.setTokens(tokens),
      });
    }, intervalMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private readToken(key: string): string | null {
    return localStorage.getItem(key);
  }

  private writeToken(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  private removeToken(key: string): void {
    localStorage.removeItem(key);
  }
}
