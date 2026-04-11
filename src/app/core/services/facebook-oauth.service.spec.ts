import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { FacebookOAuthService } from './facebook-oauth.service';

describe('FacebookOAuthService', () => {
  let service: FacebookOAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FacebookOAuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FacebookOAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAuthUrl hace GET /api/Facebook/auth-url', () => {
    service.getAuthUrl().subscribe((r) => {
      expect(r.data.authUrl).toBe('https://fb');
    });
    const req = httpMock.expectOne('/api/Facebook/auth-url');
    expect(req.request.method).toBe('GET');
    req.flush({ data: { authUrl: 'https://fb' } });
  });

  it('handleCallback hace POST con code y state', () => {
    service.handleCallback('c', 's').subscribe();
    const req = httpMock.expectOne('/api/Facebook/callback');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'c', state: 's' });
    req.flush({ ok: true });
  });
});
