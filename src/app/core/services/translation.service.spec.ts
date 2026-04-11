import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { TranslationService } from './translation.service';
import { UserSettingsService } from './user-settings.service';
import { AuthService } from './auth.service';

describe('TranslationService', () => {
  let translate: { setDefaultLang: ReturnType<typeof vi.fn>; use: ReturnType<typeof vi.fn>; currentLang: string; defaultLang: string };
  let userSettings: { getUserSettings: ReturnType<typeof vi.fn>; updateUserSettings: ReturnType<typeof vi.fn> };
  let auth: { isAuthenticated: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    translate = {
      setDefaultLang: vi.fn(),
      use: vi.fn(),
      currentLang: 'es',
      defaultLang: 'es',
    };
    userSettings = {
      getUserSettings: vi.fn(() =>
        of({ data: { language: 'en', theme: 'light' } } as any),
      ),
      updateUserSettings: vi.fn(() => of({ data: { language: 'en', theme: 'light' } } as any)),
    };
    auth = {
      isAuthenticated: vi.fn(() => false),
    };

    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        { provide: TranslateService, useValue: translate },
        { provide: UserSettingsService, useValue: userSettings },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('initializeLanguage sin auth usa español por defecto', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const svc = TestBed.inject(TranslationService);
    svc.initializeLanguage();
    expect(translate.setDefaultLang).toHaveBeenCalledWith('es');
    expect(translate.use).toHaveBeenCalledWith('es');
    expect(userSettings.getUserSettings).not.toHaveBeenCalled();
  });

  it('initializeLanguage con auth aplica idioma de preferencias', () => {
    auth.isAuthenticated.mockReturnValue(true);
    userSettings.getUserSettings.mockReturnValue(
      of({ data: { language: 'pt', theme: 'light' } } as any),
    );
    const svc = TestBed.inject(TranslationService);
    svc.initializeLanguage();
    expect(translate.use).toHaveBeenCalledWith('pt');
  });

  it('initializeLanguage ignora idioma no soportado', () => {
    auth.isAuthenticated.mockReturnValue(true);
    userSettings.getUserSettings.mockReturnValue(
      of({ data: { language: 'de', theme: 'light' } } as any),
    );
    const svc = TestBed.inject(TranslationService);
    svc.initializeLanguage();
    expect(translate.use).toHaveBeenCalledWith('es');
  });

  it('initializeLanguage ante error de API usa español', () => {
    auth.isAuthenticated.mockReturnValue(true);
    userSettings.getUserSettings.mockReturnValue(throwError(() => new Error('net')));
    const svc = TestBed.inject(TranslationService);
    svc.initializeLanguage();
    expect(translate.use).toHaveBeenCalledWith('es');
  });

  it('changeLanguage ignora idioma no soportado', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const svc = TestBed.inject(TranslationService);
    svc.changeLanguage('xx');
    expect(warn).toHaveBeenCalled();
    expect(userSettings.updateUserSettings).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('changeLanguage actualiza traducción y preferencias', () => {
    const svc = TestBed.inject(TranslationService);
    svc.changeLanguage('en');
    expect(translate.use).toHaveBeenCalledWith('en');
    expect(userSettings.updateUserSettings).toHaveBeenCalledWith({ language: 'en' });
  });

  it('getCurrentLanguage devuelve idioma activo', () => {
    translate.currentLang = 'pt';
    const svc = TestBed.inject(TranslationService);
    expect(svc.getCurrentLanguage()).toBe('pt');
  });

  it('changeLanguage registra error en consola si updateUserSettings falla', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    userSettings.updateUserSettings.mockReturnValue(throwError(() => new Error('persistencia')));
    const svc = TestBed.inject(TranslationService);
    svc.changeLanguage('en');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
