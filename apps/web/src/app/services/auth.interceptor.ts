import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../core/api-tokens';
import { AuthTokens } from '../core/models';

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

let refreshInFlight$: Observable<AuthTokens> | null = null;

function makeRefreshStream(auth: AuthService): Observable<AuthTokens> | null {
  const refresh$ = auth.refreshAccessToken();
  if (!refresh$) return null;
  return refresh$.pipe(
    tap((tokens) => auth.setTokens(tokens)),
    finalize(() => {
      refreshInFlight$ = null;
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );
}

function withAuthHeader(req: HttpRequest<unknown>, accessToken: string) {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);

  const isApiRequest = req.url.startsWith(apiBaseUrl);
  const isRefreshRequest = req.url.includes('/auth/refresh');
  const skipRefresh = req.context.get(SKIP_AUTH_REFRESH);

  if (!isApiRequest) {
    return next(req);
  }

  const token = auth.getAccessToken();
  const shouldAttachToken = !!token && !isRefreshRequest;
  const authReq = shouldAttachToken && token ? withAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (skipRefresh || isRefreshRequest || error.status !== 401) {
        return throwError(() => error);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = makeRefreshStream(auth);
      }
      if (!refreshInFlight$) {
        auth.clearTokens();
        return throwError(() => error);
      }

      return refreshInFlight$.pipe(
        switchMap((tokens: AuthTokens) => {
          const retryReq = withAuthHeader(authReq, tokens.accessToken).clone({
            context: authReq.context.set(SKIP_AUTH_REFRESH, true),
          });
          return next(retryReq);
        }),
        catchError((refreshError: HttpErrorResponse) => {
          auth.clearTokens();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
