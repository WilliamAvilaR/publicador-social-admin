import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { authInterceptor, resetAuthInterceptorForTests } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

const emptyMeta = {
  totalCount: 0,
  pageSize: 10,
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviusPage: false,
  nextPageUrl: '',
  previusPageUrl: '',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authMock: {
    getToken: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
    setAuthData: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let routerMock: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    resetAuthInterceptorForTests();
    authMock = {
      getToken: vi.fn(() => 'jwt-1'),
      refreshToken: vi.fn(),
      setAuthData: vi.fn(),
      logout: vi.fn(),
    };
    routerMock = { url: '/app', navigate: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('añade Authorization y Content-Type JSON a peticiones /api/ con token', async () => {
    const done = firstValueFrom(http.get('/api/protected'));
    const req = httpMock.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-1');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({});
    await done;
  });

  it('no añade Content-Type en cuerpo FormData', async () => {
    const fd = new FormData();
    fd.append('f', 'x');
    const done = firstValueFrom(http.post('/api/upload', fd));
    const req = httpMock.expectOne('/api/upload');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-1');
    expect(req.request.headers.get('Content-Type')).toBeNull();
    req.flush({});
    await done;
  });

  it('no modifica rutas públicas login/register', async () => {
    const done = firstValueFrom(http.post('/api/Token/login', { a: 1 }));
    const req = httpMock.expectOne('/api/Token/login');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await done;
  });

  it('sin token no clona pero sigue la petición', async () => {
    authMock.getToken.mockReturnValue(null);
    const done = firstValueFrom(http.get('/api/x'));
    const req = httpMock.expectOne('/api/x');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await done;
    expect(routerMock.navigate).toHaveBeenCalled();
  });

  it('401 en /api/Token/refresh dispara logout y navegación', async () => {
    authMock.getToken.mockReturnValue('jwt-1');
    const pending = firstValueFrom(http.get('/api/Token/refresh'));

    const req = httpMock.expectOne('/api/Token/refresh');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(pending).rejects.toBeDefined();
    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalled();
  });

  it('401 en /api/Token/refresh en ruta login solo hace logout sin navegar', async () => {
    authMock.getToken.mockReturnValue('jwt-1');
    routerMock.url = '/login';
    const pending = firstValueFrom(http.get('/api/Token/refresh'));

    const req = httpMock.expectOne('/api/Token/refresh');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(pending).rejects.toBeDefined();
    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('no añade token a /api/Token/register', async () => {
    const done = firstValueFrom(http.post('/api/Token/register', { email: 'a@b.com' }));
    const req = httpMock.expectOne('/api/Token/register');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await done;
  });

  it('rutas que no son /api/ pasan sin Authorization ni navegación', async () => {
    const done = firstValueFrom(http.get('/assets/config.json'));
    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await done;
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('sin token no navega si ya está en login', async () => {
    authMock.getToken.mockReturnValue(null);
    routerMock.url = '/login';
    const done = firstValueFrom(http.get('/api/sin-token'));
    const req = httpMock.expectOne('/api/sin-token');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await done;
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('401 en API protegida renueva token y reintenta con el nuevo Bearer', async () => {
    const refreshPayload = {
      data: {
        token: 'jwt-2',
        idUsuario: 1,
        email: 'a@b.com',
        rol: 'user',
        fullName: 'Test',
      },
      meta: emptyMeta,
    };
    authMock.refreshToken.mockReturnValue(of(refreshPayload));

    const pending = firstValueFrom(http.get('/api/resources'));
    const first = httpMock.expectOne('/api/resources');
    expect(first.request.headers.get('Authorization')).toBe('Bearer jwt-1');
    first.flush(null, { status: 401, statusText: 'Unauthorized' });

    const second = httpMock.expectOne('/api/resources');
    expect(second.request.headers.get('Authorization')).toBe('Bearer jwt-2');
    second.flush({ items: [] });
    await pending;

    expect(authMock.refreshToken).toHaveBeenCalled();
    expect(authMock.setAuthData).toHaveBeenCalledWith('jwt-2', refreshPayload.data);
  });

  it('401 en API protegida con refresh fallido hace logout y navega', async () => {
    authMock.refreshToken.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    const pending = firstValueFrom(http.get('/api/resources'));
    const first = httpMock.expectOne('/api/resources');
    first.flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(pending).rejects.toBeDefined();
    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalled();
  });

  it('401 en API protegida con refresh fallido en /login hace logout sin navegar', async () => {
    routerMock.url = '/login';
    authMock.refreshToken.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    const pending = firstValueFrom(http.get('/api/resources'));
    const first = httpMock.expectOne('/api/resources');
    first.flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(pending).rejects.toBeDefined();
    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('401 con FormData reintenta sin Content-Type tras refresh', async () => {
    const refreshPayload = {
      data: {
        token: 'jwt-fd',
        idUsuario: 1,
        email: 'a@b.com',
        rol: 'user',
        fullName: 'Test',
      },
      meta: emptyMeta,
    };
    authMock.refreshToken.mockReturnValue(of(refreshPayload));

    const fd = new FormData();
    fd.append('file', 'x');
    const pending = firstValueFrom(http.post('/api/upload', fd));
    const first = httpMock.expectOne('/api/upload');
    expect(first.request.headers.get('Content-Type')).toBeNull();
    first.flush(null, { status: 401, statusText: 'Unauthorized' });

    const second = httpMock.expectOne('/api/upload');
    expect(second.request.headers.get('Authorization')).toBe('Bearer jwt-fd');
    expect(second.request.headers.get('Content-Type')).toBeNull();
    second.flush({});
    await pending;
  });

  it('error distinto de 401 no intenta refresh', async () => {
    const pending = firstValueFrom(http.get('/api/resources'));
    const first = httpMock.expectOne('/api/resources');
    first.flush(null, { status: 503, statusText: 'Unavailable' });
    await expect(pending).rejects.toMatchObject({ status: 503 });
    expect(authMock.refreshToken).not.toHaveBeenCalled();
  });

  it('segundo 401 mientras refresh pendiente espera al token y reintenta ambas peticiones', async () => {
    const refreshPayload = {
      data: {
        token: 'jwt-concurrent',
        idUsuario: 1,
        email: 'a@b.com',
        rol: 'user',
        fullName: 'Test',
      },
      meta: emptyMeta,
    };

    let refreshSubscriber: {
      next: (v: typeof refreshPayload) => void;
      complete: () => void;
    };
    authMock.refreshToken.mockImplementation(
      () =>
        new Observable((subscriber) => {
          refreshSubscriber = subscriber as typeof refreshSubscriber;
        }),
    );

    const p1 = firstValueFrom(http.get('/api/concurrent-a'));
    const r1 = httpMock.expectOne('/api/concurrent-a');
    r1.flush(null, { status: 401, statusText: 'Unauthorized' });

    const p2 = firstValueFrom(http.get('/api/concurrent-b'));
    const r2 = httpMock.expectOne('/api/concurrent-b');
    r2.flush(null, { status: 401, statusText: 'Unauthorized' });

    refreshSubscriber!.next(refreshPayload);
    refreshSubscriber!.complete();

    const retryA = httpMock.expectOne('/api/concurrent-a');
    const retryB = httpMock.expectOne('/api/concurrent-b');
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer jwt-concurrent');
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer jwt-concurrent');
    retryA.flush({ ok: true });
    retryB.flush({ ok: true });

    await Promise.all([p1, p2]);
    expect(authMock.setAuthData).toHaveBeenCalledWith('jwt-concurrent', refreshPayload.data);
  });
});
