import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserSettingsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUserSettings hace GET /api/UserSettings', () => {
    service.getUserSettings().subscribe();
    const req = httpMock.expectOne('/api/UserSettings');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { language: 'es', theme: 'light' } });
  });

  it('updateUserSettings hace PUT con cuerpo', () => {
    const body = { language: 'en' };
    service.updateUserSettings(body).subscribe();
    const req = httpMock.expectOne('/api/UserSettings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ data: { language: 'en', theme: 'light' } });
  });

  it('handleError usa detail del cuerpo', async () => {
    const pending = firstValueFrom(service.getUserSettings());
    const req = httpMock.expectOne('/api/UserSettings');
    req.flush(
      { detail: 'fallo', title: 'T' },
      { status: 500, statusText: 'Error' },
    );
    await expect(pending).rejects.toThrow('fallo');
  });

  it('handleError con ErrorEvent del cliente', async () => {
    const pending = firstValueFrom(service.getUserSettings());
    const req = httpMock.expectOne('/api/UserSettings');
    req.error(new ErrorEvent('NetworkError', { message: 'cliente' }));
    await expect(pending).rejects.toThrow('Error: cliente');
  });

  it('handleError usa title si no hay detail', async () => {
    const pending = firstValueFrom(service.getUserSettings());
    const req = httpMock.expectOne('/api/UserSettings');
    req.flush({ title: 'Solo título' }, { status: 400, statusText: 'Bad Request' });
    await expect(pending).rejects.toThrow('Solo título');
  });

  it('handleError usa mensaje HttpErrorResponse si el cuerpo no aporta texto', async () => {
    const pending = firstValueFrom(service.getUserSettings());
    const req = httpMock.expectOne('/api/UserSettings');
    req.flush(null, { status: 502, statusText: 'Bad Gateway' });
    await expect(pending).rejects.toThrow(/502|Bad Gateway|Http failure/i);
  });

  it('updateUserSettings: handleError con title', async () => {
    const pending = firstValueFrom(service.updateUserSettings({ language: 'en' }));
    const req = httpMock.expectOne('/api/UserSettings');
    req.flush({ title: 'PUT falló' }, { status: 500, statusText: 'Error' });
    await expect(pending).rejects.toThrow('PUT falló');
  });

  it('updateUserSettings: handleError con ErrorEvent', async () => {
    const pending = firstValueFrom(service.updateUserSettings({}));
    const req = httpMock.expectOne('/api/UserSettings');
    req.error(new ErrorEvent('abort', { message: 'cancelado' }));
    await expect(pending).rejects.toThrow('Error: cancelado');
  });
});
