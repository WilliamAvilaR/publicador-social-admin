import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ColDef, ICellRendererParams, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community';
import { SupportDashboardComponent } from './support-dashboard.component';
import { SupportService } from '../../services/support.service';

describe('SupportDashboardComponent', () => {
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
  const router = {
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({})),
    serializeUrl: vi.fn(() => ''),
  };
  const supportService = {
    getRequests: vi.fn(() =>
      of({
        data: {
          requests: [],
          total: 0,
          totalPages: 0,
          page: 1,
          pageSize: 20,
        },
      } as any),
    ),
    getErrors: vi.fn(() =>
      of({
        data: { errors: [], total: 0, totalPages: 0 },
      } as any),
    ),
    getAuditLogs: vi.fn(() =>
      of({
        data: { AuditLogs: [], Total: 0, TotalPages: 0 },
      } as any),
    ),
    getErrorById: vi.fn(() =>
      of({ data: { id: 1, severity: 'error', isHandled: false, occurredAt: '', createdAt: '' } } as any),
    ),
    getRequestById: vi.fn(() =>
      of({
        data: {
          id: 1,
          correlationId: 'c',
          httpMethod: 'GET',
          path: '/',
          statusCode: 200,
          elapsedMs: 1,
          isSuccess: true,
          occurredAt: '',
          createdAt: '',
          errorLogs: [],
        },
      } as any),
    ),
    getAuditLogById: vi.fn(() =>
      of({
        data: {
          Id: 1,
          UserId: 1,
          UserName: 'u',
          UserEmail: 'e',
          ActionType: 'a',
          EntityType: 't',
          EntityId: '1',
          Description: 'd',
          OccurredAt: '',
          CreatedAt: '',
        },
      } as any),
    ),
  };

  afterEach(() => {
    vi.mocked(supportService.getErrors).mockReset();
    vi.mocked(supportService.getErrors).mockImplementation(() =>
      of({ data: { errors: [], total: 0, totalPages: 0 } } as any),
    );
    vi.mocked(supportService.getRequests).mockReset();
    vi.mocked(supportService.getRequests).mockImplementation(() =>
      of({
        data: {
          requests: [],
          total: 0,
          totalPages: 0,
          page: 1,
          pageSize: 20,
        },
      } as any),
    );
  });

  beforeEach(() => {
    queryParamMap$.next(convertToParamMap({}));
    TestBed.configureTestingModule({
      imports: [SupportDashboardComponent],
      providers: [
        { provide: SupportService, useValue: supportService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('crea y carga requests por defecto', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    expect(supportService.getRequests).toHaveBeenCalled();
    expect(fixture.componentInstance.activeSubTab).toBe('requests');
  });

  it('setSupportSubTab navega y recarga datos', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    vi.mocked(supportService.getErrors).mockClear();
    fixture.componentInstance.setSupportSubTab('errors');
    expect(router.navigate).toHaveBeenCalled();
    expect(supportService.getErrors).toHaveBeenCalled();
  });

  it('utilidades de severidad, HTTP, fechas y texto', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    expect(c.getSeverityClass('Critical')).toBe('severity-high');
    expect(c.getSeverityClass('warning')).toBe('severity-medium');
    expect(c.getSeverityLabel('error')).toBe('Error');
    expect(c.getSeverityLabel('')).toBe('Desconocido');
    expect(c.getStatusClass(200)).toBe('status-success');
    expect(c.getStatusClass(500)).toBe('status-error');
    expect(c.requestHttpMethodClass('POST')).toBe('method-post');
    expect(c.requestHttpMethodClass('FOO')).toBe('method-unknown');
    expect(c.formatDate('')).toBe('');
    expect(c.formatDateTimeCompact('')).toBe('');
    expect(c.formatDateTimeCompact('2024-06-15T12:00:00.000Z')).toMatch(/\d/);
    expect(c.truncateText(null, 5)).toBe('—');
    expect(c.truncateText('abcdefghij', 5)).toContain('…');
    expect(c.shortCorrelationId('')).toBe('—');
    expect(c.shortCorrelationId('short')).toBe('short');
    expect(c.shortCorrelationId('0123456789abcdef0123456789ab')).toMatch(/…/);
  });

  it('toggleAdvancedRequestSearch alterna el panel', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    expect(c.showAdvancedRequestSearch).toBe(false);
    c.toggleAdvancedRequestSearch();
    expect(c.showAdvancedRequestSearch).toBe(true);
  });

  it('applyErrorFilters y clearErrorFilters vuelven a cargar errores', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getErrors).mockClear();
    const c = fixture.componentInstance;
    c.setSupportSubTab('errors');
    vi.mocked(supportService.getErrors).mockClear();
    c.applyErrorFilters();
    expect(supportService.getErrors).toHaveBeenCalled();
    vi.mocked(supportService.getErrors).mockClear();
    c.clearErrorFilters();
    expect(supportService.getErrors).toHaveBeenCalled();
  });

  it('goToErrorsPage respeta total de páginas', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setSupportSubTab('errors');
    vi.mocked(supportService.getErrors).mockClear();
    c.errorsTotalPages = 3;
    c.errorsPage = 1;
    c.goToErrorsPage(2);
    expect(c.errorsPage).toBe(2);
    expect(supportService.getErrors).toHaveBeenCalled();
    c.goToErrorsPage(99);
    expect(c.errorsPage).toBe(2);
  });

  it('reloadActiveSubTab recarga la subpestaña activa', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    fixture.componentInstance.reloadActiveSubTab();
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('viewLogs fija filtro por usuario y carga requests', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    const c = fixture.componentInstance;
    c.viewLogs(42);
    expect(c.activeSubTab).toBe('requests');
    expect(c.requestFilters.userId).toBe(42);
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('snapshot subtab=errors abre pestaña errores sin cargar requests', () => {
    const errMap = convertToParamMap({ subtab: 'errors' });
    const qp$ = new BehaviorSubject(errMap);
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { queryParamMap: errMap },
        queryParamMap: qp$.asObservable(),
      },
    });
    vi.mocked(supportService.getRequests).mockClear();
    vi.mocked(supportService.getErrors).mockClear();
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeSubTab).toBe('errors');
    expect(supportService.getErrors).toHaveBeenCalled();
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('setSupportSubTab no hace nada si la pestaña ya está activa', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    vi.mocked(router.navigate).mockClear();
    fixture.componentInstance.setSupportSubTab('requests');
    expect(supportService.getRequests).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('isLoadingActiveSubTab refleja la carga de la subpestaña visible', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.activeSubTab = 'requests';
    c.isLoadingRequests = true;
    c.isLoadingErrors = false;
    expect(c.isLoadingActiveSubTab).toBe(true);
    c.activeSubTab = 'errors';
    c.isLoadingRequests = false;
    c.isLoadingErrors = true;
    expect(c.isLoadingActiveSubTab).toBe(true);
  });

  it('getStatusClass cubre 3xx y rango intermedio', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    expect(c.getStatusClass(304)).toBe('status-info');
    expect(c.getStatusClass(100)).toBe('status-info');
  });

  it('loadErrors y loadRequests ante error HTTP guardan mensaje', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setSupportSubTab('errors');
    vi.mocked(supportService.getErrors).mockReturnValueOnce(
      throwError(() => new Error('fallo errores')),
    );
    c.loadErrors();
    expect(c.errorMessage).toContain('fallo errores');
    vi.mocked(supportService.getRequests).mockReturnValueOnce(
      throwError(() => new Error('fallo requests')),
    );
    c.loadRequests();
    expect(c.errorMessage).toContain('fallo requests');
  });

  it('loadAuditLogs completa datos o mensaje de error', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.loadAuditLogs();
    expect(supportService.getAuditLogs).toHaveBeenCalled();
    expect(c.isLoadingAudit).toBe(false);
    vi.mocked(supportService.getAuditLogs).mockReturnValueOnce(
      throwError(() => new Error('audit fail')),
    );
    c.loadAuditLogs();
    expect(c.errorMessage).toContain('audit fail');
  });

  it('applyRequestFilters y clearRequestFilters recargan requests', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.requestQuickQuery = '  q  ';
    vi.mocked(supportService.getRequests).mockClear();
    c.applyRequestFilters();
    expect(c.requestFilters.query).toBe('q');
    expect(supportService.getRequests).toHaveBeenCalled();
    c.clearRequestFilters();
    expect(c.requestQuickQuery).toBe('');
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('applyAuditFilters y clearAuditFilters recargan auditoría', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    vi.mocked(supportService.getAuditLogs).mockClear();
    c.applyAuditFilters();
    expect(supportService.getAuditLogs).toHaveBeenCalled();
    vi.mocked(supportService.getAuditLogs).mockClear();
    c.clearAuditFilters();
    expect(supportService.getAuditLogs).toHaveBeenCalled();
  });

  it('paginación y tamaño de página en errores', () => {
    vi.mocked(supportService.getErrors).mockImplementation(() =>
      of({ data: { errors: [], total: 0, totalPages: 2 } } as any),
    );
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setSupportSubTab('errors');
    expect(c.errorsTotalPages).toBe(2);
    c.errorsPage = 2;
    vi.mocked(supportService.getErrors).mockClear();
    c.goToFirstErrorsPage();
    expect(c.errorsPage).toBe(1);
    c.errorsPage = 1;
    c.errorsTotalPages = 2;
    c.goToLastErrorsPage();
    expect(c.errorsPage).toBe(2);
    vi.mocked(supportService.getErrors).mockClear();
    c.onErrorsPageSizeChange('50');
    expect(c.errorsPageSize).toBe(50);
    c.onErrorsPageSizeChange('no');
    expect(c.errorsPageSize).toBe(50);
  });

  it('paginación y tamaño de página en requests', () => {
    vi.mocked(supportService.getRequests).mockImplementation(() =>
      of({
        data: {
          requests: [],
          total: 0,
          totalPages: 2,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.requestsTotalPages).toBe(2);
    c.requestsPage = 2;
    vi.mocked(supportService.getRequests).mockClear();
    c.goToFirstRequestsPage();
    expect(c.requestsPage).toBe(1);
    c.requestsPage = 1;
    c.requestsTotalPages = 2;
    c.goToLastRequestsPage();
    expect(c.requestsPage).toBe(2);
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestsPageSizeChange(10);
    expect(c.requestsPageSize).toBe(10);
  });

  it('goToAuditPage respeta total de páginas de auditoría', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.auditTotalPages = 2;
    vi.mocked(supportService.getAuditLogs).mockClear();
    c.goToAuditPage(2);
    expect(c.auditPage).toBe(2);
    c.goToAuditPage(10);
    expect(c.auditPage).toBe(2);
  });

  it('viewErrorDetail, viewRequestDetail y viewAuditDetail abren modales', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.viewErrorDetail({
      id: 9,
      severity: 'error',
      isHandled: false,
      occurredAt: '',
      createdAt: '',
    } as any);
    expect(supportService.getErrorById).toHaveBeenCalledWith(9);
    expect(c.showErrorDetail).toBe(true);
    c.viewRequestDetail({
      id: 8,
      correlationId: 'x',
      httpMethod: 'GET',
      path: '/',
      statusCode: 200,
      elapsedMs: 1,
      isSuccess: true,
      occurredAt: '',
      createdAt: '',
    } as any);
    expect(supportService.getRequestById).toHaveBeenCalledWith(8);
    expect(c.showRequestDetail).toBe(true);
    c.viewAuditDetail({
      Id: 7,
      UserId: 1,
      UserName: '',
      UserEmail: '',
      ActionType: '',
      EntityType: '',
      EntityId: '',
      Description: '',
      OccurredAt: '',
      CreatedAt: '',
    } as any);
    expect(supportService.getAuditLogById).toHaveBeenCalledWith(7);
    expect(c.showAuditDetail).toBe(true);
  });

  it('onRequestGridRowClicked y onErrorGridRowClicked ignoran fila sin data', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    vi.mocked(supportService.getRequestById).mockClear();
    c.onRequestGridRowClicked({ data: undefined } as any);
    expect(supportService.getRequestById).not.toHaveBeenCalled();
    vi.mocked(supportService.getErrorById).mockClear();
    c.onErrorGridRowClicked({ data: undefined } as any);
    expect(supportService.getErrorById).not.toHaveBeenCalled();
  });

  it('onRequestGridSortChanged aplica nuevo campo y dirección', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestGridSortChanged({
      api: {
        getColumnState: () => [{ colId: 'statusCode', sort: 'asc' }],
      },
    } as any);
    expect(c.requestSortBy).toBe('statusCode');
    expect(c.requestSortDir).toBe('asc');
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('onRequestGridSortChanged no recarga si el orden efectivo ya coincide', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestGridSortChanged({
      api: {
        getColumnState: () => [{ colId: 'occurredAt', sort: 'desc' }],
      },
    } as any);
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('closeErrorDetail, closeRequestDetail y closeAuditDetail limpian estado', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.showErrorDetail = true;
    c.selectedError = {} as any;
    c.closeErrorDetail();
    expect(c.showErrorDetail).toBe(false);
    expect(c.selectedError).toBeNull();
    c.showRequestDetail = true;
    c.selectedRequest = {} as any;
    c.closeRequestDetail();
    expect(c.showRequestDetail).toBe(false);
    c.showAuditDetail = true;
    c.selectedAudit = {} as any;
    c.closeAuditDetail();
    expect(c.showAuditDetail).toBe(false);
  });

  it('reloadActiveSubTab recarga errores cuando la pestaña es errors', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.activeSubTab = 'errors';
    vi.mocked(supportService.getErrors).mockClear();
    c.reloadActiveSubTab();
    expect(supportService.getErrors).toHaveBeenCalled();
  });

  it('buildRequestsListParams incluye filtros avanzados al cargar requests', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.requestFilters.tenantId = 3;
    c.requestFilters.userId = 4;
    c.requestFilters.method = ' GET ';
    c.requestDateFilters.fromDate = '2024-06-01T10:00';
    vi.mocked(supportService.getRequests).mockClear();
    c.loadRequests();
    const lastCall = vi.mocked(supportService.getRequests).mock.calls.at(-1)?.[0] as any;
    expect(lastCall.tenantId).toBe(3);
    expect(lastCall.userId).toBe(4);
    expect(lastCall.method).toBe('GET');
    expect(lastCall.fromDate).toBeDefined();
  });

  it('queryParamMap cambia de requests a errors y recarga', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getErrors).mockClear();
    queryParamMap$.next(convertToParamMap({ subtab: 'errors' }));
    expect(fixture.componentInstance.activeSubTab).toBe('errors');
    expect(supportService.getErrors).toHaveBeenCalled();
  });

  it('queryParamMap no recarga si subtab no cambia', () => {
    queryParamMap$.next(convertToParamMap({ subtab: 'requests' }));
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    queryParamMap$.next(convertToParamMap({ subtab: 'requests' }));
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('queryParamMap vuelve de errors a requests y recarga', () => {
    queryParamMap$.next(convertToParamMap({ subtab: 'errors' }));
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    queryParamMap$.next(convertToParamMap({ subtab: 'requests' }));
    expect(fixture.componentInstance.activeSubTab).toBe('requests');
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('retrySync sin confirmación no hace nada', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    fixture.componentInstance.retrySync(1);
    expect(fixture.componentInstance.successMessage).toBe('');
    vi.unstubAllGlobals();
  });

  it('retrySync con confirmación limpia mensaje y recarga tras timeout', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    vi.mocked(supportService.getRequests).mockClear();
    const c = fixture.componentInstance;
    c.retrySync(9);
    expect(c.successMessage).toBe('Sincronización iniciada');
    vi.advanceTimersByTime(2000);
    expect(c.successMessage).toBe('');
    expect(supportService.getRequests).toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('getSeverityLabel cubre critical y warning', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    expect(c.getSeverityLabel('critical')).toBe('Crítico');
    expect(c.getSeverityLabel('warning')).toBe('Advertencia');
    expect(c.getSeverityLabel('otro')).toBe('otro');
  });

  it('getStatusClass cubre 4xx', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    expect(fixture.componentInstance.getStatusClass(404)).toBe('status-warning');
  });

  it('formatDate con valor válido devuelve texto localizado', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const s = fixture.componentInstance.formatDate('2024-06-15T12:00:00.000Z');
    expect(s.length).toBeGreaterThan(0);
  });

  it('loadErrors con solo no manejados fuerza isHandled false', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.setSupportSubTab('errors');
    c.errorOnlyUnhandled = true;
    vi.mocked(supportService.getErrors).mockClear();
    c.loadErrors();
    const params = vi.mocked(supportService.getErrors).mock.calls.at(-1)?.[0] as any;
    expect(params.isHandled).toBe(false);
  });

  it('loadRequests actualiza página si la API devuelve page', () => {
    vi.mocked(supportService.getRequests).mockReturnValueOnce(
      of({
        data: {
          requests: [],
          total: 0,
          totalPages: 1,
          page: 7,
          pageSize: 20,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.requestsPage).toBe(7);
  });

  it('buildRequestsListParams incluye path, rangos de status, tiempos e isSuccess', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.requestFilters.path = ' /p ';
    c.requestFilters.exactPath = true;
    c.requestFilters.statusCode = 500;
    c.requestFilters.statusCodeFrom = 500;
    c.requestFilters.statusCodeTo = 599;
    c.requestFilters.minElapsedMs = 100;
    c.requestFilters.maxElapsedMs = 9000;
    c.requestFilters.isSuccess = false;
    c.requestFilters.ipAddress = ' 10.0.0.1 ';
    c.requestFilters.browserFamily = ' Firefox ';
    c.requestFilters.query = ' err ';
    c.requestDateFilters.toDate = '2024-12-31T22:00';
    (c.requestFilters as any).tenantId = 'x';
    (c.requestFilters as any).userId = '';
    vi.mocked(supportService.getRequests).mockClear();
    c.loadRequests();
    const p = vi.mocked(supportService.getRequests).mock.calls.at(-1)?.[0] as any;
    expect(p.path).toBe('/p');
    expect(p.exactPath).toBe(true);
    expect(p.statusCode).toBe(500);
    expect(p.statusCodeFrom).toBe(500);
    expect(p.statusCodeTo).toBe(599);
    expect(p.minElapsedMs).toBe(100);
    expect(p.maxElapsedMs).toBe(9000);
    expect(p.isSuccess).toBe(false);
    expect(p.ipAddress).toBe('10.0.0.1');
    expect(p.browserFamily).toBe('Firefox');
    expect(p.query).toBe('err');
    expect(p.toDate).toBeDefined();
    expect(p.tenantId).toBeUndefined();
    expect(p.userId).toBeUndefined();
  });

  it('goToFirstErrorsPage no avanza si ya está en página 1', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.errorsPage = 1;
    c.errorsTotalPages = 5;
    vi.mocked(supportService.getErrors).mockClear();
    c.goToFirstErrorsPage();
    expect(supportService.getErrors).not.toHaveBeenCalled();
  });

  it('goToLastErrorsPage no hace nada si no hay páginas', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.errorsTotalPages = 0;
    c.errorsPage = 1;
    vi.mocked(supportService.getErrors).mockClear();
    c.goToLastErrorsPage();
    expect(c.errorsPage).toBe(1);
    expect(supportService.getErrors).not.toHaveBeenCalled();
  });

  it('goToFirstRequestsPage no avanza si ya está en página 1', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.requestsPage = 1;
    c.requestsTotalPages = 3;
    vi.mocked(supportService.getRequests).mockClear();
    c.goToFirstRequestsPage();
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('goToLastRequestsPage no hace nada si no hay páginas', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.requestsTotalPages = 0;
    c.requestsPage = 1;
    vi.mocked(supportService.getRequests).mockClear();
    c.goToLastRequestsPage();
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('goToLastRequestsPage no hace nada si ya está en la última página', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.requestsTotalPages = 4;
    c.requestsPage = 4;
    vi.mocked(supportService.getRequests).mockClear();
    c.goToLastRequestsPage();
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('detalle de error, request y auditoría ante error HTTP', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    vi.mocked(supportService.getErrorById).mockReturnValueOnce(
      throwError(() => new Error('e1')),
    );
    c.viewErrorDetail({
      id: 1,
      severity: 'error',
      isHandled: false,
      occurredAt: '',
      createdAt: '',
    } as any);
    expect(c.errorMessage).toContain('e1');
    vi.mocked(supportService.getRequestById).mockReturnValueOnce(
      throwError(() => new Error('e2')),
    );
    c.viewRequestDetail({
      id: 2,
      correlationId: 'c',
      httpMethod: 'GET',
      path: '/',
      statusCode: 200,
      elapsedMs: 1,
      isSuccess: true,
      occurredAt: '',
      createdAt: '',
    } as any);
    expect(c.errorMessage).toContain('e2');
    vi.mocked(supportService.getAuditLogById).mockReturnValueOnce(
      throwError(() => new Error('e3')),
    );
    c.viewAuditDetail({
      Id: 3,
      UserId: 1,
      UserName: '',
      UserEmail: '',
      ActionType: '',
      EntityType: '',
      EntityId: '',
      Description: '',
      OccurredAt: '',
      CreatedAt: '',
    } as any);
    expect(c.errorMessage).toContain('e3');
  });

  it('onRequestGridSortChanged con colId desconocido normaliza a occurredAt y recarga', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.requestSortBy = 'statusCode';
    c.requestSortDir = 'asc';
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestGridSortChanged({
      api: {
        getColumnState: () => [{ colId: 'noExisteEnMapa', sort: 'desc' }],
      },
    } as any);
    expect(c.requestSortBy).toBe('occurredAt');
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('callbacks de columnas AG Grid (errores y requests) ejecutan sin lanzar', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    const errRow: any = {
      occurredAt: '2024-01-01T12:00:00Z',
      severity: 'warning',
      statusCode: 500,
      httpMethod: 'POST',
      path: '/x',
      exceptionType: 'Ex',
      exceptionMessage: 'Msg',
      tenantName: null,
      isHandled: true,
    };
    for (const col of c.errorGridColumnDefs as ColDef<any>[]) {
      const base = { data: errRow, value: errRow[col.field as keyof typeof errRow] } as ValueFormatterParams &
        ValueGetterParams;
      if (col.valueFormatter) col.valueFormatter(base as ValueFormatterParams);
      if (col.valueGetter) col.valueGetter(base as ValueGetterParams);
      if (col.cellClass) col.cellClass(base as any);
      if (col.cellRenderer) (col.cellRenderer as (p: ICellRendererParams) => string)(base as ICellRendererParams);
    }
    const reqRow: any = {
      occurredAt: '2024-01-01T12:00:00Z',
      httpMethod: 'DELETE',
      statusCode: 201,
      elapsedMs: 12,
      path: '/a',
      tenantName: undefined,
      userId: 9,
      browserFamily: null,
      isSuccess: false,
    };
    for (const col of c.requestGridColumnDefs as ColDef<any>[]) {
      const base = { data: reqRow, value: reqRow[col.field as keyof typeof reqRow] } as any;
      if (col.valueFormatter) col.valueFormatter(base);
      if (col.valueGetter) col.valueGetter(base);
      if (col.cellClass) col.cellClass(base);
      if (col.cellRenderer) (col.cellRenderer as (p: ICellRendererParams) => string)(base);
      if (col.tooltipValueGetter) col.tooltipValueGetter(base);
    }
    expect(true).toBe(true);
  });

  it('truncateText devuelve texto corto sin elipsis', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    expect(fixture.componentInstance.truncateText('abc', 5)).toBe('abc');
  });

  it('getSeverityClass usa severidad baja para valores desconocidos', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    expect(c.getSeverityClass('info')).toBe('severity-low');
    expect(c.getSeverityClass('')).toBe('severity-low');
    expect(c.getSeverityClass(undefined as unknown as string)).toBe('severity-low');
  });

  it('getSeverityLabel sin valor usa Desconocido', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    expect(fixture.componentInstance.getSeverityLabel(undefined as unknown as string)).toBe(
      'Desconocido',
    );
  });

  it('onRequestsPageSizeChange ignora valores no finitos', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const prev = c.requestsPageSize;
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestsPageSizeChange(Number.NaN);
    expect(c.requestsPageSize).toBe(prev);
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('goToRequestsPage ignora página fuera de rango', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.requestsTotalPages = 2;
    c.requestsPage = 1;
    vi.mocked(supportService.getRequests).mockClear();
    c.goToRequestsPage(5);
    expect(c.requestsPage).toBe(1);
    expect(supportService.getRequests).not.toHaveBeenCalled();
  });

  it('onRequestGridSortChanged con colId vacío normaliza sort por occurredAt', () => {
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.requestSortBy = 'elapsedMs';
    c.requestSortDir = 'desc';
    vi.mocked(supportService.getRequests).mockClear();
    c.onRequestGridSortChanged({
      api: {
        getColumnState: () => [{ colId: '', sort: 'asc' }],
      },
    } as any);
    expect(c.requestSortBy).toBe('occurredAt');
    expect(c.requestSortDir).toBe('asc');
    expect(supportService.getRequests).toHaveBeenCalled();
  });

  it('detalle de error sin message usa texto por defecto', () => {
    vi.mocked(supportService.getErrorById).mockReturnValueOnce(
      throwError(() => ({ name: 'E' } as Error)),
    );
    const fixture = TestBed.createComponent(SupportDashboardComponent);
    const c = fixture.componentInstance;
    c.viewErrorDetail({
      id: 1,
      severity: 'error',
      isHandled: false,
      occurredAt: '',
      createdAt: '',
    } as any);
    expect(c.errorMessage).toBe('Error al cargar el detalle del error');
  });
});
