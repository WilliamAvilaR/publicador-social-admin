import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ClientDetailComponent } from './client-detail.component';
import { TenantsService } from '../../services/tenants.service';
import { PlansService } from '../../../plans/services/plans.service';

describe('ClientDetailComponent', () => {
  const location = { back: vi.fn() };

  const tenantsService = {
    getTenantStatuses: vi.fn(),
    getTenantById: vi.fn(),
    updateTenantStatus: vi.fn(),
    updateTenantPlan: vi.fn(),
  };

  const plansService = {
    getPlans: vi.fn(),
  };

  const defaultTenantData = {
    TenantId: 1,
    Name: 'Acme',
    Status: 'active',
    PlanCode: 'pro',
    IsActive: true,
    Users: [] as unknown[],
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    tenantsService.getTenantStatuses.mockReturnValue(
      of({ data: { Statuses: [{ Value: 'active', Label: 'Activo' }] } } as any),
    );
    tenantsService.getTenantById.mockReturnValue(of({ data: defaultTenantData } as any));
    tenantsService.updateTenantStatus.mockReturnValue(of({ data: { Status: 'suspended' } } as any));
    tenantsService.updateTenantPlan.mockReturnValue(of({ data: {} } as any));
    plansService.getPlans.mockReturnValue(of({ data: { Plans: [] } } as any));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupWithId(id: string | null) {
    TestBed.resetTestingModule();
    const paramMap = {
      get: (key: string) => (key === 'id' ? id : null),
    };
    TestBed.configureTestingModule({
      imports: [ClientDetailComponent],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: PlansService, useValue: plansService },
        { provide: Location, useValue: location },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap } },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  }

  it('muestra error si no hay id válido', () => {
    setupWithId(null);
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('no válido');
  });

  it('carga detalle cuando hay id', () => {
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(tenantsService.getTenantById).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.client?.name).toBe('Acme');
  });

  it('goBack llama a Location.back', () => {
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.componentInstance.goBack();
    expect(location.back).toHaveBeenCalled();
  });

  it('loadStatuses normaliza statuses en camelCase y valores a minúsculas', () => {
    tenantsService.getTenantStatuses.mockReturnValue(
      of({
        data: {
          statuses: [{ value: 'SUSPENDED', label: 'Suspendido' }],
        },
      } as any),
    );
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.availableStatuses).toEqual([{ value: 'suspended', label: 'Suspendido' }]);
    expect(c.isLoadingStatuses).toBe(false);
  });

  it('loadStatuses ante error usa lista por defecto', () => {
    tenantsService.getTenantStatuses.mockReturnValue(throwError(() => new Error('red')));
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.availableStatuses.length).toBe(4);
    expect(fixture.componentInstance.isLoadingStatuses).toBe(false);
  });

  it('loadPlans mapea planes en camelCase', () => {
    plansService.getPlans.mockReturnValue(
      of({
        data: {
          plans: [
            {
              planId: 2,
              code: 'free',
              name: 'Free',
              description: 'd',
              isDefault: true,
              isPaid: false,
              isActive: true,
              price: 0,
            },
          ],
        },
      } as any),
    );
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const p = fixture.componentInstance.availablePlans[0];
    expect(p.PlanId).toBe(2);
    expect(p.Code).toBe('free');
    expect(p.Name).toBe('Free');
    expect(fixture.componentInstance.isLoadingPlans).toBe(false);
  });

  it('loadPlans ante error solo apaga loading', () => {
    plansService.getPlans.mockReturnValue(throwError(() => new Error('planes')));
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoadingPlans).toBe(false);
  });

  it('loadTenantDetail ante error guarda mensaje', () => {
    tenantsService.getTenantById.mockReturnValue(throwError(() => new Error('no existe')));
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.errorMessage).toContain('no existe');
    expect(c.isLoading).toBe(false);
  });

  it('mapTenantDetail: sin Status usa SuspendedAt / IsActive / inactive', () => {
    tenantsService.getTenantById.mockReturnValue(
      of({
        data: {
          TenantId: 3,
          Name: '',
          Slug: 'solo-slug',
          PlanCode: '',
          IsActive: false,
          SuspendedAt: null,
          Users: [],
        },
      } as any),
    );
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.client?.name).toBe('solo-slug');
    expect(c.client?.status).toBe('inactive');

    tenantsService.getTenantById.mockReturnValue(
      of({
        data: {
          TenantId: 3,
          Name: 'N',
          Slug: 's',
          IsActive: true,
          SuspendedAt: '2024-01-01',
          Users: [],
        },
      } as any),
    );
    TestBed.resetTestingModule();
    setupWithId('1');
    const f2 = TestBed.createComponent(ClientDetailComponent);
    f2.detectChanges();
    expect(f2.componentInstance.client?.status).toBe('suspended');
  });

  it('mapTenantDetail sin Status en API calcula "active" con IsActive true y sin SuspendedAt', () => {
    tenantsService.getTenantById.mockReturnValue(
      of({
        data: {
          TenantId: 1,
          Name: 'N',
          Slug: 'n',
          PlanCode: 'pro',
          IsActive: true,
          SuspendedAt: null,
          Users: [],
        },
      } as any),
    );
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.client?.status).toBe('active');
  });

  it('mapTenantDetail: usuario Owner y suscripción activa', () => {
    tenantsService.getTenantById.mockReturnValue(
      of({
        data: {
          TenantId: 1,
          Name: 'T',
          Slug: 't',
          PlanCode: 'enterprise',
          IsActive: true,
          Users: [
            {
              UserEmail: 'a@a.com',
              UserName: 'Primero',
              RoleInTenant: 'Member',
            },
            {
              UserEmail: 'o@o.com',
              UserName: 'Dueño',
              RoleInTenant: 'Owner',
            },
          ],
          ActiveSubscription: {
            SubscriptionId: 9,
            PlanCode: 'pro',
            Status: 'ok',
            StartDate: '2024-01-01',
            EndDate: null,
            ExternalSubscriptionId: null,
            CreatedAt: '2024-01-01',
          },
        },
      } as any),
    );
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.client?.email).toBe('a@a.com');
    expect(c.client?.userName).toBe('Dueño');
    expect(c.client?.activeSubscription?.SubscriptionId).toBe(9);
    expect(c.client?.plan).toBe('Enterprise');
  });

  it('getStatusDisplayName, getStatusClass y getPlanClass / getPlanDisplayName', () => {
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    const c = fixture.componentInstance;
    c.availableStatuses = [{ value: 'trial', label: 'Período trial' }];

    expect(c.getStatusDisplayName(undefined)).toBe('-');
    expect(c.getStatusDisplayName('trial')).toBe('Período trial');
    expect(c.getStatusDisplayName('otro')).toBe('otro');

    expect(c.getStatusClass('Active')).toBe('status-active');
    expect(c.getStatusClass('SUSPENDED')).toBe('status-suspended');
    expect(c.getStatusClass('trial')).toBe('status-trial');
    expect(c.getStatusClass('inactive')).toBe('status-inactive');
    expect(c.getStatusClass('x')).toBe('');

    expect(c.getPlanClass('FREE')).toBe('plan-free');
    expect(c.getPlanClass('pro')).toBe('plan-pro');
    expect(c.getPlanClass('Enterprise')).toBe('plan-enterprise');
    expect(c.getPlanClass('x')).toBe('');

    c.availablePlans = [{ PlanId: 1, Code: 'pro', Name: 'Pro Plan', Description: '', IsDefault: false, IsPaid: true, IsActive: true, Price: null }];
    expect(c.getPlanDisplayName('pro')).toBe('Pro Plan');
    expect(c.getPlanDisplayName('customcode')).toBe('Customcode');
    expect(c.getPlanDisplayName(undefined)).toBe('-');
  });

  it('updateStatus y updatePlan no hacen nada si el usuario cancela confirm', () => {
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    vi.mocked(window.confirm).mockReturnValue(false);
    c.updateStatus('suspended');
    c.updatePlan('free');
    expect(tenantsService.updateTenantStatus).not.toHaveBeenCalled();
    expect(tenantsService.updateTenantPlan).not.toHaveBeenCalled();
  });

  it('updateStatus con éxito recarga tenant y actualiza status en callback', () => {
    vi.useFakeTimers();
    vi.mocked(window.confirm).mockReturnValue(true);
    let calls = 0;
    tenantsService.getTenantById.mockImplementation(() => {
      calls += 1;
      return of({
        data: {
          TenantId: 1,
          Name: 'Acme',
          Status: 'active',
          PlanCode: 'pro',
          IsActive: true,
          Users: [],
        },
      } as any);
    });

    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(calls).toBe(1);

    tenantsService.updateTenantStatus.mockReturnValue(of({ data: { status: 'SUSPENDED' } } as any));
    fixture.componentInstance.updateStatus('suspended');

    expect(tenantsService.updateTenantStatus).toHaveBeenCalledWith(1, 'suspended');
    expect(calls).toBe(2);
    expect(fixture.componentInstance.client?.status).toBe('suspended');
    expect(fixture.componentInstance.successMessage).toContain('exitosamente');

    vi.advanceTimersByTime(3000);
    expect(fixture.componentInstance.successMessage).toBe('');
    vi.useRealTimers();
  });

  it('updateStatus ante error muestra mensaje', () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    tenantsService.updateTenantStatus.mockReturnValue(throwError(() => new Error('patch falló')));
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    fixture.componentInstance.updateStatus('inactive');
    expect(fixture.componentInstance.errorMessage).toContain('patch falló');
    expect(fixture.componentInstance.isUpdatingStatus).toBe(false);
  });

  it('updatePlan con éxito recarga tenant y limpia mensaje con temporizador', () => {
    vi.useFakeTimers();
    vi.mocked(window.confirm).mockReturnValue(true);
    let calls = 0;
    tenantsService.getTenantById.mockImplementation(() => {
      calls += 1;
      return of({ data: defaultTenantData } as any);
    });
    plansService.getPlans.mockReturnValue(
      of({
        data: {
          Plans: [{ PlanId: 1, Code: 'free', Name: 'Gratis', Description: '', IsDefault: false, IsPaid: false, IsActive: true, Price: null }],
        },
      } as any),
    );

    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.updatePlan('free');
    expect(tenantsService.updateTenantPlan).toHaveBeenCalledWith(1, 'free');
    expect(calls).toBe(2);
    expect(fixture.componentInstance.successMessage).toContain('Gratis');

    vi.advanceTimersByTime(3000);
    expect(fixture.componentInstance.successMessage).toBe('');
    vi.useRealTimers();
  });

  it('updatePlan ante error muestra mensaje', () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    tenantsService.updateTenantPlan.mockReturnValue(throwError(() => new Error('plan ko')));
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    fixture.componentInstance.updatePlan('enterprise');
    expect(fixture.componentInstance.errorMessage).toContain('plan ko');
    expect(fixture.componentInstance.isUpdatingPlan).toBe(false);
  });

  it('forceLogout y resetFacebookTokens respetan confirm', () => {
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    vi.mocked(window.confirm).mockReturnValue(false);
    c.forceLogout();
    c.resetFacebookTokens();
    vi.mocked(window.confirm).mockReturnValue(true);
    c.forceLogout();
    c.resetFacebookTokens();
  });

  it('updateStatus / updatePlan retornan sin cliente cargado', () => {
    tenantsService.getTenantById.mockReturnValue(throwError(() => new Error('x')));
    tenantsService.updateTenantStatus.mockClear();
    tenantsService.updateTenantPlan.mockClear();
    setupWithId('1');
    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.client).toBeNull();
    vi.mocked(window.confirm).mockReturnValue(true);
    fixture.componentInstance.updateStatus('active');
    fixture.componentInstance.updatePlan('free');
    expect(tenantsService.updateTenantStatus).not.toHaveBeenCalled();
    expect(tenantsService.updateTenantPlan).not.toHaveBeenCalled();
  });
});
