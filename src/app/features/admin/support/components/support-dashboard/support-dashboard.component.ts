import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-support-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Paginación
  errorsPage = 1;
  errorsPageSize = 20;
  errorsTotal = 0;
  errorsTotalPages = 0;

  requestsPage = 1;
  requestsPageSize = 20;
  requestsTotal = 0;
  requestsTotalPages = 0;

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

  // Filtros de requests
  requestFilters: GetRequestsParams = {
    onlyFailed: undefined,
    page: 1,
    pageSize: 20
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

  constructor(private supportService: SupportService) {}

  ngOnInit(): void {
    this.loadErrors();
    this.loadRequests();
    this.loadAuditLogs();
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

    const params: GetRequestsParams = {
      ...this.requestFilters,
      page: this.requestsPage,
      pageSize: this.requestsPageSize
    };

    this.supportService.getRequests(params).subscribe({
      next: (response) => {
        this.requests = response.data.Requests || [];
        this.requestsTotal = response.data.Total || 0;
        this.requestsTotalPages = response.data.TotalPages || 0;
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
    this.requestsPage = 1;
    this.loadRequests();
  }

  clearRequestFilters(): void {
    this.requestFilters = {
      page: 1,
      pageSize: 20
    };
    this.requestsPage = 1;
    this.loadRequests();
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
    this.supportService.getRequestById(request.Id).subscribe({
      next: (response) => {
        this.selectedRequest = response.data;
        this.showRequestDetail = true;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el detalle del request';
      }
    });
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  }

  refreshAll(): void {
    this.loadErrors();
    this.loadRequests();
    this.loadAuditLogs();
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
        this.refreshAll();
      }, 2000);
    }
  }

  viewLogs(userId: number): void {
    // Filtrar requests por usuario
    this.requestFilters.userId = userId;
    this.applyRequestFilters();
  }
}
