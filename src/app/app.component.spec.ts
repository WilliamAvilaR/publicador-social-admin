import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { AppComponent } from './app.component';
import { TranslationService } from './core/services/translation.service';
import { ThemeService } from './core/services/theme.service';
import { UserSettingsService } from './core/services/user-settings.service';
import { AuthService } from './core/services/auth.service';

describe('AppComponent', () => {
  const translation = { initializeLanguage: vi.fn() };
  const theme = { initializeTheme: vi.fn(), watchSystemPreference: vi.fn() };
  const userSettings = {
    getUserSettings: vi.fn(() => of({ data: { theme: 'light', language: 'es' } } as any)),
  };
  const auth = { isAuthenticated: vi.fn(() => false) };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated.mockReturnValue(false);
    userSettings.getUserSettings.mockReturnValue(
      of({ data: { theme: 'light', language: 'es' } } as any),
    );

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: TranslationService, useValue: translation },
        { provide: ThemeService, useValue: theme },
        { provide: UserSettingsService, useValue: userSettings },
        { provide: AuthService, useValue: auth },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea el componente', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('ngOnInit inicializa idioma, tema y escucha preferencias del sistema', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(translation.initializeLanguage).toHaveBeenCalled();
    expect(theme.initializeTheme).toHaveBeenCalledWith('light');
    expect(theme.watchSystemPreference).toHaveBeenCalled();
  });

  it('si hay sesión, carga tema desde preferencias', () => {
    auth.isAuthenticated.mockReturnValue(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(userSettings.getUserSettings).toHaveBeenCalled();
    expect(theme.initializeTheme).toHaveBeenCalledWith('light');
  });

  it('si hay sesión y getUserSettings falla, usa tema claro', () => {
    auth.isAuthenticated.mockReturnValue(true);
    userSettings.getUserSettings.mockReturnValue(throwError(() => new Error('red')));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(theme.initializeTheme).toHaveBeenCalledWith('light');
  });

  it('si hay sesión sin theme en preferencias, pasa undefined al inicializador', () => {
    auth.isAuthenticated.mockReturnValue(true);
    userSettings.getUserSettings.mockReturnValue(of({ data: { language: 'es' } } as any));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(theme.initializeTheme).toHaveBeenCalledWith(undefined);
  });
});
