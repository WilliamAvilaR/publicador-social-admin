import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { TenantsService } from './tenants.service';
import type {
  TenantDetailRaw,
  TenantLimits,
  TenantStatusesResponse,
  TenantsListResponse,
} from '../models/tenant.model';

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

function minimalTenantDetailRaw(id: number): TenantDetailRaw {
  return {
    TenantId: id,
    Name: 'T',
    Slug: 't',
    Description: '',
    PlanCode: 'free',
    IsActive: true,
    SuspendedAt: null,
    ExternalKey: null,
    CreatedAt: '',
    UpdatedAt: '',
    Users: [],
    ActiveUsersCount: 0,
    ActiveSubscription: null,
  };
}

describe('TenantsService', () => {
  let service: TenantsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [TenantsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('HTTP exitoso', () => {
    it('getTenants sin params hace GET a /api/admin/tenants', () => {
      service.getTenants().subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === '/api/admin/tenants' && r.method === 'GET',
      );
      expect(req.request.params.keys().length).toBe(0);
      req.flush({ data: { Tenants: [], Total: 0 } } satisfies TenantsListResponse);
    });

    it('getTenants con objeto vacío no añade query params', () => {
      service.getTenants({}).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === '/api/admin/tenants' && r.method === 'GET',
      );
      expect(req.request.params.keys().length).toBe(0);
      req.flush({ data: { Tenants: [], Total: 0 } } satisfies TenantsListResponse);
    });

    it('getTenants con filtros envía query params esperados', () => {
      service
        .getTenants({
          search: 'acme',
          status: 'Active',
          planCode: 'pro',
          createdFrom: '2024-01-01',
          createdTo: '2024-12-31',
          page: 2,
          pageSize: 20,
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === '/api/admin/tenants' && r.method === 'GET',
      );
      const p = req.request.params;
      expect(p.get('Search')).toBe('acme');
      expect(p.get('Status')).toBe('Active');
      expect(p.get('PlanCode')).toBe('pro');
      expect(p.get('CreatedFrom')).toBe('2024-01-01');
      expect(p.get('CreatedTo')).toBe('2024-12-31');
      expect(p.get('Page')).toBe('2');
      expect(p.get('PageSize')).toBe('20');
      req.flush({ data: { Tenants: [], Total: 0 } });
    });

    it('getTenantById hace GET a /api/admin/tenants/:id', () => {
      service.getTenantById(42).subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/42');
      expect(req.request.method).toBe('GET');
      req.flush({
        data: minimalTenantDetailRaw(42),
        success: true,
      });
    });

    it('getTenantWorkspace hace GET a /api/admin/tenants/:id/workspace', () => {
      service.getTenantWorkspace(7).subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/7/workspace');
      expect(req.request.method).toBe('GET');
      req.flush({
        data: { tenantId: 7 },
        meta: emptyMeta,
      });
    });

    it('updateTenantStatus hace PATCH con body Status', () => {
      service.updateTenantStatus(3, 'suspended').subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/3/status');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ Status: 'suspended' });
      req.flush({ data: minimalTenantDetailRaw(3), success: true });
    });

    it('updateTenantPlan hace PATCH con body PlanCode', () => {
      service.updateTenantPlan(8, 'enterprise').subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/8/plan');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ PlanCode: 'enterprise' });
      req.flush({ data: minimalTenantDetailRaw(8), success: true });
    });

    it('getTenantLimits hace GET a /api/admin/tenants/:id/limits', () => {
      const limits: TenantLimits = {
        maxUsers: 10,
        maxStorageMB: 100,
        maxPostsPerMonth: 500,
        maxIntegrations: 3,
        maxCollections: 5,
      };
      service.getTenantLimits(1).subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/1/limits');
      expect(req.request.method).toBe('GET');
      req.flush({ data: limits, meta: emptyMeta });
    });

    it('updateTenantLimits hace PUT con el cuerpo de límites', () => {
      const body = {
        maxUsers: 20,
        maxStorageMB: 200,
        maxPostsPerMonth: 1000,
        maxIntegrations: 5,
        maxCollections: 10,
        notes: 'n',
      };
      service.updateTenantLimits(2, body).subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/2/limits');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({
        data: {
          maxUsers: 20,
          maxStorageMB: 200,
          maxPostsPerMonth: 1000,
          maxIntegrations: 5,
          maxCollections: 10,
          notes: 'n',
        },
        meta: emptyMeta,
      });
    });

    it('getTenantStatuses hace GET a /api/admin/tenants/statuses', () => {
      const res: TenantStatusesResponse = {
        data: { Statuses: [{ Value: 'Active', Label: 'Activo' }] },
        success: true,
      };
      service.getTenantStatuses().subscribe();

      const req = httpMock.expectOne('/api/admin/tenants/statuses');
      expect(req.request.method).toBe('GET');
      req.flush(res);
    });
  });

  describe('handleError (respuestas HTTP de error)', () => {
    it('mapea 400 usando detail del cuerpo', async () => {
      const pending = firstValueFrom(service.getTenants());
      const req = httpMock.expectOne('/api/admin/tenants');
      req.flush(
        { detail: 'Datos inválidos', title: 'Bad Request', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(pending).rejects.toThrow('Datos inválidos');
    });

    it('mapea 401 a mensaje de sesión', async () => {
      const pending = firstValueFrom(service.getTenantById(1));
      const req = httpMock.expectOne('/api/admin/tenants/1');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(pending).rejects.toThrow(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      );
    });

    it('mapea 404 con detail cuando existe', async () => {
      const pending = firstValueFrom(service.getTenantWorkspace(99));
      const req = httpMock.expectOne('/api/admin/tenants/99/workspace');
      req.flush(
        { detail: 'Tenant no encontrado', title: 'Not Found', type: '', status: 404, instance: '' },
        { status: 404, statusText: 'Not Found' },
      );

      await expect(pending).rejects.toThrow('Tenant no encontrado');
    });

    it('mapea 500 con detail cuando existe', async () => {
      const pending = firstValueFrom(service.getTenantStatuses());
      const req = httpMock.expectOne('/api/admin/tenants/statuses');
      req.flush(
        { detail: 'Fallo interno', title: 'Error', type: '', status: 500, instance: '' },
        { status: 500, statusText: 'Error' },
      );

      await expect(pending).rejects.toThrow('Fallo interno');
    });

    it('mapea 403 usando detail o título del cuerpo', async () => {
      const pending = firstValueFrom(service.getTenantLimits(5));
      const req = httpMock.expectOne('/api/admin/tenants/5/limits');
      req.flush(
        {
          detail: 'Sin permiso explícito',
          title: 'Forbidden',
          type: '',
          status: 403,
          instance: '',
        },
        { status: 403, statusText: 'Forbidden' },
      );

      await expect(pending).rejects.toThrow('Sin permiso explícito');
    });

    it('mapea código HTTP no contemplado con detail si viene en el cuerpo', async () => {
      const pending = firstValueFrom(service.updateTenantPlan(4, 'x'));
      const req = httpMock.expectOne('/api/admin/tenants/4/plan');
      req.flush(
        { detail: 'Conflicto de negocio', title: 'Conflict', type: '', status: 409, instance: '' },
        { status: 409, statusText: 'Conflict' },
      );

      await expect(pending).rejects.toThrow('Conflicto de negocio');
    });

    it('ErrorEvent en cliente', async () => {
      const pending = firstValueFrom(service.getTenants());
      const req = httpMock.expectOne('/api/admin/tenants');
      req.error(new ErrorEvent('error', { message: 'sin conexión' }));
      await expect(pending).rejects.toThrow(/Error: sin conexión/);
    });

    it('400 sin detail ni title usa mensaje por defecto', async () => {
      const pending = firstValueFrom(service.getTenantById(1));
      const req = httpMock.expectOne('/api/admin/tenants/1');
      req.flush({}, { status: 400, statusText: 'Bad Request' });
      await expect(pending).rejects.toThrow(/Solicitud inválida/);
    });

    it('400 con solo title', async () => {
      const pending = firstValueFrom(service.getTenantWorkspace(2));
      const req = httpMock.expectOne('/api/admin/tenants/2/workspace');
      req.flush(
        { detail: '', title: 'Solo título', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Solo título/);
    });

    it('403 con solo title', async () => {
      const pending = firstValueFrom(service.getTenantLimits(3));
      const req = httpMock.expectOne('/api/admin/tenants/3/limits');
      req.flush(
        { detail: '', title: 'Prohibido', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/Prohibido/);
    });

    it('403 sin cuerpo usa mensaje largo por defecto', async () => {
      const pending = firstValueFrom(service.updateTenantStatus(1, 'active'));
      const req = httpMock.expectOne('/api/admin/tenants/1/status');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      await expect(pending).rejects.toThrow(/No tienes permisos/);
    });

    it('404 sin detail', async () => {
      const pending = firstValueFrom(service.getTenantStatuses());
      const req = httpMock.expectOne('/api/admin/tenants/statuses');
      req.flush({}, { status: 404, statusText: 'Not Found' });
      await expect(pending).rejects.toThrow(/Recurso no encontrado/);
    });

    it('500 sin detail', async () => {
      const pending = firstValueFrom(
        service.updateTenantLimits(1, {
          maxUsers: 1,
          maxStorageMB: 1,
          maxPostsPerMonth: 1,
          maxIntegrations: 1,
          maxCollections: 1,
        }),
      );
      const req = httpMock.expectOne('/api/admin/tenants/1/limits');
      req.flush({}, { status: 500, statusText: 'Error' });
      await expect(pending).rejects.toThrow(/Error del servidor/);
    });

    it('default sin detail usa title', async () => {
      const pending = firstValueFrom(service.getTenants());
      const req = httpMock.expectOne('/api/admin/tenants');
      req.flush(
        { detail: '', title: 'Título 502', type: '', status: 502, instance: '' },
        { status: 502, statusText: 'Bad Gateway' },
      );
      await expect(pending).rejects.toThrow(/Título 502/);
    });

    it('default sin cuerpo usa error.message', async () => {
      const pending = firstValueFrom(service.getTenants());
      const req = httpMock.expectOne('/api/admin/tenants');
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      await expect(pending).rejects.toThrow();
    });

    it('default sin detail, title ni message conserva el mensaje genérico', async () => {
      const err = {
        error: {},
        status: 599,
        statusText: '',
        message: '',
        name: 'HttpErrorResponse',
        ok: false,
      } as HttpErrorResponse;

      const pending = firstValueFrom((service as unknown as { handleError(e: HttpErrorResponse) }).handleError(err));

      await expect(pending).rejects.toThrow('Ocurrió un error al procesar la solicitud');
    });
  });
});
