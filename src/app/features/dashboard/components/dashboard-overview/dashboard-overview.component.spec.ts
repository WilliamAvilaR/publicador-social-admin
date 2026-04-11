import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as rxjs from 'rxjs';
import { of, throwError } from 'rxjs';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { DashboardOverviewComponent } from './dashboard-overview.component';
import { AdminService } from '../../../admin/admin/services/admin.service';
import { TenantsService } from '../../../admin/clients/services/tenants.service';
import { PlansService } from '../../../admin/plans/services/plans.service';
import { SupportService } from '../../../admin/support/services/support.service';
import { MetricsService } from '../../../admin/metrics/services/metrics.service';
import type { AdminMonthlyUsageItem } from '../../../admin/metrics/models/metrics.model';

const period = { from: '2024-01-01', to: '2024-01-31' };

describe('DashboardOverviewComponent', () => {
  const router = {
    events: of(),
    url: '/',
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({})),
    serializeUrl: vi.fn(() => ''),
  };
  const activatedRoute = {
    snapshot: { queryParams: {}, paramMap: { get: () => null } },
    queryParams: of({}),
    params: of({}),
  };

  const adminService = {
    getAdminInfo: vi.fn(),
    getSensitiveData: vi.fn(),
    getPlatformOwnerData: vi.fn(),
  };

  const tenantsService = {
    getTenants: vi.fn(),
  };

  const plansService = {
    getPlans: vi.fn(),
  };

  const supportService = {
    getErrors: vi.fn(),
  };

  const metricsService = {
    getGlobalOverview: vi.fn(),
    getGlobalPlanDistribution: vi.fn(),
    getGlobalMonthlyUsage: vi.fn(),
  };

  const defaultAdminInfo = of({
    data: {
      UserId: '1',
      Email: 'a@a.com',
      FullName: 'Admin',
      UserType: 'Internal',
      InternalRoles: [] as string[],
    },
  } as any);

  function setupDefaultMocks() {
    adminService.getAdminInfo.mockReturnValue(defaultAdminInfo);
    adminService.getSensitiveData.mockReturnValue(of({ data: { secret: 'x' } } as any));
    adminService.getPlatformOwnerData.mockReturnValue(of({ data: 'ok' } as any));

    tenantsService.getTenants.mockImplementation((params: { createdFrom?: string }) => {
      if (params?.createdFrom) {
        return of({ data: { Total: 2, tenants: [] } } as any);
      }
      return of({ data: { Total: 10, Tenants: [] } } as any);
    });

    plansService.getPlans.mockReturnValue(of({ data: { Plans: [{ x: 1 }], count: 1 } } as any));

    supportService.getErrors.mockImplementation((params: { pageSize?: number; isHandled?: boolean }) => {
      if (params?.pageSize === 1 && params?.isHandled === false) {
        return of({ data: { total: 3, Total: 3, errors: [] } } as any);
      }
      return of({
        data: {
          errors: [
            {
              id: 1,
              tenantName: '  ',
              exceptionMessage: 'a'.repeat(60),
              exceptionType: 'Ex',
              occurredAt: new Date(Date.now() - 120000).toISOString(),
              createdAt: new Date().toISOString(),
              isHandled: false,
            },
          ],
        },
      } as any);
    });

    metricsService.getGlobalOverview.mockReturnValue(
      of({
        data: {
          metrics: {
            totalActiveUsers: 1,
            totalPages: 2,
            totalScheduledPosts: 3,
            averageUsage: 4,
            churn: 5,
            arpu: 6,
          },
          trends: {} as any,
          period: { ...period, compareFrom: 'a', compareTo: 'b' },
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );

    metricsService.getGlobalPlanDistribution.mockReturnValue(
      of({
        data: {
          plans: [
            { plan: 'free', count: 2, percentage: 20 },
            { plan: 'pro-plan', count: 3, percentage: 30 },
            { plan: 'enterprise', count: 5, percentage: 50 },
          ],
          total: 10,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );

    metricsService.getGlobalMonthlyUsage.mockReturnValue(
      of({
        data: {
          items: Array.from({ length: 14 }, (_, i) => ({
            month: `2024-${String(i + 1).padStart(2, '0')}`,
            users: 10 + i,
            posts: 20 + i,
          })),
          count: 14,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    setupDefaultMocks();

    TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        {
          provide: NGX_ECHARTS_CONFIG,
          useValue: { echarts: () => import('echarts') },
        },
        { provide: AdminService, useValue: adminService },
        { provide: TenantsService, useValue: tenantsService },
        { provide: PlansService, useValue: plansService },
        { provide: SupportService, useValue: supportService },
        { provide: MetricsService, useValue: metricsService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea y completa cargas principales', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(adminService.getAdminInfo).toHaveBeenCalled();
    expect(tenantsService.getTenants).toHaveBeenCalled();
    expect(metricsService.getGlobalMonthlyUsage).toHaveBeenCalledWith({ months: 14 });
    const c = fixture.componentInstance;
    expect(c.adminInfo?.FullName).toBe('Admin');
    expect(c.totalClients).toBe(10);
    expect(c.plansAvailable).toBe(1);
    expect(c.activeSubscriptions).toBe(10);
    expect(c.planBuckets.basic).toBeGreaterThan(0);
    expect(c.planBuckets.pro).toBeGreaterThan(0);
    expect(c.planBuckets.premium).toBeGreaterThan(0);
    expect(c.recentIssues.length).toBeGreaterThan(0);
    expect(c.recentIssues[0].title).toBe('Sistema');
    expect(c.sensitiveData).toEqual({ secret: 'x' });
  });

  it('getAdminInfo con error guarda mensaje', () => {
    adminService.getAdminInfo.mockReturnValue(throwError(() => new Error('fallo admin')));
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('fallo admin');
  });

  it('getAdminInfo sin mensaje usa texto por defecto', () => {
    adminService.getAdminInfo.mockReturnValue(throwError(() => new Error('')));
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('Error al cargar información del admin');
  });

  it('getSensitiveData con HttpErrorResponse 403 no muestra mensaje', () => {
    adminService.getSensitiveData.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            url: '/api/sensitive',
          }),
      ),
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.sensitiveErrorMessage).toBe('');
  });

  it('getSensitiveData con HttpErrorResponse 500 guarda mensaje', () => {
    adminService.getSensitiveData.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Error',
            url: '/api/sensitive',
          }),
      ),
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.sensitiveErrorMessage.length).toBeGreaterThan(0);
  });

  it('getSensitiveData 403 no muestra mensaje; otro código sí', () => {
    adminService.getSensitiveData.mockReturnValue(throwError(() => ({ status: 403, message: 'No' })));
    const f1 = TestBed.createComponent(DashboardOverviewComponent);
    f1.detectChanges();
    expect(f1.componentInstance.sensitiveErrorMessage).toBe('');

    adminService.getSensitiveData.mockReturnValue(throwError(() => ({ status: 500, message: 'Sens' })));
    const f2 = TestBed.createComponent(DashboardOverviewComponent);
    f2.detectChanges();
    expect(f2.componentInstance.sensitiveErrorMessage).toContain('Sens');

    adminService.getSensitiveData.mockReturnValue(throwError(() => ({ status: 500, message: '' })));
    const f3 = TestBed.createComponent(DashboardOverviewComponent);
    f3.detectChanges();
    expect(f3.componentInstance.sensitiveErrorMessage).toContain('Error al cargar datos sensibles');
  });

  it('loadSensitiveData en next asigna response.data', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    adminService.getSensitiveData.mockReturnValue(of({ data: { only: true } } as any));
    fixture.componentInstance.loadSensitiveData();
    expect(fixture.componentInstance.sensitiveData).toEqual({ only: true });
    expect(fixture.componentInstance.isLoadingSensitive).toBe(false);
  });

  it('loadPlatformOwnerData en next asigna el mensaje', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    adminService.getPlatformOwnerData.mockReturnValue(of({ data: 'mensaje plataforma' } as any));
    fixture.componentInstance.loadPlatformOwnerData();
    expect(fixture.componentInstance.platformOwnerMessage).toBe('mensaje plataforma');
    expect(fixture.componentInstance.isLoadingOwner).toBe(false);
  });

  it('getPlatformOwnerData 403 silencia error', () => {
    adminService.getPlatformOwnerData.mockReturnValue(throwError(() => ({ status: 403 })));
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.ownerErrorMessage).toBe('');
  });

  it('KPI sin overview ni distribución mantiene valores por defecto', () => {
    metricsService.getGlobalOverview.mockReturnValue(of(null as any));
    metricsService.getGlobalPlanDistribution.mockReturnValue(of(null as any));
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.overviewMetrics).toBeNull();
    expect(fixture.componentInstance.activeSubscriptions).toBe(0);
  });

  it('getGlobalMonthlyUsage con error vacía el gráfico', () => {
    metricsService.getGlobalMonthlyUsage.mockReturnValue(throwError(() => new Error('chart')));
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasMetricsChartData).toBe(false);
    expect(fixture.componentInstance.metricsChartOptions).toEqual({});
  });

  it('items sin month válido dejan el gráfico vacío', () => {
    metricsService.getGlobalMonthlyUsage.mockReturnValue(
      of({
        data: {
          items: [{ month: '', users: 1, posts: 1 }],
          count: 1,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasMetricsChartData).toBe(false);
  });

  it('setChartPeriod year y month recortan la serie', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setChartPeriod('year');
    expect(c.chartPeriod).toBe('year');
    expect(c.hasMetricsChartData).toBe(true);

    c.setChartPeriod('month');
    expect(c.chartPeriod).toBe('month');
    expect(c.hasMetricsChartData).toBe(true);
  });

  it('setChartPeriod week reconstruye serie sintética', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setChartPeriod('week');
    expect(c.chartPeriod).toBe('week');
    expect(c.hasMetricsChartData).toBe(true);
  });

  it('helpers privados: truncate, formatTimeAgo, formatChartLabel, bucketPlanDistribution', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance as unknown as {
      truncate: (s: string, max: number) => string;
      formatTimeAgo: (iso: string) => string;
      formatChartLabel: (m: string, p: 'week' | 'month' | 'year') => string;
      bucketPlanDistribution: (plans: { plan: string; count: number }[]) => {
        basic: number;
        pro: number;
        premium: number;
      };
    };

    expect(c.truncate('  a  b  ', 3)).toBe('a b');
    expect(c.truncate('abcdefghij', 5)).toContain('…');

    expect(c.formatTimeAgo('')).toBe('');
    expect(c.formatTimeAgo('invalid')).toBe('');
    expect(c.formatTimeAgo(new Date().toISOString())).toMatch(/momento|min/);

    expect(c.formatChartLabel('S1', 'week')).toBe('S1');
    expect(c.formatChartLabel('2024-06-01', 'month')).toBeTruthy();
    expect(c.formatChartLabel('abcdef', 'month')).toBe('abcde.');
    expect(c.formatChartLabel('abcde', 'month')).toBe('abcde');
    expect(c.formatChartLabel('abc', 'month')).toBe('abc');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(c.formatTimeAgo(threeDaysAgo)).toMatch(/día/);

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(c.formatTimeAgo(tenDaysAgo)).toMatch(/\d{4}|\/|\./);

    const buckets = c.bucketPlanDistribution([
      { plan: 'enterprise', count: 1 },
      { plan: 'pro', count: 2 },
      { plan: 'free', count: 4 },
    ]);
    expect(buckets.premium).toBe(1);
    expect(buckets.pro).toBe(2);
    expect(buckets.basic).toBe(4);

    const buckets2 = c.bucketPlanDistribution([
      { plan: 'Business', count: 1 },
      { plan: 'standard-x', count: 2 },
      { plan: 'plus', count: 3 },
    ]);
    expect(buckets2.premium).toBe(1);
    expect(buckets2.pro).toBe(5);

    expect(c.bucketPlanDistribution([{ plan: undefined as unknown as string, count: 2 }]).basic).toBe(2);
  });

  it('buildMetricsChartOption construye series y ejes', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance as unknown as {
      buildMetricsChartOption: (slice: AdminMonthlyUsageItem[]) => {
        series?: unknown[];
        xAxis?: { data?: string[] };
      };
    };
    const opt = c.buildMetricsChartOption([{ month: '2024-04-01', users: 3, posts: 7 }]);
    expect(opt.series?.length).toBe(2);
    expect(opt.xAxis?.data?.length).toBe(1);
  });

  it('trendSuffix y chartFooterBadge cubren ramas', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance;

    expect(c.trendSuffix(null)).toBe('');
    expect(c.trendSuffix({ change: 1.5, changePercent: 2.25, isPositive: true })).toBe('+2.3%');
    expect(c.trendSuffix({ change: 1, changePercent: null, isPositive: true })).toBe('+1.0%');
    expect(c.trendSuffix({ change: 0, changePercent: 0, isPositive: true })).toBe('0.0%');

    expect(c.chartFooterBadge()).toBe('');
    c.overviewTrends = {
      totalActiveUsers: {} as any,
      totalPages: {} as any,
      totalScheduledPosts: { change: -2, changePercent: null, isPositive: false },
      averageUsage: {} as any,
      churn: {} as any,
      arpu: {} as any,
    };
    expect(c.chartFooterBadge()).toContain('-');

    c.overviewTrends.totalScheduledPosts = {
      change: 5,
      changePercent: null,
      isPositive: true,
    };
    expect(c.chartFooterBadge()).toContain('+');
  });

  it('hasRole, PlatformSupport y canViewSensitiveData', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance;
    c.adminInfo = {
      UserId: '1',
      Email: '',
      FullName: '',
      UserType: 'Internal',
      InternalRoles: ['PlatformSupport'],
    };
    expect(c.isPlatformSupport()).toBe(true);
    expect(c.isPlatformOwner()).toBe(false);
    expect(c.canViewSensitiveData()).toBe(true);

    c.adminInfo.InternalRoles = ['PlatformOwner'];
    expect(c.isPlatformOwner()).toBe(true);
  });

  it('forkJoin de KPIs fallido muestra kpiErrorMessage', () => {
    const fjSpy = vi.spyOn(rxjs, 'forkJoin').mockReturnValue(
      throwError(() => new Error('forkJoin')) as rxjs.Observable<unknown>,
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.kpiErrorMessage).toContain(
      'No se pudieron cargar algunos datos del panel',
    );
    expect(fixture.componentInstance.isLoadingKpis).toBe(false);
    fjSpy.mockRestore();
  });

  it('KPI usa totales en camelCase y cuenta planes desde array sin Count', () => {
    tenantsService.getTenants.mockImplementation((params: { createdFrom?: string }) => {
      if (params?.createdFrom) {
        return of({ data: { total: 7, tenants: [] } } as any);
      }
      return of({ data: { count: 11, Tenants: [] } } as any);
    });
    plansService.getPlans.mockReturnValue(
      of({ data: { plans: [{ id: 1 }, { id: 2 }], plansCount: 2 } } as any),
    );

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.totalClients).toBe(11);
    expect(c.newClientsThisMonth).toBe(7);
    expect(c.plansAvailable).toBe(2);
  });

  it('lista de errores usa tenant con nombre y solo exceptionType en subtítulo', () => {
    supportService.getErrors.mockImplementation((params: { pageSize?: number }) => {
      if (params?.pageSize === 3) {
        return of({
          data: {
            errors: [
              {
                id: 2,
                tenantName: 'Acme',
                exceptionMessage: null,
                exceptionType: 'Timeout',
                occurredAt: new Date().toISOString(),
                createdAt: '',
                isHandled: true,
              },
            ],
          },
        } as any);
      }
      return of({ data: { total: 0, errors: [] } } as any);
    });

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    const issue = fixture.componentInstance.recentIssues.find((i) => i.id === 2);
    expect(issue?.title).toBe('Acme');
    expect(issue?.subtitle).toContain('Timeout');
    expect(issue?.resolved).toBe(true);
  });

  it('trendSuffix con variación negativa y NaN', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance;
    expect(c.trendSuffix({ change: -4, changePercent: -4, isPositive: false })).toBe('-4.0%');
    expect(
      c.trendSuffix({ change: Number.NaN, changePercent: null as unknown as null, isPositive: false }),
    ).toBe('');
  });

  it('chartFooterBadge con porcentaje cero y positivo', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance;
    c.overviewTrends = {
      totalActiveUsers: {} as any,
      totalPages: {} as any,
      totalScheduledPosts: { change: 0, changePercent: 0, isPositive: true },
      averageUsage: {} as any,
      churn: {} as any,
      arpu: {} as any,
    };
    expect(c.chartFooterBadge()).toContain('+0%');
    c.overviewTrends.totalScheduledPosts = {
      change: 3,
      changePercent: 12,
      isPositive: true,
    };
    expect(c.chartFooterBadge()).toContain('+');
  });

  it('formatTimeAgo: horas, un día y más de una semana', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance as unknown as { formatTimeAgo: (iso: string) => string };

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(c.formatTimeAgo(twoHoursAgo)).toMatch(/h/);

    const oneDayAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    expect(c.formatTimeAgo(oneDayAgo)).toMatch(/1 día/);

    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(c.formatTimeAgo(eightDaysAgo)).toMatch(/\d/);
  });

  it('hasRole devuelve false sin roles coincidentes', () => {
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const c = fixture.componentInstance;
    c.adminInfo = {
      UserId: '1',
      Email: '',
      FullName: '',
      UserType: 'Internal',
      InternalRoles: ['Other'],
    };
    expect(c.hasRole('PlatformOwner')).toBe(false);
  });

  it('getPlatformOwnerData sin status muestra mensaje de error', () => {
    adminService.getPlatformOwnerData.mockReturnValue(
      throwError(() => ({ message: 'sin status' } as Error)),
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.ownerErrorMessage).toContain('sin status');
  });

  it('distribución de planes clasifica business y standard en KPIs', () => {
    metricsService.getGlobalPlanDistribution.mockReturnValue(
      of({
        data: {
          plans: [
            { plan: 'elite-offer', count: 1, percentage: 10 },
            { plan: 'advanced', count: 2, percentage: 20 },
            { plan: 'otro', count: 1, percentage: 5 },
          ],
          total: 4,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();
    const b = fixture.componentInstance.planBuckets;
    expect(b.premium).toBeGreaterThanOrEqual(1);
    expect(b.pro).toBeGreaterThanOrEqual(2);
    expect(b.basic).toBeGreaterThanOrEqual(1);
  });

  describe('forkJoin KPI: catchError por fuente', () => {
    it('fallo en tenantsTotal (sin createdFrom)', () => {
      tenantsService.getTenants.mockImplementation((params: { createdFrom?: string }) => {
        if (!params?.createdFrom) {
          return throwError(() => new Error('total'));
        }
        return of({ data: { Total: 2, tenants: [] } } as any);
      });
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.totalClients).toBe(0);
      expect(c.newClientsThisMonth).toBe(2);
    });

    it('fallo en tenantsNewMonth (con createdFrom)', () => {
      tenantsService.getTenants.mockImplementation((params: { createdFrom?: string }) => {
        if (params?.createdFrom) {
          return throwError(() => new Error('new month'));
        }
        return of({ data: { Total: 10, Tenants: [] } } as any);
      });
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.totalClients).toBe(10);
      expect(c.newClientsThisMonth).toBe(0);
    });

    it('fallo en getPlans', () => {
      plansService.getPlans.mockReturnValue(throwError(() => new Error('plans')));
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.plansAvailable).toBe(0);
    });

    it('fallo en getErrors lista (pageSize 3)', () => {
      supportService.getErrors.mockImplementation((params: { pageSize?: number; isHandled?: boolean }) => {
        if (params?.pageSize === 1 && params?.isHandled === false) {
          return of({ data: { total: 0, errors: [] } } as any);
        }
        if (params?.pageSize === 3) {
          return throwError(() => new Error('errors list'));
        }
        return of({ data: { errors: [] } } as any);
      });
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.recentIssues).toEqual([]);
    });

    it('fallo en getErrors abiertos (isHandled false)', () => {
      supportService.getErrors.mockImplementation((params: { pageSize?: number; isHandled?: boolean }) => {
        if (params?.pageSize === 1 && params?.isHandled === false) {
          return throwError(() => new Error('open'));
        }
        return of({
          data: { errors: [], total: 0 },
        } as any);
      });
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.openErrorsCount).toBe(0);
    });

    it('fallo en getGlobalOverview', () => {
      metricsService.getGlobalOverview.mockReturnValue(throwError(() => new Error('overview')));
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.overviewMetrics).toBeNull();
    });

    it('fallo en getGlobalPlanDistribution', () => {
      metricsService.getGlobalPlanDistribution.mockReturnValue(throwError(() => new Error('dist')));
      const fixture = TestBed.createComponent(DashboardOverviewComponent);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.isLoadingKpis).toBe(false);
      expect(c.kpiErrorMessage).toBe('');
      expect(c.activeSubscriptions).toBe(0);
    });
  });
});
