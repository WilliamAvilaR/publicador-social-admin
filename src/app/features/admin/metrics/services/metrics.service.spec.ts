import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { MetricsService } from './metrics.service';

const overviewBody = {
  data: {
    Metrics: {
      TotalActiveUsers: 1,
      TotalPages: 2,
      TotalScheduledPosts: 3,
      AverageUsage: 4,
      Churn: 5,
      Arpu: 6,
    },
    Trends: {
      TotalActiveUsers: { Change: 0, ChangePercent: null, IsPositive: true },
      TotalPages: { Change: 0, ChangePercent: 1, IsPositive: false },
      TotalScheduledPosts: { Change: 0, ChangePercent: 1, IsPositive: false },
      AverageUsage: { Change: 0, ChangePercent: 1, IsPositive: false },
      Churn: { Change: 0, ChangePercent: 1, IsPositive: false },
      Arpu: { Change: 0, ChangePercent: 1, IsPositive: false },
    },
    Period: { From: 'a', To: 'b', CompareFrom: 'c', CompareTo: 'd' },
  },
};

describe('MetricsService', () => {
  let service: MetricsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MetricsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetricsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getGlobalOverview con params', () => {
    service.getGlobalOverview({ from: '2024-01-01', to: '2024-02-01' }).subscribe((res) => {
      expect(res.data.metrics.totalActiveUsers).toBe(1);
    });
    const req = httpMock.expectOne((r) =>
      r.url.split('?')[0] === '/api/admin/metrics/global/overview',
    );
    expect(req.request.params.get('from')).toBe('2024-01-01');
    expect(req.request.params.get('to')).toBe('2024-02-01');
    req.flush(overviewBody);
  });

  it('getGlobalPlanDistribution', () => {
    service.getGlobalPlanDistribution({ from: 'a', to: 'b' }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.split('?')[0] === '/api/admin/metrics/global/plan-distribution',
    );
    req.flush({
      data: {
        Plans: [{ Plan: 'free', Count: 1, Percentage: 100 }],
        Total: 1,
        Period: { From: 'a', To: 'b' },
      },
    });
  });

  it('getGlobalMonthlyUsage', () => {
    service.getGlobalMonthlyUsage({ from: 'a', to: 'b', months: 6 }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.split('?')[0] === '/api/admin/metrics/global/monthly-usage',
    );
    expect(req.request.params.get('months')).toBe('6');
    req.flush({
      data: {
        Items: [{ Month: '2024-01', Users: 1, Posts: 2 }],
        Count: 1,
        Period: { From: 'a', To: 'b' },
      },
    });
  });

  it('getGlobalTopClients', () => {
    service.getGlobalTopClients({ from: 'a', to: 'b', limit: 5 }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.split('?')[0] === '/api/admin/metrics/global/top-clients',
    );
    expect(req.request.params.get('limit')).toBe('5');
    req.flush({
      data: {
        Items: [{ Name: 'A', Plan: 'p', Posts: 1, Pages: 2 }],
        Count: 1,
        Period: { From: 'a', To: 'b' },
      },
    });
  });

  it('handleError 403 métricas', async () => {
    const pending = firstValueFrom(service.getGlobalOverview());
    const req = httpMock.expectOne((r) =>
      r.url.split('?')[0] === '/api/admin/metrics/global/overview',
    );
    req.flush(
      { detail: 'no', title: 't', type: '', status: 403, instance: '' },
      { status: 403, statusText: 'Forbidden' },
    );
    await expect(pending).rejects.toThrow('no');
  });

  it('getGlobalOverview sin params ni query string', async () => {
    const pending = firstValueFrom(service.getGlobalOverview());
    const req = httpMock.expectOne(
      (r) =>
        r.url.split('?')[0] === '/api/admin/metrics/global/overview' &&
        r.params.keys().length === 0,
    );
    req.flush(overviewBody);
    await pending;
  });

  it('getGlobalOverview con compareFrom y compareTo', () => {
    service
      .getGlobalOverview({
        from: 'a',
        to: 'b',
        compareFrom: 'c',
        compareTo: 'd',
      })
      .subscribe();
    const req = httpMock.expectOne(
      (httpReq) =>
        httpReq.url.split('?')[0] === '/api/admin/metrics/global/overview',
    );
    expect(req.request.params.get('compareFrom')).toBe('c');
    expect(req.request.params.get('compareTo')).toBe('d');
    req.flush(overviewBody);
  });

  it('getGlobalOverview normaliza camelCase, requiresReauth y meta', async () => {
    const pending = firstValueFrom(service.getGlobalOverview());
    const req = httpMock.expectOne('/api/admin/metrics/global/overview');
    req.flush({
      requiresReauth: true,
      meta: { trace: 'x' },
      data: {
        metrics: {
          totalActiveUsers: 9,
          totalPages: 8,
          totalScheduledPosts: 7,
          averageUsage: 6,
          churn: 5,
          arpu: 4,
        },
        trends: {
          totalActiveUsers: { change: 1, changePercent: 0, isPositive: true },
          totalPages: { change: 2, changePercent: null, isPositive: false },
          totalScheduledPosts: { change: 3, changePercent: 12.5, isPositive: true },
          averageUsage: { change: 4, changePercent: undefined, isPositive: false },
          churn: { change: 5, changePercent: 1, isPositive: true },
          arpu: { change: 6, changePercent: 2, isPositive: false },
        },
        period: {
          from: 'p1',
          to: 'p2',
          compareFrom: 'p3',
          compareTo: 'p4',
        },
      },
    });
    const res = await pending;
    expect(res.requiresReauth).toBe(true);
    expect(res.meta).toEqual({ trace: 'x' });
    expect(res.data.metrics.totalActiveUsers).toBe(9);
    expect(res.data.trends.totalActiveUsers.changePercent).toBe(0);
    expect(res.data.trends.totalPages.changePercent).toBeNull();
    expect(res.data.period.from).toBe('p1');
  });

  it('getGlobalOverview acepta cuerpo sin clave data', async () => {
    const pending = firstValueFrom(service.getGlobalOverview());
    const req = httpMock.expectOne('/api/admin/metrics/global/overview');
    req.flush({
      metrics: { totalActiveUsers: 1, totalPages: 0, totalScheduledPosts: 0, averageUsage: 0, churn: 0, arpu: 0 },
      trends: {},
      period: { from: 'a', to: 'b', compareFrom: '', compareTo: '' },
    });
    const res = await pending;
    expect(res.data.metrics.totalActiveUsers).toBe(1);
  });

  it('getGlobalPlanDistribution sin params', async () => {
    const pending = firstValueFrom(service.getGlobalPlanDistribution());
    const req = httpMock.expectOne(
      (r) =>
        r.url.split('?')[0] === '/api/admin/metrics/global/plan-distribution' &&
        r.params.keys().length === 0,
    );
    req.flush({
      data: {
        plans: [{ plan: 'pro', count: 2, percentage: 50 }],
        total: 4,
        period: { from: 'x', to: 'y' },
      },
    });
    const res = await pending;
    expect(res.data.plans[0]?.plan).toBe('pro');
    expect(res.data.total).toBe(4);
  });

  it('getGlobalMonthlyUsage sin params', async () => {
    const pending = firstValueFrom(service.getGlobalMonthlyUsage());
    const req = httpMock.expectOne(
      (r) =>
        r.url.split('?')[0] === '/api/admin/metrics/global/monthly-usage' &&
        r.params.keys().length === 0,
    );
    req.flush({
      data: {
        items: [{ month: '2024-01', users: 1, posts: 2 }],
        count: 1,
        period: { from: 'a', to: 'b' },
      },
    });
    await pending;
  });

  it('getGlobalTopClients sin params', async () => {
    const pending = firstValueFrom(service.getGlobalTopClients());
    const req = httpMock.expectOne(
      (r) =>
        r.url.split('?')[0] === '/api/admin/metrics/global/top-clients' &&
        r.params.keys().length === 0,
    );
    req.flush({
      data: {
        items: [{ name: 'T', plan: 'free', posts: 1, pages: 2 }],
        count: 1,
        period: { from: 'a', to: 'b' },
      },
    });
    await pending;
  });

  it('getGlobalMonthlyUsage con months 0 envía query months=0', () => {
    service.getGlobalMonthlyUsage({ months: 0 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url.split('?')[0] === '/api/admin/metrics/global/monthly-usage',
    );
    expect(req.request.params.get('months')).toBe('0');
    req.flush({ data: { items: [], count: 0, period: { from: '', to: '' } } });
  });

  it('getGlobalTopClients con limit 0 envía query limit=0', () => {
    service.getGlobalTopClients({ limit: 0 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url.split('?')[0] === '/api/admin/metrics/global/top-clients',
    );
    expect(req.request.params.get('limit')).toBe('0');
    req.flush({ data: { items: [], count: 0, period: { from: '', to: '' } } });
  });

  it('normaliza plan-distribution con item sin plan (unknown) y solo claves PascalCase', async () => {
    const pending = firstValueFrom(service.getGlobalPlanDistribution());
    const req = httpMock.expectOne('/api/admin/metrics/global/plan-distribution');
    req.flush({
      data: {
        Plans: [{ Count: 3, Percentage: 25 }],
        Total: 3,
        Period: { From: 'a', To: 'b' },
      },
    });
    const res = await pending;
    expect(res.data.plans[0]?.plan).toBe('unknown');
    expect(res.data.plans[0]?.count).toBe(3);
  });

  it('normaliza monthly-usage y top-clients mezclando Items/Count en PascalCase', async () => {
    const p1 = firstValueFrom(service.getGlobalMonthlyUsage());
    const r1 = httpMock.expectOne('/api/admin/metrics/global/monthly-usage');
    r1.flush({
      data: {
        Items: [{ Month: '2024-02', Users: 2, Posts: 3 }],
        Count: 1,
        Period: { From: 'x', To: 'y' },
      },
    });
    await p1;

    const p2 = firstValueFrom(service.getGlobalTopClients());
    const r2 = httpMock.expectOne('/api/admin/metrics/global/top-clients');
    r2.flush({
      data: {
        Items: [{ Name: 'X', Plan: 'pro', Posts: 1, Pages: 0 }],
        Count: 1,
        Period: { From: 'a', To: 'b' },
      },
    });
    const top = await p2;
    expect(top.data.items[0]?.name).toBe('X');
    expect(top.data.items[0]?.pages).toBe(0);
  });

  describe('handleError (HTTP)', () => {
    it('ErrorEvent en cliente', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.error(new ErrorEvent('error', { message: 'sin red' }));
      await expect(pending).rejects.toThrow(/Error: sin red/);
    });

    it('401', async () => {
      const pending = firstValueFrom(service.getGlobalPlanDistribution());
      const req = httpMock.expectOne('/api/admin/metrics/global/plan-distribution');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/);
    });

    it('403 solo title', async () => {
      const pending = firstValueFrom(service.getGlobalMonthlyUsage());
      const req = httpMock.expectOne('/api/admin/metrics/global/monthly-usage');
      req.flush(
        { detail: '', title: 'Prohibido', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/Prohibido/);
    });

    it('403 sin detail ni title', async () => {
      const pending = firstValueFrom(service.getGlobalTopClients());
      const req = httpMock.expectOne('/api/admin/metrics/global/top-clients');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      await expect(pending).rejects.toThrow(/permisos/);
    });

    it('403 con cuerpo null usa mensaje por defecto de permisos', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush(null, { status: 403, statusText: 'Forbidden' });
      await expect(pending).rejects.toThrow(/permisos/);
    });

    it('500 con detail en cuerpo', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush(
        { detail: 'Fallo interno', title: 'E', type: '', status: 500, instance: '' },
        { status: 500, statusText: 'Error' },
      );
      await expect(pending).rejects.toThrow('Fallo interno');
    });

    it('500 sin detail', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush({}, { status: 500, statusText: 'Error' });
      await expect(pending).rejects.toThrow(/servidor/);
    });

    it('502 default con detail', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush(
        { detail: 'Gateway', title: 'Bad', type: '', status: 502, instance: '' },
        { status: 502, statusText: 'Bad Gateway' },
      );
      await expect(pending).rejects.toThrow('Gateway');
    });

    it('502 default solo title', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush(
        { detail: '', title: 'T502', type: '', status: 502, instance: '' },
        { status: 502, statusText: 'Bad Gateway' },
      );
      await expect(pending).rejects.toThrow(/T502/);
    });

    it('502 default usa error.message', async () => {
      const pending = firstValueFrom(service.getGlobalOverview());
      const req = httpMock.expectOne('/api/admin/metrics/global/overview');
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      await expect(pending).rejects.toThrow();
    });

    it('default sin detail, title ni message conserva mensaje genérico', async () => {
      const err = {
        error: {},
        status: 599,
        statusText: '',
        message: '',
        name: 'HttpErrorResponse',
        ok: false,
      } as HttpErrorResponse;

      const pending = firstValueFrom(
        (service as unknown as { handleError(e: HttpErrorResponse) }).handleError(err),
      );
      await expect(pending).rejects.toThrow(
        'Ocurrió un error al cargar las métricas globales.',
      );
    });
  });
});
