import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Variables para manejar la renovación de token
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function retryWithToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  newToken: string
): Observable<HttpEvent<unknown>> {
  const isFormDataRetry = req.body instanceof FormData;
  const retryHeaders: { [key: string]: string } = {
    Authorization: `Bearer ${newToken}`,
  };
  if (!isFormDataRetry) {
    retryHeaders['Content-Type'] = 'application/json';
  }
  const retryRequest = req.clone({
    setHeaders: retryHeaders,
  });
  return next(retryRequest);
}

function refreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;

        authService.setAuthData(response.data.token, response.data);

        const newToken = response.data.token;
        refreshTokenSubject.next(newToken);

        return retryWithToken(req, next, newToken);
      }),
      catchError((refreshError) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.logout();

        if (!router.url.includes('/login')) {
          router.navigate(['/login'], {
            queryParams: { returnUrl: router.url },
          });
        }

        return throwError(() => refreshError);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter((t) => t !== null),
    take(1),
    switchMap((newToken) => retryWithToken(req, next, newToken!))
  );
}

/**
 * Interceptor HTTP que:
 * 1. Agrega automáticamente el token de autenticación a las peticiones protegidas
 * 2. Si el JWT ya expiró (según `exp`), renueva antes de enviar la petición (evita ráfagas de 401)
 * 3. Maneja errores 401 intentando renovar el token automáticamente
 * 4. Si la renovación falla, redirige al login
 *
 * Excluye las rutas públicas como /api/Token/login y /api/Token/register
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const publicRoutes = ['/api/Token/login', '/api/Token/register'];

  const isPublicRoute = publicRoutes.some((route) => req.url.includes(route));

  if (isPublicRoute) {
    return next(req);
  }

  if (req.url.startsWith('/api/')) {
    const token = authService.getToken();

    if (token) {
      const isFormData = req.body instanceof FormData;
      const headers: { [key: string]: string } = {
        Authorization: `Bearer ${token}`,
      };

      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const clonedRequest = req.clone({
        setHeaders: headers,
      });

      const isRefreshUrl = req.url.includes('/api/Token/refresh');

      // El refresh debe poder enviarse con access token caducado; no forzar renovación previa
      if (isRefreshUrl) {
        return next(clonedRequest).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isPublicRoute) {
              authService.logout();
              if (!router.url.includes('/login')) {
                router.navigate(['/login'], {
                  queryParams: { returnUrl: router.url },
                });
              }
              return throwError(() => error);
            }
            return throwError(() => error);
          })
        );
      }

      if (authService.isAccessTokenExpired()) {
        return refreshAndRetry(req, next, authService, router);
      }

      return next(clonedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 && !isPublicRoute) {
            return refreshAndRetry(req, next, authService, router);
          }

          return throwError(() => error);
        })
      );
    } else {
      if (!router.url.includes('/login')) {
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
    }
  }

  return next(req);
};

/** Reinicia el estado interno del interceptor (singleton). Usar solo en pruebas. */
export function resetAuthInterceptorForTests(): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
}
