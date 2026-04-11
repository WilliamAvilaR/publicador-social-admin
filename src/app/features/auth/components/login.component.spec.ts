import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  const router = { navigate: vi.fn() };
  const auth = {
    isAuthenticated: vi.fn(() => false),
    login: vi.fn(() =>
      of({
        data: {
          token: 't',
          idUsuario: 1,
          email: 'a@a.com',
          rol: 'A',
          fullName: 'A',
        },
        meta: {} as any,
      }),
    ),
    setAuthData: vi.fn(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    vi.mocked(auth.login).mockImplementation(() =>
      of({
        data: {
          token: 't',
          idUsuario: 1,
          email: 'a@a.com',
          rol: 'A',
          fullName: 'A',
        },
        meta: {} as any,
      }),
    );
    vi.mocked(router.navigate).mockClear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea el componente', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('redirige al dashboard si ya está autenticado', () => {
    auth.isAuthenticated.mockReturnValueOnce(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('togglePassword alterna visibilidad', () => {
    const c = TestBed.createComponent(LoginComponent).componentInstance;
    expect(c.showPassword).toBe(false);
    c.togglePassword();
    expect(c.showPassword).toBe(true);
  });

  it('el botón de mostrar/ocultar refleja el estado en la plantilla', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.toggle-password') as HTMLButtonElement;
    expect(btn.textContent).toContain('Mostrar');
    btn.click();
    fixture.detectChanges();
    expect(btn.textContent).toContain('Ocultar');
  });

  it('onSubmit con formulario inválido no llama login', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.onSubmit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('onSubmit con credenciales válidas guarda sesión y navega', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.loginForm.patchValue({ email: 'a@b.com', password: 'secret' });
    c.onSubmit();
    expect(auth.login).toHaveBeenCalled();
    expect(auth.setAuthData).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('onSubmit muestra mensaje ante error HTTP', () => {
    auth.login.mockReturnValueOnce(
      throwError(() => ({ error: { detail: 'Bad' } })),
    );
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.loginForm.patchValue({ email: 'a@b.com', password: 'secret' });
    c.onSubmit();
    expect(c.errorMessage).toBe('Bad');
  });

  it('onSubmit usa title del error si no hay detail', () => {
    auth.login.mockReturnValueOnce(
      throwError(() => ({ error: { title: 'Solo título' } })),
    );
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.loginForm.patchValue({ email: 'a@b.com', password: 'secret' });
    c.onSubmit();
    expect(c.errorMessage).toBe('Solo título');
  });

  it('onSubmit usa mensaje por defecto si no hay detail ni title', () => {
    auth.login.mockReturnValueOnce(throwError(() => ({ error: {} })));
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.loginForm.patchValue({ email: 'a@b.com', password: 'secret' });
    c.onSubmit();
    expect(c.errorMessage).toBe('Error al iniciar sesión');
  });

  it('tras login navega a returnUrl del query string', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParams: { returnUrl: '/panel/xyz' } } },
    });
    const fixture = TestBed.createComponent(LoginComponent);
    const c = fixture.componentInstance;
    c.loginForm.patchValue({ email: 'a@b.com', password: 'secret' });
    c.onSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/panel/xyz']);
  });
});
