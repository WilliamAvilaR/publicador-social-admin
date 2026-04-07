import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, RowClickedEvent, SortChangedEvent } from 'ag-grid-community';
import { SupportService } from '../../services/support.service';
import {
  ApiErrorLog,
  ApiRequestLog,
  ApiRequestLogDetail,
  AuditLog,
  GetErrorsParams,
  GetRequestsParams,
  GetAuditParams
} from '../../models/support.model';

type SupportSubTab = 'requests' | 'errors' | 'audit';
type RequestSortBy = NonNullable<GetRequestsParams['sortBy']>;
type RequestSortDir = NonNullable<GetRequestsParams['sortDir']>;

// AG Grid v35 requiere registro explícito de módulos.
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-support-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './support-dashboard.component.html',
  styleUrl: './support-dashboard.component.scss'
})
export class SupportDashboardComponent implements OnInit {
  // Estados de carga
  isLoadingErrors = false;
  isLoadingRequests = false;
  isLoadingAudit = false;
  errorMessage = '';
  successMessage = '';

  // Datos
  errors: ApiErrorLog[] = [];
  requests: ApiRequestLog[] = [];
  auditLogs: AuditLog[] = [];
  requestGridColumnDefs: ColDef<ApiRequestLog>[] = [
    {
      field: 'occurredAt',
      headerName: 'Hora',
      minWidth: 170,
      sort: 'desc',
      valueFormatter: (p) => this.formatDateTimeCompact(String(p.value ?? ''))
    },
    {
      field: 'httpMethod',
      headerName: 'Método',
      width: 110
    },
    {
      field: 'statusCode',
      headerName: 'Status',
      width: 105,
      cellClass: (p) => `request-status-cell ${this.getStatusClass(Number(p.value ?? 0))}`
    },
    {
      field: 'elapsedMs',
      headerName: 'ms',
      width: 90
    },
    {
      field: 'path',
      headerName: 'Ruta',
      minWidth: 300,
      flex: 1,
      tooltipField: 'path'
    },
    {
      field: 'tenantName',
      headerName: 'Cliente',
      minWidth: 160,
      valueGetter: (p) => p.data?.tenantName || 'Sistema'
    },
    {
      field: 'userId',
      headerName: 'Usuario',
      width: 100,
      valueGetter: (p) => p.data?.userId ?? '—'
    },
    {
      field: 'browserFamily',
      headerName: 'Navegador',
      minWidth: 130,
      valueGetter: (p) => p.data?.browserFamily || '—'
    },
    {
      field: 'isSuccess',
      headerName: 'Resultado',
      width: 120,
      valueFormatter: (p) => (p.value ? 'OK' : 'Fallo')
    }
  ];
  requestGridDefaultColDef: ColDef<ApiRequestLog> = {
    sortable: true,
    // Importante: filtros en esta vista son 100% server-side.
    // Desactivamos filtro cliente de AG Grid para evitar inconsistencias por página.
    filter: false,
    resizable: true
  };
  private readonly requestSortByMap: Record<string, RequestSortBy> = {
    occurredAt: 'occurredAt',
    createdAt: 'createdAt',
    statusCode: 'statusCode',
    elapsedMs: 'elapsedMs',
    id: 'id',
    httpMethod: 'httpMethod',
    path: 'path',
    tenantId: 'tenantId',
    userId: 'userId',
    browserFamily: 'browserFamily'
  };

  // Paginación
  errorsPage = 1;
  errorsPageSize = 20;
  errorsTotal = 0;
  errorsTotalPages = 0;

  requestsPage = 1;
  requestsPageSize = 20;
  requestsTotal = 0;
  requestsTotalPages = 0;
  readonly requestPageSizeOptions = [10, 20, 50, 100];

  auditPage = 1;
  auditPageSize = 20;
  auditTotal = 0;
  auditTotalPages = 0;

  // Filtros de errores
  errorFilters: GetErrorsParams = {
    severity: undefined,
    page: 1,
    pageSize: 20
  };

  // Filtros de requests (GET /api/admin/logs/requests — query §3)
  requestFilters: GetRequestsParams = {
    sortBy: 'occurredAt',
    sortDir: 'desc'
  };
  requestQuickQuery = '';
  showAdvancedRequestSearch = false;
  requestSortBy: RequestSortBy = 'occurredAt';
  requestSortDir: RequestSortDir = 'desc';
  // Inputs datetime-local (hora local) para UX; se convierten a ISO al enviar.
  requestDateFilters = {
    fromDate: '',
    toDate: '',
    createdFromDate: '',
    createdToDate: ''
  };

  // Filtros de auditoría
  auditFilters: GetAuditParams = {
    page: 1,
    pageSize: 20
  };

  // Detalles modales
  selectedError: ApiErrorLog | null = null;
  selectedRequest: ApiRequestLogDetail | null = null;
  selectedAudit: AuditLog | null = null;
  showErrorDetail = false;
  showRequestDetail = false;
  showAuditDetail = false;

  /** Subpestañas dentro de Soporte técnico */
  activeSubTab: SupportSubTab = 'requests';

  constructor(
    private supportService: SupportService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('subtab');
    this.activeSubTab =
      initialTab === 'errors' ? 'errors' : initialTab === 'audit' ? 'audit' : 'requests';

    this.route.queryParamMap.subscribe((queryParams) => {
      const tab = queryParams.get('subtab');
      const nextTab: SupportSubTab =
        tab === 'errors' ? 'errors' : tab === 'audit' ? 'audit' : 'requests';

      if (nextTab === this.activeSubTab) return;
      this.activeSubTab = nextTab;
      if (nextTab === 'requests') this.loadRequests();
      else if (nextTab === 'errors') this.loadErrors();
      else this.loadAuditLogs();
    });
    if (this.activeSubTab === 'requests') this.loadRequests();
    else if (this.activeSubTab === 'errors') this.loadErrors();
    else this.loadAuditLogs();
  }

  setSupportSubTab(tab: SupportSubTab): void {
    if (this.activeSubTab === tab) return;
    this.activeSubTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { subtab: tab },
      queryParamsHandling: 'merge'
    });
    if (tab === 'requests') this.loadRequests();
    else if (tab === 'errors') this.loadErrors();
    else this.loadAuditLogs();
  }

  get isLoadingActiveSubTab(): boolean {
    switch (this.activeSubTab) {
      case 'requests':
        return this.isLoadingRequests;
      case 'errors':
        return this.isLoadingErrors;
      default:
        return this.isLoadingAudit;
    }
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  loadErrors(): void {
    this.isLoadingErrors = true;
    this.errorMessage = '';

    const params: GetErrorsParams = {
      ...this.errorFilters,
      page: this.errorsPage,
      pageSize: this.errorsPageSize
    };

    this.supportService.getErrors(params).subscribe({
      next: (response) => {
        this.errors = response.data.Errors || [];
        this.errorsTotal = response.data.Total || 0;
        this.errorsTotalPages = response.data.TotalPages || 0;
        this.isLoadingErrors = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar los errores';
        this.isLoadingErrors = false;
      }
    });
  }

  loadRequests(): void {
    this.isLoadingRequests = true;
    this.errorMessage = '';

    const params = this.buildRequestsListParams();

    this.supportService.getRequests(params).subscribe({
      next: (response) => {
        const d = response.data;
        this.requests = d.requests ?? [];
        this.requestsTotal = d.total ?? 0;
        this.requestsTotalPages = d.totalPages ?? 0;
        if (d.page != null) this.requestsPage = d.page;
        if (d.pageSize != null) this.requestsPageSize = d.pageSize;
        this.isLoadingRequests = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar los requests';
        this.isLoadingRequests = false;
      }
    });
  }

  loadAuditLogs(): void {
    this.isLoadingAudit = true;
    this.errorMessage = '';

    const params: GetAuditParams = {
      ...this.auditFilters,
      page: this.auditPage,
      pageSize: this.auditPageSize
    };

    this.supportService.getAuditLogs(params).subscribe({
      next: (response) => {
        this.auditLogs = response.data.AuditLogs || [];
        this.auditTotal = response.data.Total || 0;
        this.auditTotalPages = response.data.TotalPages || 0;
        this.isLoadingAudit = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar los logs de auditoría';
        this.isLoadingAudit = false;
      }
    });
  }

  // ============================================
  // FILTROS
  // ============================================

  applyErrorFilters(): void {
    this.errorsPage = 1;
    this.loadErrors();
  }

  clearErrorFilters(): void {
    this.errorFilters = {
      page: 1,
      pageSize: 20
    };
    this.errorsPage = 1;
    this.loadErrors();
  }

  applyRequestFilters(): void {
    this.requestFilters.query = this.requestQuickQuery.trim() || undefined;
    this.requestsPage = 1;
    this.loadRequests();
  }

  clearRequestFilters(): void {
    this.requestQuickQuery = '';
    this.requestDateFilters = {
      fromDate: '',
      toDate: '',
      createdFromDate: '',
      createdToDate: ''
    };
    this.requestFilters = {
      sortBy: this.requestSortBy,
      sortDir: this.requestSortDir
    };
    this.requestsPage = 1;
    this.loadRequests();
  }

  toggleAdvancedRequestSearch(): void {
    this.showAdvancedRequestSearch = !this.showAdvancedRequestSearch;
  }

  /** Arma query según contrato: enteros válidos, strings recortados, page 1–∞, pageSize 1–100 */
  private buildRequestsListParams(): GetRequestsParams {
    const f = this.requestFilters;
    const params: GetRequestsParams = {
      page: this.requestsPage,
      pageSize: Math.min(100, Math.max(1, this.requestsPageSize)),
      sortBy: this.requestSortBy,
      sortDir: this.requestSortDir
    };

    const optInt = (v: unknown): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const x = Number(v);
      return Number.isFinite(x) ? Math.trunc(x) : undefined;
    };

    const tid = optInt(f.tenantId);
    if (tid !== undefined) params.tenantId = tid;
    const uid = optInt(f.userId);
    if (uid !== undefined) params.userId = uid;
    if (f.method?.trim()) params.method = f.method.trim();
    if (f.methods?.trim()) params.methods = f.methods.trim();
    if (f.path?.trim()) params.path = f.path.trim();
    if (f.exactPath === true) params.exactPath = true;
    const sc = optInt(f.statusCode);
    if (sc !== undefined) params.statusCode = sc;
    const scFrom = optInt(f.statusCodeFrom);
    if (scFrom !== undefined) params.statusCodeFrom = scFrom;
    const scTo = optInt(f.statusCodeTo);
    if (scTo !== undefined) params.statusCodeTo = scTo;
    const fromDateIso = this.toIsoFromLocalDateTime(this.requestDateFilters.fromDate);
    if (fromDateIso) params.fromDate = fromDateIso;
    const toDateIso = this.toIsoFromLocalDateTime(this.requestDateFilters.toDate);
    if (toDateIso) params.toDate = toDateIso;
    const createdFromIso = this.toIsoFromLocalDateTime(this.requestDateFilters.createdFromDate);
    if (createdFromIso) params.createdFromDate = createdFromIso;
    const createdToIso = this.toIsoFromLocalDateTime(this.requestDateFilters.createdToDate);
    if (createdToIso) params.createdToDate = createdToIso;
    const minMs = optInt(f.minElapsedMs);
    if (minMs !== undefined) params.minElapsedMs = minMs;
    const maxMs = optInt(f.maxElapsedMs);
    if (maxMs !== undefined) params.maxElapsedMs = maxMs;
    if (f.onlyFailed === true) params.onlyFailed = true;
    if (f.isSuccess !== undefined) params.isSuccess = f.isSuccess;
    if (f.correlationId?.trim()) params.correlationId = f.correlationId.trim();
    if (f.ipAddress?.trim()) params.ipAddress = f.ipAddress.trim();
    if (f.userAgent?.trim()) params.userAgent = f.userAgent.trim();
    if (f.browserFamily?.trim()) params.browserFamily = f.browserFamily.trim();
    if (f.query?.trim()) params.query = f.query.trim();

    return params;
  }

  applyAuditFilters(): void {
    this.auditPage = 1;
    this.loadAuditLogs();
  }

  clearAuditFilters(): void {
    this.auditFilters = {
      page: 1,
      pageSize: 20
    };
    this.auditPage = 1;
    this.loadAuditLogs();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  goToErrorsPage(page: number): void {
    if (page >= 1 && page <= this.errorsTotalPages) {
      this.errorsPage = page;
      this.loadErrors();
    }
  }

  goToRequestsPage(page: number): void {
    if (page >= 1 && page <= this.requestsTotalPages) {
      this.requestsPage = page;
      this.loadRequests();
    }
  }

  goToFirstRequestsPage(): void {
    if (this.requestsPage > 1) this.goToRequestsPage(1);
  }

  goToLastRequestsPage(): void {
    if (this.requestsTotalPages > 0 && this.requestsPage < this.requestsTotalPages) {
      this.goToRequestsPage(this.requestsTotalPages);
    }
  }

  onRequestsPageSizeChange(value: string | number): void {
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(parsed)) return;
    this.requestsPageSize = Math.min(100, Math.max(1, Math.trunc(parsed)));
    this.requestsPage = 1;
    this.loadRequests();
  }

  goToAuditPage(page: number): void {
    if (page >= 1 && page <= this.auditTotalPages) {
      this.auditPage = page;
      this.loadAuditLogs();
    }
  }

  // ============================================
  // DETALLES
  // ============================================

  viewErrorDetail(error: ApiErrorLog): void {
    this.supportService.getErrorById(error.Id).subscribe({
      next: (response) => {
        this.selectedError = response.data;
        this.showErrorDetail = true;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el detalle del error';
      }
    });
  }

  viewRequestDetail(request: ApiRequestLog): void {
    this.supportService.getRequestById(request.id).subscribe({
      next: (response) => {
        this.selectedRequest = response.data;
        this.showRequestDetail = true;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el detalle del request';
      }
    });
  }

  onRequestGridRowClicked(event: RowClickedEvent<ApiRequestLog>): void {
    if (event.data) this.viewRequestDetail(event.data);
  }

  onRequestGridSortChanged(event: SortChangedEvent<ApiRequestLog>): void {
    const sorted = event.api.getColumnState().find((c) => c.sort != null);
    const nextBy = sorted?.colId ? this.requestSortByMap[sorted.colId] : undefined;
    const nextDir = (sorted?.sort as RequestSortDir | undefined) ?? 'desc';
    const normalizedBy = nextBy ?? 'occurredAt';
    if (normalizedBy === this.requestSortBy && nextDir === this.requestSortDir) return;

    this.requestSortBy = normalizedBy;
    this.requestSortDir = nextDir;
    this.requestFilters.sortBy = this.requestSortBy;
    this.requestFilters.sortDir = this.requestSortDir;
    this.requestsPage = 1;
    this.loadRequests();
  }

  viewAuditDetail(audit: AuditLog): void {
    this.supportService.getAuditLogById(audit.Id).subscribe({
      next: (response) => {
        this.selectedAudit = response.data;
        this.showAuditDetail = true;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el detalle de auditoría';
      }
    });
  }

  closeErrorDetail(): void {
    this.showErrorDetail = false;
    this.selectedError = null;
  }

  closeRequestDetail(): void {
    this.showRequestDetail = false;
    this.selectedRequest = null;
  }

  closeAuditDetail(): void {
    this.showAuditDetail = false;
    this.selectedAudit = null;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  getSeverityClass(severity: string): string {
    const severityLower = severity?.toLowerCase() || '';
    if (severityLower === 'critical' || severityLower === 'error') {
      return 'severity-high';
    }
    if (severityLower === 'warning') {
      return 'severity-medium';
    }
    return 'severity-low';
  }

  getSeverityLabel(severity: string): string {
    const severityLower = severity?.toLowerCase() || '';
    if (severityLower === 'critical') return 'Crítico';
    if (severityLower === 'error') return 'Error';
    if (severityLower === 'warning') return 'Advertencia';
    return severity || 'Desconocido';
  }

  getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'status-success';
    if (statusCode >= 400 && statusCode < 500) return 'status-warning';
    if (statusCode >= 500) return 'status-error';
    return 'status-info';
  }

  /** Clase CSS para método HTTP en tabla de requests */
  requestHttpMethodClass(method: string | undefined): string {
    const m = (method ?? '').toLowerCase();
    if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) return `method-${m}`;
    return 'method-unknown';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  }

  /** Fecha/hora compacta para tablas de logs */
  formatDateTimeCompact(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private toIsoFromLocalDateTime(value: string | undefined): string | undefined {
    if (!value?.trim()) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }

  truncateText(value: string | null | undefined, maxLen: number): string {
    if (value == null || value === '') return '—';
    if (value.length <= maxLen) return value;
    return `${value.slice(0, Math.max(0, maxLen - 1))}…`;
  }

  shortCorrelationId(id: string | null | undefined): string {
    if (id == null || id === '') return '—';
    if (id.length <= 14) return id;
    return `${id.slice(0, 8)}…${id.slice(-4)}`;
  }

  /** Recarga los datos de la subpestaña visible */
  reloadActiveSubTab(): void {
    if (this.activeSubTab === 'requests') this.loadRequests();
    else if (this.activeSubTab === 'errors') this.loadErrors();
    else this.loadAuditLogs();
  }

  // ============================================
  // ACCIONES (mantener compatibilidad con HTML existente)
  // ============================================

  retrySync(itemId: number): void {
    if (confirm('¿Reintentar sincronización?')) {
      // TODO: Implementar cuando haya endpoint para reintentar sincronización
      console.log('Retrying sync for item:', itemId);
      this.successMessage = 'Sincronización iniciada';
      setTimeout(() => {
        this.successMessage = '';
        this.reloadActiveSubTab();
      }, 2000);
    }
  }

  viewLogs(userId: number): void {
    this.activeSubTab = 'requests';
    this.requestFilters.userId = userId;
    this.requestsPage = 1;
    this.loadRequests();
  }
}
