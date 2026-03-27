import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  RequestsListResponse,
  RequestDetailResponse,
  GetRequestsParams,
  ErrorsListResponse,
  ErrorDetailResponse,
  ErrorsByCorrelationResponse,
  GetErrorsParams,
  AuditListResponse,
  AuditDetailResponse,
  GetAuditParams,
  ApiError
} from '../models/support.model';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private readonly logsApiUrl = '/api/admin/logs';
  private readonly auditApiUrl = '/api/admin/audit';

  constructor(private http: HttpClient) {}

  // ============================================
  // REQUEST LOGS
  // ============================================

  /**
   * Obtiene la lista de requests HTTP con filtros y paginación
   * @param params Parámetros de filtro y paginación
   * @returns Observable con la lista de requests
   */
  getRequests(params?: GetRequestsParams): Observable<RequestsListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.tenantId !== undefined) {
        httpParams = httpParams.set('tenantId', params.tenantId.toString());
      }
      if (params.userId !== undefined) {
        httpParams = httpParams.set('userId', params.userId.toString());
      }
      if (params.method) {
        httpParams = httpParams.set('method', params.method);
      }
      if (params.path) {
        httpParams = httpParams.set('path', params.path);
      }
      if (params.statusCode !== undefined) {
        httpParams = httpParams.set('statusCode', params.statusCode.toString());
      }
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.minElapsedMs !== undefined) {
        httpParams = httpParams.set('minElapsedMs', params.minElapsedMs.toString());
      }
      if (params.onlyFailed !== undefined) {
        httpParams = httpParams.set('onlyFailed', params.onlyFailed.toString());
      }
      if (params.correlationId) {
        httpParams = httpParams.set('correlationId', params.correlationId);
      }
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('pageSize', params.pageSize.toString());
      }
    }

    return this.http.get<RequestsListResponse>(`${this.logsApiUrl}/requests`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el detalle de un request específico
   * @param requestId ID del request
   * @returns Observable con el detalle del request
   */
  getRequestById(requestId: number): Observable<RequestDetailResponse> {
    return this.http.get<RequestDetailResponse>(`${this.logsApiUrl}/requests/${requestId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ============================================
  // ERROR LOGS
  // ============================================

  /**
   * Obtiene la lista de errores con filtros y paginación
   * @param params Parámetros de filtro y paginación
   * @returns Observable con la lista de errores
   */
  getErrors(params?: GetErrorsParams): Observable<ErrorsListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.tenantId !== undefined) {
        httpParams = httpParams.set('tenantId', params.tenantId.toString());
      }
      if (params.userId !== undefined) {
        httpParams = httpParams.set('userId', params.userId.toString());
      }
      if (params.severity) {
        httpParams = httpParams.set('severity', params.severity);
      }
      if (params.exceptionType) {
        httpParams = httpParams.set('exceptionType', params.exceptionType);
      }
      if (params.path) {
        httpParams = httpParams.set('path', params.path);
      }
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.isHandled !== undefined) {
        httpParams = httpParams.set('isHandled', params.isHandled.toString());
      }
      if (params.correlationId) {
        httpParams = httpParams.set('correlationId', params.correlationId);
      }
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('pageSize', params.pageSize.toString());
      }
    }

    return this.http.get<ErrorsListResponse>(`${this.logsApiUrl}/errors`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el detalle de un error específico
   * @param errorId ID del error
   * @returns Observable con el detalle del error
   */
  getErrorById(errorId: number): Observable<ErrorDetailResponse> {
    return this.http.get<ErrorDetailResponse>(`${this.logsApiUrl}/errors/${errorId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene todos los errores relacionados con un correlation ID
   * @param correlationId Correlation ID del request
   * @returns Observable con los errores relacionados
   */
  getErrorsByCorrelation(correlationId: string): Observable<ErrorsByCorrelationResponse> {
    return this.http.get<ErrorsByCorrelationResponse>(`${this.logsApiUrl}/errors/by-correlation/${correlationId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  /**
   * Obtiene la lista de eventos de auditoría con filtros y paginación
   * @param params Parámetros de filtro y paginación
   * @returns Observable con la lista de eventos de auditoría
   */
  getAuditLogs(params?: GetAuditParams): Observable<AuditListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.tenantId !== undefined) {
        httpParams = httpParams.set('tenantId', params.tenantId.toString());
      }
      if (params.userId !== undefined) {
        httpParams = httpParams.set('userId', params.userId.toString());
      }
      if (params.actionType) {
        httpParams = httpParams.set('actionType', params.actionType);
      }
      if (params.entityType) {
        httpParams = httpParams.set('entityType', params.entityType);
      }
      if (params.entityId) {
        httpParams = httpParams.set('entityId', params.entityId);
      }
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.correlationId) {
        httpParams = httpParams.set('correlationId', params.correlationId);
      }
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('pageSize', params.pageSize.toString());
      }
    }

    return this.http.get<AuditListResponse>(this.auditApiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el detalle de un evento de auditoría específico
   * @param auditId ID del evento de auditoría
   * @returns Observable con el detalle del evento
   */
  getAuditLogById(auditId: number): Observable<AuditDetailResponse> {
    return this.http.get<AuditDetailResponse>(`${this.auditApiUrl}/${auditId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ============================================
  // ERROR HANDLING
  // ============================================

  /**
   * Maneja errores HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      const apiError = error.error as ApiError;
      
      switch (error.status) {
        case 400:
          errorMessage = apiError?.detail || apiError?.title || 
            'Solicitud inválida. Por favor, verifica los datos enviados.';
          break;
        case 401:
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          errorMessage = apiError?.detail || apiError?.title || 
            'No tienes permisos para acceder a esta funcionalidad. Se requiere rol de administrador.';
          break;
        case 404:
          errorMessage = apiError?.detail || 'Recurso no encontrado.';
          break;
        case 500:
          errorMessage = apiError?.detail || 'Error del servidor. Por favor, intenta más tarde.';
          break;
        default:
          if (apiError?.detail) {
            errorMessage = apiError.detail;
          } else if (apiError?.title) {
            errorMessage = apiError.title;
          } else if (error.message) {
            errorMessage = error.message;
          }
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
}
