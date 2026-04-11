import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAdminInfo hace GET /api/admin/me', () => {
    service.getAdminInfo().subscribe();
    const req = httpMock.expectOne('/api/admin/me');
    expect(req.request.method).toBe('GET');
    req.flush({ data: {}, success: true });
  });

  it('getPlatformOwnerData hace GET /api/admin/platform-owners-only', () => {
    service.getPlatformOwnerData().subscribe();
    const req = httpMock.expectOne('/api/admin/platform-owners-only');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { message: 'ok' }, success: true });
  });

  it('getSensitiveData hace GET /api/admin/sensitive-data', () => {
    service.getSensitiveData().subscribe();
    const req = httpMock.expectOne('/api/admin/sensitive-data');
    expect(req.request.method).toBe('GET');
    req.flush({ data: {}, success: true });
  });

  it('handleError 401', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(pending).rejects.toThrow(/sesión ha expirado/i);
  });

  it('handleError — ErrorEvent (lado cliente)', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.error(new ErrorEvent('error', { message: 'fallo de red' }));
    await expect(pending).rejects.toThrow(/Error: fallo de red/);
  });

  it('handleError — 400 con detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: 'Payload inválido', title: '', type: '', status: 400, instance: '' },
      { status: 400, statusText: 'Bad Request' }
    );
    await expect(pending).rejects.toThrow(/Payload inválido/);
  });

  it('handleError — 400 con title si no hay detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: '', title: 'Solo título', type: '', status: 400, instance: '' },
      { status: 400, statusText: 'Bad Request' }
    );
    await expect(pending).rejects.toThrow(/Solo título/);
  });

  it('handleError — 400 mensaje por defecto sin detail ni title', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush({}, { status: 400, statusText: 'Bad Request' });
    await expect(pending).rejects.toThrow(/Solicitud inválida/);
  });

  it('handleError — 403 con detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: 'Prohibido explícito', title: '', type: '', status: 403, instance: '' },
      { status: 403, statusText: 'Forbidden' }
    );
    await expect(pending).rejects.toThrow(/Prohibido explícito/);
  });

  it('handleError — 403 con title si no hay detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: '', title: 'Rol insuficiente', type: '', status: 403, instance: '' },
      { status: 403, statusText: 'Forbidden' }
    );
    await expect(pending).rejects.toThrow(/Rol insuficiente/);
  });

  it('handleError — 403 mensaje por defecto', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    await expect(pending).rejects.toThrow(/No tienes permisos/);
  });

  it('handleError — 404 con detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: 'No existe', title: '', type: '', status: 404, instance: '' },
      { status: 404, statusText: 'Not Found' }
    );
    await expect(pending).rejects.toThrow(/No existe/);
  });

  it('handleError — 404 sin detail usa texto fijo', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush({}, { status: 404, statusText: 'Not Found' });
    await expect(pending).rejects.toThrow(/Recurso no encontrado/);
  });

  it('handleError — 500 con detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: 'DB caída', title: '', type: '', status: 500, instance: '' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await expect(pending).rejects.toThrow(/DB caída/);
  });

  it('handleError — 500 sin detail', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    await expect(pending).rejects.toThrow(/Error del servidor/);
  });

  it('handleError — otro código HTTP usa detail del cuerpo', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: 'Caso default', title: '', type: '', status: 418, instance: '' },
      { status: 418, statusText: "I'm a teapot" }
    );
    await expect(pending).rejects.toThrow(/Caso default/);
  });

  it('handleError — otro código sin detail usa title', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(
      { detail: '', title: 'Título genérico', type: '', status: 502, instance: '' },
      { status: 502, statusText: 'Bad Gateway' }
    );
    await expect(pending).rejects.toThrow(/Título genérico/);
  });

  it('handleError — otro código sin cuerpo usa error.message', async () => {
    const pending = firstValueFrom(service.getAdminInfo());
    const req = httpMock.expectOne('/api/admin/me');
    req.flush(null, { status: 502, statusText: 'Bad Gateway' });
    await expect(pending).rejects.toThrow();
  });
});
