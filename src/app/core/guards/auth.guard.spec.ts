import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: vi.fn() } },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            url: '/current',
          },
        },
      ],
    });
  });

  it('devuelve true si el usuario está autenticado', () => {
    const auth = TestBed.inject(AuthService) as AuthService & {
      isAuthenticated: ReturnType<typeof vi.fn>;
    };
    auth.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );

    expect(result).toBe(true);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('devuelve false y navega a login con returnUrl', () => {
    const auth = TestBed.inject(AuthService) as AuthService & {
      isAuthenticated: ReturnType<typeof vi.fn>;
    };
    const router = TestBed.inject(Router) as Router & {
      navigate: ReturnType<typeof vi.fn>;
    };
    auth.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard/x' } as never),
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard/x' },
    });
  });
});
