import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  let service: PlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlansService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getPlans hace GET a /api/admin/plans', () => {
    service.getPlans().subscribe();
    const req = httpMock.expectOne('/api/admin/plans');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { plans: [] }, success: true });
  });

  it('getPublicPlans hace GET a /api/public/plans', () => {
    service.getPublicPlans().subscribe();
    const req = httpMock.expectOne('/api/public/plans');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { plans: [] }, success: true });
  });

  it('getPlanById hace GET a /api/admin/plans/:id', () => {
    service.getPlanById(9).subscribe();
    const req = httpMock.expectOne('/api/admin/plans/9');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { planId: 9 }, success: true });
  });

  it('getPlanByCode hace GET a /api/admin/plans/by-code/:code', () => {
    service.getPlanByCode('pro').subscribe();
    const req = httpMock.expectOne('/api/admin/plans/by-code/pro');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { planId: 1 }, success: true });
  });

  it('createPlan hace POST con cuerpo', () => {
    const body = { code: 'x', name: 'N', isActive: true } as any;
    service.createPlan(body).subscribe();
    const req = httpMock.expectOne('/api/admin/plans');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ data: {}, success: true });
  });

  it('updatePlan hace PUT', () => {
    const body = { name: 'U' } as any;
    service.updatePlan(2, body).subscribe();
    const req = httpMock.expectOne('/api/admin/plans/2');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: {}, success: true });
  });

  it('updatePlanFeatures hace PUT a .../features', () => {
    const body = { features: [] } as any;
    service.updatePlanFeatures(3, body).subscribe();
    const req = httpMock.expectOne('/api/admin/plans/3/features');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: {}, success: true });
  });

  it('updatePlanLimits hace PUT a .../limits', () => {
    const body = { limits: [] } as any;
    service.updatePlanLimits(4, body).subscribe();
    const req = httpMock.expectOne('/api/admin/plans/4/limits');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: {}, success: true });
  });

  it('getPlanDefinitions hace GET a .../definitions', () => {
    service.getPlanDefinitions().subscribe();
    const req = httpMock.expectOne('/api/admin/plans/definitions');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { features: [], limits: [] }, success: true });
  });

  describe('handleError', () => {
    const plansListUrl = '/api/admin/plans';

    it('ErrorEvent (lado cliente)', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.error(new ErrorEvent('error', { message: 'fallo de red' }));
      await expect(pending).rejects.toThrow(/Error: fallo de red/);
    });

    it('401', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/i);
    });

    it('400 con detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: 'Payload inválido', title: '', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Payload inválido/);
    });

    it('400 con title si no hay detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: '', title: 'Solo título', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Solo título/);
    });

    it('400 mensaje por defecto sin detail ni title', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush({}, { status: 400, statusText: 'Bad Request' });
      await expect(pending).rejects.toThrow(/Solicitud inválida/);
    });

    it('403 con detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: 'denegado', title: '', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/denegado/);
    });

    it('403 con title si no hay detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: '', title: 'Rol insuficiente', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/Rol insuficiente/);
    });

    it('403 mensaje por defecto', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      await expect(pending).rejects.toThrow(/No tienes permisos/);
    });

    it('404 con detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: 'Plan borrado', title: '', type: '', status: 404, instance: '' },
        { status: 404, statusText: 'Not Found' },
      );
      await expect(pending).rejects.toThrow(/Plan borrado/);
    });

    it('404 sin detail usa Plan no encontrado', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush({}, { status: 404, statusText: 'Not Found' });
      await expect(pending).rejects.toThrow(/Plan no encontrado/);
    });

    it('500 con detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: 'DB caída', title: '', type: '', status: 500, instance: '' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      await expect(pending).rejects.toThrow(/DB caída/);
    });

    it('500 sin detail', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
      await expect(pending).rejects.toThrow(/Error del servidor/);
    });

    it('otro código HTTP usa detail del cuerpo', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: 'Caso default', title: '', type: '', status: 418, instance: '' },
        { status: 418, statusText: "I'm a teapot" },
      );
      await expect(pending).rejects.toThrow(/Caso default/);
    });

    it('otro código sin detail usa title', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(
        { detail: '', title: 'Título genérico', type: '', status: 502, instance: '' },
        { status: 502, statusText: 'Bad Gateway' },
      );
      await expect(pending).rejects.toThrow(/Título genérico/);
    });

    it('otro código sin cuerpo usa error.message', async () => {
      const pending = firstValueFrom(service.getPlans());
      const req = httpMock.expectOne(plansListUrl);
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      await expect(pending).rejects.toThrow();
    });

    it('mismo handleError en getPublicPlans', async () => {
      const pending = firstValueFrom(service.getPublicPlans());
      const req = httpMock.expectOne('/api/public/plans');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/i);
    });
  });
});
