import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-tokens';
import { GetMessagesQuery, Message, PaginatedMessages } from '../core/models';

export type MessageQueryOptions = GetMessagesQuery;

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL);

  getMessages(roomId: string, options?: MessageQueryOptions): Observable<PaginatedMessages> {
    const params = this.buildQueryParams(options);
    return this.http.get<PaginatedMessages>(
      `${this.apiBaseUrl}/rooms/${roomId}/messages`,
      { params }
    );
  }

  getLatest(roomId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiBaseUrl}/rooms/${roomId}/messages/latest`);
  }

  delete(roomId: string, messageId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `${this.apiBaseUrl}/rooms/${roomId}/messages/${messageId}`
    );
  }

  private buildQueryParams(options?: MessageQueryOptions): HttpParams {
    let params = new HttpParams();
    if (!options) return params;
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.cursor) params = params.set('cursor', options.cursor);
    if (options.follow) params = params.set('follow', options.follow);
    return params;
  }
}
