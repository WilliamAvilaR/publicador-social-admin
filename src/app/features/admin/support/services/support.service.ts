import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ApiRequestLog,
  ApiRequestLogDetail,
  ApiRequestLogErrorItem,
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
        httpParams = httpParams.set('method', params.method.trim().toUpperCase());
      }
      if (params.methods) {
        httpParams = httpParams.set('methods', params.methods.trim().toUpperCase());
      }
      if (params.path) {
        httpParams = httpParams.set('path', params.path);
      }
      if (params.exactPath !== undefined) {
        httpParams = httpParams.set('exactPath', params.exactPath.toString());
      }
      if (params.statusCode !== undefined) {
        httpParams = httpParams.set('statusCode', params.statusCode.toString());
      }
      if (params.statusCodeFrom !== undefined) {
        httpParams = httpParams.set('statusCodeFrom', params.statusCodeFrom.toString());
      }
      if (params.statusCodeTo !== undefined) {
        httpParams = httpParams.set('statusCodeTo', params.statusCodeTo.toString());
      }
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.createdFromDate) {
        httpParams = httpParams.set('createdFromDate', params.createdFromDate);
      }
      if (params.createdToDate) {
        httpParams = httpParams.set('createdToDate', params.createdToDate);
      }
      if (params.minElapsedMs !== undefined) {
        httpParams = httpParams.set('minElapsedMs', params.minElapsedMs.toString());
      }
      if (params.maxElapsedMs !== undefined) {
        httpParams = httpParams.set('maxElapsedMs', params.maxElapsedMs.toString());
      }
      if (params.onlyFailed !== undefined) {
        httpParams = httpParams.set('onlyFailed', params.onlyFailed.toString());
      }
      if (params.isSuccess !== undefined) {
        httpParams = httpParams.set('isSuccess', params.isSuccess.toString());
      }
      if (params.correlationId) {
        httpParams = httpParams.set('correlationId', params.correlationId);
      }
      if (params.ipAddress) {
        httpParams = httpParams.set('ipAddress', params.ipAddress);
      }
      if (params.userAgent) {
        httpParams = httpParams.set('userAgent', params.userAgent);
      }
      if (params.browserFamily) {
        httpParams = httpParams.set('browserFamily', params.browserFamily);
      }
      if (params.query) {
        httpParams = httpParams.set('query', params.query);
      }
      if (params.sortBy) {
        httpParams = httpParams.set('sortBy', params.sortBy);
      }
      if (params.sortDir) {
        httpParams = httpParams.set('sortDir', params.sortDir);
      }
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', Math.max(1, params.page).toString());
      }
      if (params.pageSize !== undefined) {
        const pageSize = Math.min(100, Math.max(1, params.pageSize));
        httpParams = httpParams.set('pageSize', pageSize.toString());
      }
    }

    return this.http.get<unknown>(`${this.logsApiUrl}/requests`, { params: httpParams }).pipe(
      map((body) => this.normalizeRequestsListResponse(body)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el detalle de un request específico
   * @param requestId ID del request
   * @returns Observable con el detalle del request
   */
  getRequestById(requestId: number): Observable<RequestDetailResponse> {
    return this.http.get<unknown>(`${this.logsApiUrl}/requests/${requestId}`).pipe(
      map((body) => this.normalizeRequestDetailResponse(body)),
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
  // REQUEST LOGS — normalización camelCase (contrato MD) o PascalCase legado
  // ============================================

  private normalizeRequestsListResponse(body: unknown): RequestsListResponse {
    const b = body as Record<string, unknown>;
    const raw = (b?.['data'] ?? b) as Record<string, unknown>;
    const requestsRaw = (raw['requests'] ?? raw['Requests'] ?? []) as unknown[];
    return {
      data: {
        requests: requestsRaw.map((row) => this.normalizeRequestLog(row as Record<string, unknown>)),
        total: Number(raw['total'] ?? raw['Total'] ?? 0),
        page: Number(raw['page'] ?? raw['Page'] ?? 1),
        pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 20),
        totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0)
      },
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeRequestDetailResponse(body: unknown): RequestDetailResponse {
    const b = body as Record<string, unknown>;
    const data = b?.['data'] as Record<string, unknown> | undefined;
    const payload = data ?? b;
    return {
      data: this.normalizeRequestLogDetailPayload(payload),
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeRequestLog(row: Record<string, unknown>): ApiRequestLog {
    return {
      id: Number(row['id'] ?? row['Id']),
      correlationId: String(row['correlationId'] ?? row['CorrelationId'] ?? ''),
      userId: (row['userId'] ?? row['UserId']) as number | null | undefined,
      tenantId: (row['tenantId'] ?? row['TenantId']) as number | null | undefined,
      tenantName: (row['tenantName'] ?? row['TenantName']) as string | null | undefined,
      httpMethod: String(row['httpMethod'] ?? row['HttpMethod'] ?? ''),
      path: String(row['path'] ?? row['Path'] ?? ''),
      queryString: (row['queryString'] ?? row['QueryString']) as string | null | undefined,
      statusCode: Number(row['statusCode'] ?? row['StatusCode'] ?? 0),
      elapsedMs: Number(row['elapsedMs'] ?? row['ElapsedMs'] ?? 0),
      userAgent: (row['userAgent'] ?? row['UserAgent']) as string | null | undefined,
      browserFamily: (row['browserFamily'] ?? row['BrowserFamily']) as string | null | undefined,
      ipAddress: (row['ipAddress'] ?? row['IpAddress']) as string | null | undefined,
      isSuccess: Boolean(row['isSuccess'] ?? row['IsSuccess']),
      occurredAt: String(row['occurredAt'] ?? row['OccurredAt'] ?? ''),
      createdAt: String(row['createdAt'] ?? row['CreatedAt'] ?? '')
    };
  }

  private normalizeRequestLogDetailPayload(data: Record<string, unknown>): ApiRequestLogDetail {
    const base = this.normalizeRequestLog(data);
    const errorRaw = (data['errorLogs'] ?? data['ErrorLogs']) as unknown[] | undefined;
    const errorLogs =
      Array.isArray(errorRaw) && errorRaw.length > 0
        ? errorRaw.map((e) => this.normalizeRequestErrorItem(e as Record<string, unknown>))
        : undefined;
    return { ...base, errorLogs };
  }

  private normalizeRequestErrorItem(e: Record<string, unknown>): ApiRequestLogErrorItem {
    return {
      id: Number(e['id'] ?? e['Id']),
      exceptionType: (e['exceptionType'] ?? e['ExceptionType']) as string | null | undefined,
      exceptionMessage: (e['exceptionMessage'] ?? e['ExceptionMessage']) as string | null | undefined,
      severity: (e['severity'] ?? e['Severity']) as string | null | undefined,
      isHandled: (e['isHandled'] ?? e['IsHandled']) as boolean | null | undefined
    };
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
