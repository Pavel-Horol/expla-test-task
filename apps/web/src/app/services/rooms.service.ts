import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-tokens';
import { CreateRoomRequest, Room } from '../core/models';

export type RoomsListParams = {
  online?: boolean;
};

export type CreateRoomPayload = CreateRoomRequest;

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private http = inject(HttpClient);
  private apiBaseUrl = inject(API_BASE_URL);

  list(params?: RoomsListParams): Observable<Room[]> {
    const httpParams = params?.online ? new HttpParams().set('online', 'true') : undefined;
    return this.http.get<Room[]>(`${this.apiBaseUrl}/rooms`, { params: httpParams });
  }

  create(payload: CreateRoomPayload): Observable<Room> {
    return this.http.post<Room>(`${this.apiBaseUrl}/rooms`, payload);
  }

  getById(roomId: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiBaseUrl}/rooms/${roomId}`);
  }

  addUser(roomId: string, userId: string): Observable<Room> {
    return this.http.post<Room>(`${this.apiBaseUrl}/rooms/${roomId}/users`, {
      userId,
    });
  }

  leave(roomId: string): Observable<{ left: boolean }> {
    return this.http.delete<{ left: boolean }>(
      `${this.apiBaseUrl}/rooms/${roomId}/leave`
    );
  }
}
