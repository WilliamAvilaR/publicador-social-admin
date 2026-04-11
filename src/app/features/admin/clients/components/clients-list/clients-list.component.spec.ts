import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ClientsListComponent } from './clients-list.component';
import { TenantsService } from '../../services/tenants.service';
import { PlansService } from '../../../plans/services/plans.service';

describe('ClientsListComponent', () => {
  const queryParams$ = new BehaviorSubject<Record<string, string>>({});
  const router = {
    events: of(),
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({})),
    serializeUrl: vi.fn(() => ''),
  };
  const defaultTenantsResponse = {
    data: { Tenants: [], Total: 0, TotalPages: 0, Page: 1 },
    meta: { totalPages: 0, currentPage: 1 },
  };
  const tenantsService = {
    getTenants: vi.fn(() => of(defaultTenantsResponse as any)),
    getTenantStatuses: vi.fn(() =>
      of({ data: { Statuses: [{ Value: 'active', Label: 'Activo' }] } } as any),
    ),
  };
  const plansService = {
    getPlans: vi.fn(() => of({ data: { Plans: [] } } as any)),
  };

  afterEach(() => {
    vi.mocked(tenantsService.getTenants).mockReset();
    vi.mocked(tenantsService.getTenants).mockImplementation(() =>
      of(defaultTenantsResponse as any),
    );
    vi.mocked(tenantsService.getTenantStatuses).mockReset();
    vi.mocked(tenantsService.getTenantStatuses).mockImplementation(() =>
      of({ data: { Statuses: [{ Value: 'active', Label: 'Activo' }] } } as any),
    );
    vi.mocked(plansService.getPlans).mockReset();
    vi.mocked(plansService.getPlans).mockImplementation(() =>
      of({ data: { Plans: [] } } as any),
    );
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    queryParams$.next({});
    TestBed.configureTestingModule({
      imports: [ClientsListComponent],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: PlansService, useValue: plansService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea el componente y dispara cargas iniciales', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(tenantsService.getTenantStatuses).toHaveBeenCalled();
    expect(plansService.getPlans).toHaveBeenCalled();
    expect(tenantsService.getTenants).toHaveBeenCalled();
  });

  it('trackByClientId usa tenantId o índice', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    expect(c.trackByClientId(0, { tenantId: 5 } as any)).toBe(5);
    expect(c.trackByClientId(2, {} as any)).toBe(2);
  });

  it('applyFilters reinicia página, navega con query params y vuelve a cargar tenants', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    vi.mocked(tenantsService.getTenants).mockClear();
    const c = fixture.componentInstance;
    c.searchTerm = 'acme';
    c.applyFilters();
    expect(c.currentPage).toBe(1);
    expect(router.navigate).toHaveBeenCalled();
    expect(tenantsService.getTenants).toHaveBeenCalled();
  });

  it('getters de conteo por estado devuelven 0 sin clientes', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    expect(c.activeClients).toBe(0);
    expect(c.trialClients).toBe(0);
    expect(c.suspendedClients).toBe(0);
    expect(c.inactiveClients).toBe(0);
  });

  it('loadTenants ante error HTTP guarda mensaje', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    vi.mocked(tenantsService.getTenants).mockReturnValueOnce(
      throwError(() => new Error('sin red')),
    );
    fixture.componentInstance.loadTenants();
    expect(fixture.componentInstance.errorMessage).toContain('sin red');
    expect(fixture.componentInstance.isLoading).toBe(false);
    errSpy.mockRestore();
  });

  it('getStatusClass, getStatusText, getPlanClass y getPlanText', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.availableStatuses = [{ value: 'active', label: 'Activo' }];
    c.availablePlans = [
      {
        PlanId: 1,
        Code: 'pro',
        Name: 'Pro Plan',
        Description: '',
        IsDefault: false,
        IsPaid: true,
        IsActive: true,
        Price: 0,
      },
    ];
    expect(c.getStatusClass(undefined)).toBe('');
    expect(c.getStatusClass('active')).toBe('status-active');
    expect(c.getStatusClass('SUSPENDED')).toBe('status-suspended');
    expect(c.getStatusText(undefined)).toBe('-');
    expect(c.getStatusText('active')).toBe('Activo');
    expect(c.getStatusText('otro')).toBe('otro');
    expect(c.getPlanClass(undefined)).toBe('');
    expect(c.getPlanClass('pro')).toBe('plan-pro');
    expect(c.getPlanText(undefined)).toBe('-');
    expect(c.getPlanText('pro')).toBe('Pro Plan');
    expect(c.getPlanText('x')).toBe('x');
  });

  it('getStartIndex y getEndIndex con y sin resultados', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.totalCount = 0;
    expect(c.getStartIndex()).toBe(0);
    c.totalCount = 25;
    c.currentPage = 2;
    c.pageSize = 10;
    expect(c.getStartIndex()).toBe(11);
    expect(c.getEndIndex()).toBe(20);
    c.currentPage = 3;
    expect(c.getEndIndex()).toBe(25);
  });

  it('getPageNumbers con pocas y muchas páginas', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.totalPages = 3;
    c.currentPage = 2;
    expect(c.getPageNumbers()).toEqual([1, 2, 3]);
    c.totalPages = 20;
    c.currentPage = 10;
    const nums = c.getPageNumbers();
    expect(nums[0]).toBe(1);
    expect(nums[nums.length - 1]).toBe(20);
    expect(nums).toContain(-1);
  });

  it('totalClients y getters por estado con datos mapeados', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.clients = [
      { tenantId: 1, name: 'A', status: 'active', isActive: true } as any,
      { tenantId: 2, name: 'B', status: 'trial', isActive: true } as any,
      { tenantId: 3, name: 'C', status: 'suspended', isActive: true } as any,
      { tenantId: 4, name: 'D', status: 'inactive', isActive: false } as any,
    ];
    expect(c.totalClients).toBe(4);
    expect(c.activeClients).toBe(1);
    expect(c.trialClients).toBe(1);
    expect(c.suspendedClients).toBe(1);
    expect(c.inactiveClients).toBe(1);
  });

  it('activeClients cuenta isActive cuando status vacío', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.clients = [{ tenantId: 1, name: 'A', status: '', isActive: true } as any];
    expect(c.activeClients).toBe(1);
  });

  it('clearFilters limpia filtros y vuelve a cargar', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.searchTerm = 'x';
    c.selectedStatus = 'active';
    c.selectedPlanCode = 'pro';
    vi.mocked(tenantsService.getTenants).mockClear();
    c.clearFilters();
    expect(c.searchTerm).toBe('');
    expect(c.selectedStatus).toBe('');
    expect(c.selectedPlanCode).toBe('');
    expect(router.navigate).toHaveBeenCalled();
    expect(tenantsService.getTenants).toHaveBeenCalled();
  });

  it('changePage y onPageSizeChange actualizan estado y recargan', () => {
    vi.mocked(tenantsService.getTenants).mockImplementation((params: any) =>
      of({
        data: {
          Tenants: [],
          Total: 100,
          totalPages: 5,
          page: params.page,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.totalPages = 5;
    vi.mocked(tenantsService.getTenants).mockClear();
    c.changePage(3);
    expect(c.currentPage).toBe(3);
    expect(tenantsService.getTenants).toHaveBeenCalled();
    vi.mocked(tenantsService.getTenants).mockClear();
    c.onPageSizeChange();
    expect(c.currentPage).toBe(1);
    expect(tenantsService.getTenants).toHaveBeenCalled();
  });

  it('changePage ignora página fuera de rango', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.totalPages = 2;
    c.currentPage = 1;
    vi.mocked(tenantsService.getTenants).mockClear();
    c.changePage(99);
    expect(c.currentPage).toBe(1);
  });

  it('queryParams restaura página y filtros', () => {
    vi.mocked(tenantsService.getTenants).mockImplementation(() =>
      of({
        data: { Tenants: [], Total: 0 },
      } as any),
    );
    queryParams$.next({
      page: '2',
      pageSize: '20',
      search: 'hola',
      status: 'trial',
      planCode: 'free',
    });
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.currentPage).toBe(2);
    expect(c.pageSize).toBe(20);
    expect(c.searchTerm).toBe('hola');
    expect(c.selectedStatus).toBe('trial');
    expect(c.selectedPlanCode).toBe('free');
  });

  it('queryParams inválidos usan valores por defecto', () => {
    queryParams$.next({
      page: '0',
      pageSize: '-1',
    });
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.currentPage).toBe(1);
    expect(c.pageSize).toBe(10);
  });

  it('loadStatuses ante error vacía la lista y apaga loading', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(tenantsService.getTenantStatuses).mockReturnValueOnce(
      throwError(() => new Error('statuses')),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.availableStatuses).toEqual([]);
    expect(fixture.componentInstance.isLoadingStatuses).toBe(false);
    errSpy.mockRestore();
  });

  it('loadStatuses normaliza statuses en camelCase', () => {
    vi.mocked(tenantsService.getTenantStatuses).mockReturnValueOnce(
      of({
        data: {
          statuses: [{ value: 'trial', label: 'Trial' }],
        },
      } as any),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.availableStatuses).toEqual([{ value: 'trial', label: 'Trial' }]);
  });

  it('loadPlans mapea planes en camelCase y error solo apaga loading', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(plansService.getPlans).mockReturnValueOnce(
      of({
        data: {
          plans: [
            {
              planId: 1,
              code: 'free',
              name: 'Gratis',
              description: '',
              isDefault: true,
              isPaid: false,
              isActive: true,
              price: null,
            },
          ],
        },
      } as any),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.availablePlans[0].Code).toBe('free');
    expect(fixture.componentInstance.isLoadingPlans).toBe(false);

    vi.mocked(plansService.getPlans).mockReturnValueOnce(throwError(() => new Error('planes')));
    const f2 = TestBed.createComponent(ClientsListComponent);
    f2.detectChanges();
    expect(f2.componentInstance.isLoadingPlans).toBe(false);
    errSpy.mockRestore();
  });

  it('loadTenants sin meta pero con totalPages en data actualiza página', () => {
    vi.mocked(tenantsService.getTenants).mockReturnValueOnce(
      of({
        data: {
          tenants: [{ TenantId: 1, Name: 'N', PlanCode: 'pro', IsActive: true, Status: 'active' }],
          total: 1,
          totalPages: 3,
          page: 2,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.clients.length).toBe(1);
    expect(c.totalPages).toBe(3);
    expect(c.currentPage).toBe(2);
  });

  it('loadTenants sin meta ni totalPages calcula páginas con Total', () => {
    vi.mocked(tenantsService.getTenants).mockReturnValueOnce(
      of({
        data: {
          Tenants: [],
          Total: 25,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.totalCount).toBe(25);
    expect(c.totalPages).toBe(3);
  });

  it('loadTenants error sin message usa texto por defecto', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(tenantsService.getTenants).mockReturnValueOnce(throwError(() => new Error('')));
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('Error al cargar los clientes');
    errSpy.mockRestore();
  });

  it('getPageNumbers cerca del inicio y del final', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.totalPages = 20;
    c.currentPage = 3;
    let nums = c.getPageNumbers();
    expect(nums).toContain(-1);
    c.currentPage = 18;
    nums = c.getPageNumbers();
    expect(nums).toContain(-1);
    expect(nums[nums.length - 1]).toBe(20);
  });

  it('getPlanText con plan sin Code cae al código', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    const c = fixture.componentInstance;
    c.availablePlans = [
      {
        PlanId: 1,
        Code: undefined as unknown as string,
        Name: 'X',
        Description: '',
        IsDefault: false,
        IsPaid: false,
        IsActive: true,
        Price: null,
      },
    ];
    expect(c.getPlanText('manual')).toBe('manual');
  });

  it('clearFilters mantiene pageSize distinto de 10 en la navegación', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.pageSize = 25;
    c.searchTerm = 'z';
    vi.mocked(router.navigate).mockClear();
    c.clearFilters();
    expect(router.navigate).toHaveBeenCalled();
    const arg = vi.mocked(router.navigate).mock.calls[0][1] as { queryParams: Record<string, unknown> };
    expect(arg.queryParams.pageSize).toBe(25);
  });

  it('applyFilters reinicia a página 1 y pasa búsqueda en queryParams', () => {
    const fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.currentPage = 3;
    c.searchTerm = '  q  ';
    vi.mocked(router.navigate).mockClear();
    c.applyFilters();
    expect(c.currentPage).toBe(1);
    const arg = vi.mocked(router.navigate).mock.calls[0][1] as { queryParams: Record<string, unknown> };
    expect(arg.queryParams.page).toBeNull();
    expect(arg.queryParams.search).toBe('q');
  });
});
