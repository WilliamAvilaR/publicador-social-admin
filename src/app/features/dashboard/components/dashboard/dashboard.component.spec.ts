import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../admin/admin/services/admin.service';

describe('DashboardComponent', () => {
  const adminOk = {
    data: {
      UserId: '1',
      Email: 'e@e.com',
      FullName: 'N',
      UserType: 'Internal',
      InternalRoles: ['PlatformSupport'],
    },
    success: true,
  };

  const routerEvents = new Subject();
  const router = {
    events: routerEvents.asObservable(),
    url: '/dashboard',
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({})),
    serializeUrl: vi.fn(() => ''),
  };
  const adminService = {
    getAdminInfo: vi.fn(() => of(adminOk)),
  };
  const auth = { getUser: vi.fn(() => null), logout: vi.fn() };
  const activatedRoute = {
    snapshot: { queryParams: {}, paramMap: { get: () => null } },
    queryParams: of({}),
    params: of({}),
  };

  beforeEach(() => {
    router.url = '/dashboard';
    adminService.getAdminInfo.mockImplementation(() => of(adminOk));
    auth.getUser.mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AdminService, useValue: adminService },
        { provide: AuthService, useValue: auth },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea el componente y carga admin', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(adminService.getAdminInfo).toHaveBeenCalled();
  });

  it('cabecera muestra email cuando FullName está vacío', () => {
    adminService.getAdminInfo.mockReturnValue(
      of({
        data: {
          UserId: '1',
          Email: 'solo@mail.com',
          FullName: '',
          UserType: 'Internal',
          InternalRoles: ['PlatformSupport'],
        },
        success: true,
      }),
    );
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const nameEl = fixture.nativeElement.querySelector('.user-name');
    expect(nameEl?.textContent?.trim()).toBe('solo@mail.com');
  });

  it('cabecera sin InternalRoles no muestra el bloque de roles', () => {
    adminService.getAdminInfo.mockReturnValue(
      of({
        data: {
          UserId: '1',
          Email: 'e@e.com',
          FullName: 'Nombre',
          UserType: 'Internal',
          InternalRoles: [],
        },
        success: true,
      }),
    );
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.user-roles')).toBeNull();
  });

  it('plansSubmenuMatchOptions usa paths y queryParams exact', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;
    expect(c.plansSubmenuMatchOptions.paths).toBe('exact');
    expect(c.plansSubmenuMatchOptions.queryParams).toBe('exact');
  });

  it('hasRole y flags de plataforma', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.user = {
      UserId: '1',
      Email: '',
      FullName: '',
      UserType: 'Internal',
      InternalRoles: ['PlatformOwner'],
    };
    expect(c.hasRole('PlatformOwner')).toBe(true);
    expect(c.isPlatformOwner()).toBe(true);
    expect(c.isPlatformSupport()).toBe(false);
  });

  it('hasRole sin usuario o sin rol devuelve false', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.user = null;
    expect(c.hasRole('PlatformOwner')).toBe(false);
    c.user = {
      UserId: '1',
      Email: 'a@a.com',
      FullName: 'A',
      UserType: 'Internal',
      InternalRoles: [],
    };
    expect(c.hasRole('PlatformOwner')).toBe(false);
  });

  it('isPlatformSupport es true con rol correspondiente', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.user = {
      UserId: '1',
      Email: 'a@a.com',
      FullName: 'A',
      UserType: 'Internal',
      InternalRoles: ['PlatformSupport'],
    };
    expect(c.isPlatformSupport()).toBe(true);
    expect(c.isPlatformOwner()).toBe(false);
  });

  it('loadAdminInfo con error mapea usuario desde AuthService', () => {
    adminService.getAdminInfo.mockReturnValue(throwError(() => new Error('API no disponible')));
    auth.getUser.mockReturnValue({
      idUsuario: 42,
      email: 'fb@test.com',
      fullName: 'Fallback',
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.user?.UserId).toBe('42');
    expect(c.user?.Email).toBe('fb@test.com');
    expect(c.user?.FullName).toBe('Fallback');
    expect(c.errorMessage).toContain('API no disponible');
    expect(c.isLoading).toBe(false);
  });

  it('loadAdminInfo error: fallback sin idUsuario usa UserId vacío', () => {
    adminService.getAdminInfo.mockReturnValue(throwError(() => new Error('x')));
    auth.getUser.mockReturnValue({
      email: 'solo@email.com',
      fullName: 'S',
    } as { idUsuario?: number; email: string; fullName: string });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.user?.UserId).toBe('');
  });

  it('loadAdminInfo con error sin fallback deja user sin datos de API', () => {
    adminService.getAdminInfo.mockReturnValue(throwError(() => new Error('fallo')));
    auth.getUser.mockReturnValue(null);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.user).toBeNull();
    expect(c.errorMessage).toContain('fallo');
    expect(c.isLoading).toBe(false);
  });

  it('logout() y botón Cerrar Sesión llaman auth.logout', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.logout();
    expect(auth.logout).toHaveBeenCalled();
    auth.logout.mockClear();
    const btn = fixture.nativeElement.querySelector('.btn-logout') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    btn!.click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('ngOnDestroy desuscribe el listener de rutas', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const sub = (fixture.componentInstance as unknown as { routerSubscription?: { unsubscribe: () => void } })
      .routerSubscription;
    expect(sub).toBeDefined();
    const unsub = vi.spyOn(sub!, 'unsubscribe');
    fixture.destroy();
    expect(unsub).toHaveBeenCalled();
  });

  it('NavigationEnd actualiza el título vía setupRouteListener', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    router.url = '/dashboard/metricas';
    routerEvents.next(new NavigationEnd(1, '/dashboard/metricas', '/dashboard/metricas'));
    expect(c.currentPageTitle).toBe('Métricas Globales');
  });

  it('updatePageTitle ajusta título para planes con subtab public', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    router.url = '/dashboard/planes?subtab=public';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Catálogo público de planes');
    expect(c.plansMenuOpen).toBe(true);
  });

  it('updatePageTitle planes sin subtab o admin usa administración', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;
    router.url = '/dashboard/planes';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Administración de planes');

    router.url = '/dashboard/planes?subtab=admin';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Administración de planes');
  });

  it('updatePageTitle rutas exactas del mapa', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;
    const cases: [string, string][] = [
      ['/dashboard', 'Inicio'],
      ['/dashboard/clientes', 'Gestión de Clientes'],
      ['/dashboard/planes/nuevo', 'Crear Nuevo Plan'],
      ['/dashboard/soporte', 'Soporte Técnico'],
      ['/dashboard/metricas', 'Métricas Globales'],
    ];
    for (const [url, title] of cases) {
      router.url = url;
      c.updatePageTitle();
      expect(c.currentPageTitle).toBe(title);
    }
  });

  it('updatePageTitle detalle de cliente y editar plan por ruta con id', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;

    router.url = '/dashboard/clientes/99';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Detalle de Cliente');
    expect(c.supportMenuOpen).toBe(false);

    router.url = '/dashboard/planes/7';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Editar Plan');
  });

  it('updatePageTitle ruta bajo /planes/ con /nuevo en path usa título del mapa base', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;
    router.url = '/dashboard/planes/nuevo/extra-segmento';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Gestión de Planes');
  });

  it('updatePageTitle ruta desconocida usa Inicio', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;
    router.url = '/dashboard/ruta-inexistente';
    c.updatePageTitle();
    expect(c.currentPageTitle).toBe('Inicio');
  });

  it('updatePageTitle abre acordeones de soporte y planes según URL', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const c = fixture.componentInstance;

    router.url = '/dashboard/soporte';
    c.updatePageTitle();
    expect(c.supportMenuOpen).toBe(true);

    router.url = '/dashboard/planes';
    c.updatePageTitle();
    expect(c.plansMenuOpen).toBe(true);
  });

  it('toggleSupportMenu y togglePlansMenu alternan estado', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.toggleSupportMenu();
    expect(c.supportMenuOpen).toBe(true);
    c.togglePlansMenu();
    expect(c.plansMenuOpen).toBe(true);
  });
});
