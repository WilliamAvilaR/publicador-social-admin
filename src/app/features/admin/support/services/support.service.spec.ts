import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { SupportService } from './support.service';

const requestsListBody = {
  data: {
    Requests: [],
    Total: 0,
    Page: 1,
    PageSize: 20,
    TotalPages: 0,
  },
};

const emptyMeta = {
  totalCount: 0,
  pageSize: 10,
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviusPage: false,
  nextPageUrl: '',
  previusPageUrl: '',
};

describe('SupportService', () => {
  let service: SupportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupportService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getRequests sin params', () => {
    service.getRequests().subscribe((res) => {
      expect(res.data.total).toBe(0);
    });
    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/requests');
    expect(req.request.method).toBe('GET');
    req.flush(requestsListBody);
  });

  it('getRequests aplica filtros y límites de paginación', () => {
    service
      .getRequests({
        tenantId: 1,
        method: 'get',
        page: 0,
        pageSize: 200,
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/requests');
    const p = req.request.params;
    expect(p.get('tenantId')).toBe('1');
    expect(p.get('method')).toBe('GET');
    expect(p.get('page')).toBe('1');
    expect(p.get('pageSize')).toBe('100');
    req.flush(requestsListBody);
  });

  it('getRequests con muchos query params opcionales', () => {
    service
      .getRequests({
        userId: 2,
        methods: ' get, post ',
        path: '/api/x',
        exactPath: true,
        statusCode: 500,
        statusCodeFrom: 400,
        statusCodeTo: 599,
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        createdFromDate: '2024-06-01',
        createdToDate: '2024-06-30',
        minElapsedMs: 10,
        maxElapsedMs: 5000,
        onlyFailed: true,
        isSuccess: false,
        correlationId: 'c1',
        ipAddress: '1.1.1.1',
        userAgent: 'UA',
        browserFamily: 'Chrome',
        query: 'q',
        sortBy: 'elapsed',
        sortDir: 'desc',
        page: 2,
        pageSize: 50,
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/requests');
    const p = req.request.params;
    expect(p.get('userId')).toBe('2');
    expect(p.get('methods')).toBe('GET, POST');
    expect(p.get('exactPath')).toBe('true');
    expect(p.get('onlyFailed')).toBe('true');
    expect(p.get('sortDir')).toBe('desc');
    expect(p.get('pageSize')).toBe('50');
    req.flush(requestsListBody);
  });

  it('getRequests normaliza lista con requests en camelCase y meta', () => {
    service.getRequests().subscribe((res) => {
      expect(res.data.requests.length).toBe(1);
      expect(res.data.requests[0].httpMethod).toBe('POST');
      expect(res.requiresReauth).toBe(true);
      expect(res.meta).toEqual(emptyMeta);
    });
    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/requests');
    req.flush({
      requiresReauth: true,
      meta: emptyMeta,
      data: {
        requests: [
          {
            id: 1,
            correlationId: 'x',
            httpMethod: 'POST',
            path: '/p',
            statusCode: 201,
            elapsedMs: 12,
            isSuccess: true,
            occurredAt: 't1',
            createdAt: 't2',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });
  });

  it('getRequestById normaliza detalle con ErrorLogs y FailureSummary', () => {
    service.getRequestById(5).subscribe((res) => {
      expect(res.data.id).toBe(5);
      expect(res.data.failureSummary).toBe('falló');
      expect(res.data.errorLogs?.length).toBe(1);
      expect(res.data.errorLogs?.[0].severity).toBe('Error');
    });
    const req = httpMock.expectOne('/api/admin/logs/requests/5');
    req.flush({
      data: {
        Id: 5,
        CorrelationId: 'c',
        HttpMethod: 'GET',
        Path: '/x',
        StatusCode: 200,
        ElapsedMs: 1,
        IsSuccess: true,
        OccurredAt: '',
        CreatedAt: '',
        FailureSummary: 'falló',
        ErrorLogs: [
          {
            Id: 9,
            ExceptionType: 'Ex',
            ExceptionMessage: 'msg',
            Severity: 'Error',
            IsHandled: false,
          },
        ],
      },
    });
  });

  it('getRequestById sin wrapper data usa cuerpo raíz', () => {
    service.getRequestById(7).subscribe((res) => {
      expect(res.data.id).toBe(7);
    });
    const req = httpMock.expectOne('/api/admin/logs/requests/7');
    req.flush({
      Id: 7,
      HttpMethod: 'GET',
      Path: '/',
      StatusCode: 200,
      ElapsedMs: 0,
      IsSuccess: true,
      OccurredAt: '',
      CreatedAt: '',
      ErrorLogs: 'not-array',
    });
  });

  it('getErrors lista y filtros', () => {
    service
      .getErrors({
        tenantId: 1,
        userId: 2,
        severity: 'Error',
        exceptionType: 'NullRef',
        path: '/p',
        fromDate: 'a',
        toDate: 'b',
        isHandled: false,
        correlationId: 'cid',
        page: 2,
        pageSize: 15,
      })
      .subscribe((res) => {
        expect(res.data.errors.length).toBe(1);
        expect(res.data.errors[0].tenantName).toBe('T');
      });
    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/errors');
    expect(req.request.params.get('isHandled')).toBe('false');
    req.flush({
      data: {
        errors: [
          {
            id: 1,
            tenantName: 'T',
            severity: 'Error',
            isHandled: false,
            occurredAt: '',
            createdAt: '',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      },
    });
  });

  it('getErrorById', () => {
    service.getErrorById(2).subscribe((res) => {
      expect(res.data.id).toBe(2);
    });
    const req = httpMock.expectOne('/api/admin/logs/errors/2');
    req.flush({
      data: {
        Id: 2,
        Severity: 'Error',
        IsHandled: false,
        OccurredAt: '',
        CreatedAt: '',
      },
    });
  });

  it('getErrorsByCorrelation', () => {
    service.getErrorsByCorrelation('cid').subscribe((res) => {
      expect(res.data.correlationId).toBe('cid');
      expect(res.data.errors.length).toBe(0);
    });
    const req = httpMock.expectOne('/api/admin/logs/errors/by-correlation/cid');
    req.flush({
      data: { CorrelationId: 'cid', Errors: [], Count: 0 },
    });
  });

  it('getErrorsByCorrelation normaliza correlationId y count en camelCase', () => {
    service.getErrorsByCorrelation('track').subscribe((res) => {
      expect(res.data.correlationId).toBe('track');
      expect(res.data.count).toBe(2);
      expect(res.data.errors.length).toBe(1);
    });
    const req = httpMock.expectOne('/api/admin/logs/errors/by-correlation/track');
    req.flush({
      data: {
        correlationId: 'track',
        count: 2,
        errors: [
          {
            id: 1,
            severity: 'Warn',
            isHandled: true,
            occurredAt: 't',
            createdAt: 't',
          },
        ],
      },
    });
  });

  it('getAuditLogs con filtros', () => {
    service
      .getAuditLogs({
        tenantId: 1,
        userId: 2,
        actionType: 'UPDATE',
        entityType: 'User',
        entityId: 'e1',
        fromDate: 'a',
        toDate: 'b',
        correlationId: 'x',
        page: 1,
        pageSize: 10,
      })
      .subscribe();
    const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/audit');
    expect(req.request.params.get('entityType')).toBe('User');
    req.flush({ data: { events: [], total: 0 }, success: true });
  });

  it('getAuditLogById', () => {
    service.getAuditLogById(9).subscribe();
    const req = httpMock.expectOne('/api/admin/audit/9');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 9 }, success: true });
  });

  describe('handleError', () => {
    const requestsUrl = '/api/admin/logs/requests';

    it('ErrorEvent (cliente)', async () => {
      const pending = firstValueFrom(service.getRequests());
      const req = httpMock.expectOne((r) => r.url.split('?')[0] === requestsUrl);
      req.error(new ErrorEvent('error', { message: 'red' }));
      await expect(pending).rejects.toThrow(/Error: red/);
    });

    it('401', async () => {
      const pending = firstValueFrom(service.getRequests());
      const req = httpMock.expectOne((r) => r.url.split('?')[0] === requestsUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/i);
    });

    it('400 con detail', async () => {
      const pending = firstValueFrom(service.getRequests());
      const req = httpMock.expectOne((r) => r.url.split('?')[0] === requestsUrl);
      req.flush(
        { detail: 'Bad', title: '', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Bad/);
    });

    it('403 con title sin detail', async () => {
      const pending = firstValueFrom(service.getErrors());
      const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/logs/errors');
      req.flush(
        { detail: '', title: 'Prohibido', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/Prohibido/);
    });

    it('404 sin detail', async () => {
      const pending = firstValueFrom(service.getErrorById(1));
      const req = httpMock.expectOne('/api/admin/logs/errors/1');
      req.flush({}, { status: 404, statusText: 'Not Found' });
      await expect(pending).rejects.toThrow(/Recurso no encontrado/);
    });

    it('500 con detail', async () => {
      const pending = firstValueFrom(service.getAuditLogs());
      const req = httpMock.expectOne((r) => r.url.split('?')[0] === '/api/admin/audit');
      req.flush(
        { detail: 'Servidor', title: '', type: '', status: 500, instance: '' },
        { status: 500, statusText: 'Error' },
      );
      await expect(pending).rejects.toThrow(/Servidor/);
    });

    it('502 sin cuerpo usa error.message', async () => {
      const pending = firstValueFrom(service.getAuditLogById(1));
      const req = httpMock.expectOne('/api/admin/audit/1');
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      await expect(pending).rejects.toThrow();
    });
  });
});
