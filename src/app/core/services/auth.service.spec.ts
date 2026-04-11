import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
  UserData,
  UserProfileData,
} from '../models/auth.model';

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

/** JWT mínimo válido para pruebas de `exp` (firma ignorada). */
function minimalJwt(expUnix: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const payload = btoa(JSON.stringify({ exp: expUnix }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.x`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('HTTP', () => {
    it('login envía POST a /api/Token/login con el cuerpo indicado', () => {
      const credentials: LoginRequest = {
        email: 'a@b.com',
        password: 'secret',
      };
      const mockResponse: LoginResponse = {
        data: {
          token: 'jwt',
          idUsuario: 1,
          email: 'a@b.com',
          rol: 'Admin',
          fullName: 'Test User',
        },
        meta: emptyMeta,
      };

      service.login(credentials).subscribe((res) => {
        expect(res.data.token).toBe('jwt');
      });

      const req = httpMock.expectOne('/api/Token/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('login propaga error HTTP (4xx)', async () => {
      const credentials: LoginRequest = {
        email: 'a@b.com',
        password: 'wrong',
      };

      const pending = firstValueFrom(service.login(credentials));
      const req = httpMock.expectOne('/api/Token/login');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      await expect(pending).rejects.toMatchObject({ status: 401 });
    });

    it('refreshToken envía POST a /api/Token/refresh', () => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne('/api/Token/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({
        data: {
          token: 'new-jwt',
          idUsuario: 1,
          email: 'a@b.com',
          rol: 'Admin',
          fullName: 'Test',
        },
        meta: emptyMeta,
      });
    });

    it('getProfile envía GET a /api/me', () => {
      service.getProfile().subscribe();

      const req = httpMock.expectOne('/api/me');
      expect(req.request.method).toBe('GET');
      req.flush({
        data: {
          idUsuario: 1,
          email: 'a@b.com',
          rol: 'Admin',
          fullName: 'Test',
          firstName: 'T',
          lastName: 'U',
          telephone: '',
          dateBird: '1990-01-01',
          isActive: true,
          avatarUrl: '',
        },
        meta: emptyMeta,
      });
    });

    it('changePassword envía POST a /api/Account/change-password', () => {
      const body = {
        currentPassword: 'old',
        newPassword: 'new1',
        confirmNewPassword: 'new1',
      };
      service.changePassword(body).subscribe();

      const req = httpMock.expectOne('/api/Account/change-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ data: 'ok', meta: emptyMeta });
    });

    it('register envía POST a /api/Token/register', () => {
      const payload: RegisterRequest = {
        firstName: 'A',
        lastName: 'B',
        email: 'n@n.com',
        password: 'p',
        telephone: '1',
        rol: 'User',
      };
      const mock: RegisterResponse = {
        data: { idUsuario: 2, email: 'n@n.com', fullName: 'A B', rol: 'User' },
        meta: emptyMeta,
      };

      service.register(payload).subscribe((res) => {
        expect(res.data.idUsuario).toBe(2);
      });

      const req = httpMock.expectOne('/api/Token/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mock);
    });

    it('updateProfile envía PUT a /api/me con el cuerpo indicado', () => {
      const body: UpdateProfileRequest = {
        firstName: 'A',
        lastName: 'B',
        email: 'u@u.com',
        telephone: '99',
        dateBird: '1990-01-01',
      };
      service.updateProfile(body).subscribe();

      const req = httpMock.expectOne('/api/me');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({
        data: {
          idUsuario: 1,
          email: 'u@u.com',
          rol: 'R',
          fullName: 'A B',
          firstName: 'A',
          lastName: 'B',
          telephone: '99',
          dateBird: '1990-01-01',
          isActive: true,
          avatarUrl: '',
        },
        meta: emptyMeta,
      });
    });

    it('uploadAvatar envía POST a /api/me/avatar con FormData', () => {
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      service.uploadAvatar(file).subscribe();

      const req = httpMock.expectOne('/api/me/avatar');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);
      expect((req.request.body as FormData).get('file')).toBe(file);
      req.flush({ data: 'url', meta: emptyMeta });
    });

    it('deleteAvatar envía DELETE a /api/me/avatar', () => {
      service.deleteAvatar().subscribe();

      const req = httpMock.expectOne('/api/me/avatar');
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: 'ok', meta: emptyMeta });
    });
  });

  describe('localStorage', () => {
    it('setAuthData guarda token y usuario; getToken y getUser los devuelven', () => {
      service.setAuthData('tok', {
        token: 'tok',
        idUsuario: 5,
        email: 'u@test.com',
        rol: 'Admin',
        fullName: 'User',
      });

      expect(service.getToken()).toBe('tok');
      const user = service.getUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe('u@test.com');
    });

    it('setAuthData no guarda si faltan token o usuario', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.setAuthData('', {
        token: 'x',
        idUsuario: 1,
        email: 'e',
        rol: 'r',
        fullName: 'f',
      });
      expect(localStorage.length).toBe(0);

      err.mockRestore();
    });

    it('setAuthData no guarda si el usuario es falsy', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.setAuthData('valid-token', null as unknown as UserData);
      expect(localStorage.length).toBe(0);

      err.mockRestore();
    });

    it('updateUserData persiste el usuario en localStorage', () => {
      service.updateUserData({
        idUsuario: 3,
        email: 'p@p.com',
        rol: 'Admin',
        fullName: 'Full',
      });
      const raw = localStorage.getItem('user_data');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).email).toBe('p@p.com');
    });

    it('updateUserData no guarda si el usuario es falsy', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.updateUserData(null as unknown as UserProfileData);
      expect(localStorage.getItem('user_data')).toBeNull();

      err.mockRestore();
    });

    it('getToken devuelve null para valores inválidos almacenados', () => {
      localStorage.setItem('auth_token', 'undefined');
      expect(service.getToken()).toBeNull();
      localStorage.setItem('auth_token', 'null');
      expect(service.getToken()).toBeNull();
    });

    it('getUser devuelve null y limpia si user_data es undefined o null como string', () => {
      localStorage.setItem('user_data', 'undefined');
      expect(service.getUser()).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();

      localStorage.setItem('user_data', 'null');
      expect(service.getUser()).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
    });

    it('getUser devuelve null para cadena vacía o solo espacios', () => {
      localStorage.setItem('user_data', '');
      expect(service.getUser()).toBeNull();
      localStorage.setItem('user_data', '   ');
      expect(service.getUser()).toBeNull();
    });

    it('getUser devuelve null y elimina si el JSON no tiene email', () => {
      localStorage.setItem('user_data', JSON.stringify({ idUsuario: 1 }));
      expect(service.getUser()).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
    });

    it('getUser captura JSON inválido, limpia y registra error', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('user_data', '{corrupt');

      expect(service.getUser()).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect(err).toHaveBeenCalled();

      err.mockRestore();
    });

    it('isAuthenticated es true solo con token y usuario válidos', () => {
      expect(service.isAuthenticated()).toBe(false);
      service.setAuthData('t', {
        token: 't',
        idUsuario: 1,
        email: 'e@e.com',
        rol: 'R',
        fullName: 'F',
      });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('isAccessTokenExpired es true sin token', () => {
      expect(service.isAccessTokenExpired()).toBe(true);
    });

    it('isAccessTokenExpired es false con exp en el futuro', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('auth_token', minimalJwt(exp));
      expect(service.isAccessTokenExpired()).toBe(false);
    });

    it('isAccessTokenExpired es true con exp en el pasado', () => {
      localStorage.setItem('auth_token', minimalJwt(1_000_000_000));
      expect(service.isAccessTokenExpired()).toBe(true);
    });

    it('isAccessTokenExpired es false si el token no es JWT con exp', () => {
      localStorage.setItem('auth_token', 'opaque-string');
      expect(service.isAccessTokenExpired()).toBe(false);
    });

    it('logout elimina token y usuario', () => {
      service.setAuthData('t', {
        token: 't',
        idUsuario: 1,
        email: 'e@e.com',
        rol: 'R',
        fullName: 'F',
      });
      service.logout();
      expect(service.getToken()).toBeNull();
      expect(service.getUser()).toBeNull();
    });
  });
});
