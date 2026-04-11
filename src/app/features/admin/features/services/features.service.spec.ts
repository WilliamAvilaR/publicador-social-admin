import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  let service: FeaturesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeaturesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FeaturesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getFeaturesCatalog hace GET /api/admin/features/catalog', () => {
    service.getFeaturesCatalog().subscribe();
    const req = httpMock.expectOne('/api/admin/features/catalog');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { modules: [], networks: [] }, success: true });
  });

  it('getLimitsCatalog hace GET /api/admin/features/limits/catalog', () => {
    service.getLimitsCatalog().subscribe();
    const req = httpMock.expectOne('/api/admin/features/limits/catalog');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { limits: [] }, success: true });
  });

  it('handleError 403', async () => {
    const pending = firstValueFrom(service.getFeaturesCatalog());
    const req = httpMock.expectOne('/api/admin/features/catalog');
    req.flush(
      { detail: 'denegado', title: 'F', type: '', status: 403, instance: '' },
      { status: 403, statusText: 'Forbidden' },
    );
    await expect(pending).rejects.toThrow('denegado');
  });

  describe('handleError', () => {
    const catalogUrl = '/api/admin/features/catalog';

    it('ErrorEvent (lado cliente)', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.error(new ErrorEvent('error', { message: 'fallo de red' }));
      await expect(pending).rejects.toThrow(/Error: fallo de red/);
    });

    it('401', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/i);
    });

    it('400 con detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: 'Payload inválido', title: '', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Payload inválido/);
    });

    it('400 con title si no hay detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: '', title: 'Solo título', type: '', status: 400, instance: '' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(pending).rejects.toThrow(/Solo título/);
    });

    it('400 mensaje por defecto sin detail ni title', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush({}, { status: 400, statusText: 'Bad Request' });
      await expect(pending).rejects.toThrow(/Solicitud inválida/);
    });

    it('403 con title si no hay detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: '', title: 'Rol insuficiente', type: '', status: 403, instance: '' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(pending).rejects.toThrow(/Rol insuficiente/);
    });

    it('403 mensaje por defecto', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
      await expect(pending).rejects.toThrow(/No tienes permisos/);
    });

    it('404 con detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: 'No existe', title: '', type: '', status: 404, instance: '' },
        { status: 404, statusText: 'Not Found' },
      );
      await expect(pending).rejects.toThrow(/No existe/);
    });

    it('404 sin detail usa texto fijo', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush({}, { status: 404, statusText: 'Not Found' });
      await expect(pending).rejects.toThrow(/Recurso no encontrado/);
    });

    it('500 con detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: 'DB caída', title: '', type: '', status: 500, instance: '' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      await expect(pending).rejects.toThrow(/DB caída/);
    });

    it('500 sin detail', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
      await expect(pending).rejects.toThrow(/Error del servidor/);
    });

    it('otro código HTTP usa detail del cuerpo', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: 'Caso default', title: '', type: '', status: 418, instance: '' },
        { status: 418, statusText: "I'm a teapot" },
      );
      await expect(pending).rejects.toThrow(/Caso default/);
    });

    it('otro código sin detail usa title', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(
        { detail: '', title: 'Título genérico', type: '', status: 502, instance: '' },
        { status: 502, statusText: 'Bad Gateway' },
      );
      await expect(pending).rejects.toThrow(/Título genérico/);
    });

    it('otro código sin cuerpo usa error.message', async () => {
      const pending = firstValueFrom(service.getFeaturesCatalog());
      const req = httpMock.expectOne(catalogUrl);
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      await expect(pending).rejects.toThrow();
    });

    it('getLimitsCatalog usa el mismo handleError', async () => {
      const pending = firstValueFrom(service.getLimitsCatalog());
      const req = httpMock.expectOne('/api/admin/features/limits/catalog');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      await expect(pending).rejects.toThrow(/sesión ha expirado/i);
    });
  });
});
