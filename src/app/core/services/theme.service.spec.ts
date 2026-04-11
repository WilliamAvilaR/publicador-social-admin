import { TestBed } from '@angular/core/testing';
import { Renderer2, RendererFactory2 } from '@angular/core';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const rendererStub = {
    removeClass: vi.fn(),
    removeAttribute: vi.fn(),
    addClass: vi.fn(),
    setAttribute: vi.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        {
          provide: RendererFactory2,
          useValue: {
            createRenderer: () => rendererStub as unknown as Renderer2,
          },
        },
      ],
    });
    vi.clearAllMocks();
  });

  it('initializeTheme aplica light por defecto si valor inválido', () => {
    const svc = TestBed.inject(ThemeService);
    svc.initializeTheme('invalid');
    expect(svc.getCurrentTheme()).toBe('light');
  });

  it('applyTheme dark añade clases y data-theme', () => {
    const svc = TestBed.inject(ThemeService);
    svc.applyTheme('dark');
    expect(svc.getCurrentTheme()).toBe('dark');
    expect(rendererStub.addClass).toHaveBeenCalled();
    expect(rendererStub.setAttribute).toHaveBeenCalled();
  });

  it('getEffectiveTheme resuelve auto según matchMedia', () => {
    const mql = { matches: true, addEventListener: vi.fn(), addListener: vi.fn() };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql as unknown as MediaQueryList),
    );
    const svc = TestBed.inject(ThemeService);
    expect(svc.getEffectiveTheme('auto')).toBe('dark');
    vi.unstubAllGlobals();
  });

  it('watchSystemPreference registra listener si addEventListener existe', () => {
    const mql = { matches: false, addEventListener: vi.fn(), addListener: vi.fn() };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql as unknown as MediaQueryList),
    );
    const svc = TestBed.inject(ThemeService);
    svc.watchSystemPreference();
    expect(mql.addEventListener).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('watchSystemPreference usa addListener si no hay addEventListener', () => {
    const mql = { matches: false, addListener: vi.fn() };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql as unknown as MediaQueryList),
    );
    const svc = TestBed.inject(ThemeService);
    svc.watchSystemPreference();
    expect(mql.addListener).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('callback change (addEventListener) reaplica tema cuando el actual es auto', () => {
    let onPreferDarkChange: () => void = () => {};
    const mql = {
      matches: false,
      addEventListener: vi.fn((event: string, fn: () => void) => {
        if (event === 'change') onPreferDarkChange = fn;
      }),
      addListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => mql as unknown as MediaQueryList));
    const svc = TestBed.inject(ThemeService);
    vi.clearAllMocks();
    svc.applyTheme('auto');
    svc.watchSystemPreference();
    onPreferDarkChange();
    expect(rendererStub.addClass).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('callback addListener reaplica tema cuando el actual es auto', () => {
    let onLegacyChange: () => void = () => {};
    const mql = {
      matches: false,
      addListener: vi.fn((fn: () => void) => {
        onLegacyChange = fn;
      }),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => mql as unknown as MediaQueryList));
    const svc = TestBed.inject(ThemeService);
    vi.clearAllMocks();
    svc.applyTheme('auto');
    svc.watchSystemPreference();
    onLegacyChange();
    expect(rendererStub.addClass).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
