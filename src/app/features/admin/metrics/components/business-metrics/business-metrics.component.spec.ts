import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { BusinessMetricsComponent } from './business-metrics.component';
import { MetricsService } from '../../services/metrics.service';

const period = { from: '2024-01-01', to: '2024-01-31' };

const baseOverview = {
  data: {
    metrics: {
      totalActiveUsers: 10,
      totalPages: 20,
      totalScheduledPosts: 30,
      averageUsage: 40,
      churn: 1,
      arpu: 50,
    },
    trends: {
      totalActiveUsers: { change: 1, changePercent: 2, isPositive: true },
      totalPages: { change: 1, changePercent: 2, isPositive: true },
      totalScheduledPosts: { change: 1, changePercent: 2, isPositive: true },
      averageUsage: { change: 1, changePercent: 2, isPositive: false },
      churn: { change: 1, changePercent: 2, isPositive: true },
      arpu: { change: 1, changePercent: 2, isPositive: true },
    },
    period: { ...period, compareFrom: 'a', compareTo: 'b' },
  },
  requiresReauth: false,
  meta: null,
} as const;

describe('BusinessMetricsComponent', () => {
  const metricsService = {
    getGlobalOverview: vi.fn(),
    getGlobalPlanDistribution: vi.fn(),
    getGlobalMonthlyUsage: vi.fn(),
    getGlobalTopClients: vi.fn(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    metricsService.getGlobalOverview.mockReturnValue(of({ ...baseOverview } as any));
    metricsService.getGlobalPlanDistribution.mockReturnValue(
      of({
        data: {
          plans: [{ plan: 'free', count: 5, percentage: 50 }],
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
          items: [{ month: '2024-01', users: 1, posts: 2 }],
          count: 1,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    metricsService.getGlobalTopClients.mockReturnValue(
      of({
        data: {
          items: [{ name: 'A', plan: 'pro', posts: 1, pages: 2 }],
          count: 1,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );

    TestBed.configureTestingModule({
      imports: [BusinessMetricsComponent],
      providers: [
        { provide: MetricsService, useValue: metricsService },
        {
          provide: NGX_ECHARTS_CONFIG,
          useValue: { echarts: () => import('echarts') },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea y solicita overview, distribución, uso y top clientes', () => {
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(metricsService.getGlobalOverview).toHaveBeenCalled();
    expect(metricsService.getGlobalPlanDistribution).toHaveBeenCalled();
    expect(metricsService.getGlobalMonthlyUsage).toHaveBeenCalledWith({ months: 6 });
    expect(metricsService.getGlobalTopClients).toHaveBeenCalledWith({ limit: 10 });
    expect(fixture.componentInstance.mainMetrics.totalActiveUsers).toBe(10);
    expect(fixture.componentInstance.isLoadingOverview).toBe(false);
  });

  it('getGlobalOverview con error muestra overviewError', () => {
    metricsService.getGlobalOverview.mockReturnValue(throwError(() => new Error('sin red')));
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.overviewError).toContain('sin red');
    expect(fixture.componentInstance.isLoadingOverview).toBe(false);
  });

  it('getGlobalOverview con error sin mensaje usa texto por defecto', () => {
    metricsService.getGlobalOverview.mockReturnValue(throwError(() => new Error('')));
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.overviewError).toContain('No se pudo cargar el overview');
  });

  it('mapTrendToUi usa change cuando changePercent es null', () => {
    metricsService.getGlobalOverview.mockReturnValue(
      of({
        data: {
          ...baseOverview.data,
          trends: {
            totalActiveUsers: { change: 7.5, changePercent: null, isPositive: true },
            totalPages: { change: 1, changePercent: 2, isPositive: true },
            totalScheduledPosts: { change: 1, changePercent: 2, isPositive: true },
            averageUsage: { change: 1, changePercent: 2, isPositive: false },
            churn: { change: 1, changePercent: 2, isPositive: true },
            arpu: { change: 1, changePercent: 2, isPositive: true },
          },
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.trends.totalActiveUsers.change).toBe(7.5);
    expect(fixture.componentInstance.trends.totalActiveUsers.changePercent).toBeNull();
  });

  it('distribución vacía desactiva el gráfico', () => {
    metricsService.getGlobalPlanDistribution.mockReturnValue(
      of({
        data: { plans: [], total: 0, period },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasPlanDistributionChart).toBe(false);
    expect(fixture.componentInstance.planDistributionChartOptions).toEqual({});
  });

  it('error en distribución conserva datos semilla y reconstruye el gráfico con ellos', () => {
    metricsService.getGlobalPlanDistribution.mockReturnValue(throwError(() => new Error('x')));
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.planDistribution.length).toBeGreaterThan(0);
    expect(c.hasPlanDistributionChart).toBe(true);
  });

  it('muchas filas de plan aumenta la altura del gráfico dentro del tope', () => {
    const plans = Array.from({ length: 12 }, (_, i) => ({
      plan: `p${i}`,
      count: i + 1,
      percentage: Math.floor(100 / 12),
    }));
    metricsService.getGlobalPlanDistribution.mockReturnValue(
      of({
        data: { plans, total: 100, period },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.hasPlanDistributionChart).toBe(true);
    expect(c.planDistributionChartHeight).toBeLessThanOrEqual(520);
    expect(c.planDistributionChartHeight).toBeGreaterThanOrEqual(220);
  });

  it('tooltip y etiquetas del gráfico formatean filas válidas e inválidas', () => {
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    const opts = fixture.componentInstance.planDistributionChartOptions as {
      tooltip: { formatter: (p: unknown) => string };
      series: Array<{ label: { formatter: (p: { dataIndex: number }) => string } }>;
    };

    const tooltip = opts.tooltip.formatter;
    const rowText = tooltip([{ name: 'x', value: 5, dataIndex: 0 }] as unknown as never);
    expect(rowText).toContain('Free');
    expect(tooltip({ name: 'x', value: 1, dataIndex: 99 } as unknown as never)).toBe('');
    expect(tooltip({ name: 'x', value: 1, dataIndex: 0 } as unknown as never)).toContain('usuarios');

    const labelFmt = opts.series[0].label.formatter;
    expect(labelFmt({ dataIndex: 0 })).toContain('%');
    expect(labelFmt({ dataIndex: 999 })).toBe('');
  });

  it('formatMonthLabel y normalizePlanLabel (privados) vía instancia', () => {
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    const c = fixture.componentInstance as unknown as {
      formatMonthLabel: (v: string) => string;
      normalizePlanLabel: (v: string) => string;
    };

    expect(c.formatMonthLabel('')).toBe('');
    expect(c.formatMonthLabel('sin-guion')).toBe('sin-guion');
    expect(c.formatMonthLabel('2024-13')).toBe('2024-13');
    expect(c.formatMonthLabel('2024-06')).toMatch(/2024|jun/i);

    expect(c.normalizePlanLabel('enterprise')).toBe('Enterprise');
    expect(c.normalizePlanLabel('')).toBe('Unknown');
  });

  it('uso mensual y top clientes mapean respuesta', () => {
    metricsService.getGlobalMonthlyUsage.mockReturnValue(
      of({
        data: {
          items: [
            { month: '2024-03', users: 10, posts: 100 },
            { month: 'bad-month', users: 5, posts: 5 },
          ],
          count: 2,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    metricsService.getGlobalTopClients.mockReturnValue(
      of({
        data: {
          items: [{ name: 'Cliente', plan: 'free', posts: 9, pages: 3 }],
          count: 1,
          period,
        },
        requiresReauth: false,
        meta: null,
      } as any),
    );
    const fixture = TestBed.createComponent(BusinessMetricsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.monthlyUsage.length).toBe(2);
    expect(fixture.componentInstance.monthlyUsage[1].month).toBe('bad-month');
    expect(fixture.componentInstance.topClients[0].plan).toBe('Free');
  });
});
