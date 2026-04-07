/**
 * Modelos para el módulo de Soporte Técnico
 */

// ============================================
// REQUEST LOGS
// Contrato: GET /api/admin/logs/requests — JSON camelCase (AdminRequestLogListItemDto)
// ============================================

export interface ApiRequestLog {
  id: number;
  correlationId: string;
  userId?: number | null;
  tenantId?: number | null;
  tenantName?: string | null;
  httpMethod: string;
  path: string;
  queryString?: string | null;
  statusCode: number;
  elapsedMs: number;
  userAgent?: string | null;
  browserFamily?: string | null;
  ipAddress?: string | null;
  isSuccess: boolean;
  occurredAt: string;
  createdAt: string;
}

/** Errores anidados en el detalle de un request (camelCase) */
export interface ApiRequestLogErrorItem {
  id: number;
  exceptionType?: string | null;
  exceptionMessage?: string | null;
  severity?: string | null;
  isHandled?: boolean | null;
}

export interface ApiRequestLogDetail extends ApiRequestLog {
  errorLogs?: ApiRequestLogErrorItem[];
}

export interface GetRequestsParams {
  tenantId?: number;
  userId?: number;
  method?: string;
  methods?: string;
  path?: string;
  exactPath?: boolean;
  statusCode?: number;
  statusCodeFrom?: number;
  statusCodeTo?: number;
  fromDate?: string;
  toDate?: string;
  createdFromDate?: string;
  createdToDate?: string;
  minElapsedMs?: number;
  maxElapsedMs?: number;
  onlyFailed?: boolean;
  isSuccess?: boolean;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  browserFamily?: string;
  query?: string;
  sortBy?: 'occurredAt' | 'createdAt' | 'statusCode' | 'elapsedMs' | 'id' | 'httpMethod' | 'path' | 'tenantId' | 'userId' | 'browserFamily';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** ApiResponse<object> con data = AdminRequestLogsPagedResult */
export interface RequestsListResponse {
  data: {
    requests: ApiRequestLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  requiresReauth: boolean;
  meta: unknown | null;
}

export interface RequestDetailResponse {
  data: ApiRequestLogDetail;
  requiresReauth: boolean;
  meta: unknown | null;
}

// ============================================
// ERROR LOGS
// ============================================

export interface ApiErrorLog {
  Id: number;
  ApiRequestLogId?: number | null;
  CorrelationId?: string | null;
  UserId?: number | null;
  TenantId?: number | null;
  TenantName?: string | null;
  ExceptionType?: string | null;
  ExceptionMessage?: string | null;
  StackTrace?: string | null;
  InnerException?: string | null;
  Severity: string;
  IsHandled: boolean;
  Path?: string | null;
  HttpMethod?: string | null;
  StatusCode?: number | null;
  OccurredAt: string;
  CreatedAt: string;
}

export interface ApiErrorLogDetail extends ApiErrorLog {
  RequestLog?: {
    Id: number;
    Path: string;
    HttpMethod: string;
    StatusCode: number;
  } | null;
}

export interface GetErrorsParams {
  tenantId?: number;
  userId?: number;
  severity?: string;
  exceptionType?: string;
  path?: string;
  fromDate?: string;
  toDate?: string;
  isHandled?: boolean;
  correlationId?: string;
  page?: number;
  pageSize?: number;
}

export interface ErrorsListResponse {
  data: {
    Errors: ApiErrorLog[];
    Total: number;
    Page: number;
    PageSize: number;
    TotalPages: number;
  };
  success: boolean;
}

export interface ErrorDetailResponse {
  data: ApiErrorLogDetail;
  success: boolean;
}

export interface ErrorsByCorrelationResponse {
  data: {
    CorrelationId: string;
    Errors: ApiErrorLog[];
    Count: number;
  };
  success: boolean;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLog {
  Id: number;
  UserId: number;
  UserName: string;
  UserEmail: string;
  TenantId?: number | null;
  TenantName?: string | null;
  ActionType: string;
  EntityType: string;
  EntityId: string;
  Description: string;
  OldValues?: string | null;
  NewValues?: string | null;
  CorrelationId?: string | null;
  OccurredAt: string;
  CreatedAt: string;
}

export interface GetAuditParams {
  tenantId?: number;
  userId?: number;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  correlationId?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  data: {
    AuditLogs: AuditLog[];
    Total: number;
    Page: number;
    PageSize: number;
    TotalPages: number;
  };
  success: boolean;
}

export interface AuditDetailResponse {
  data: AuditLog;
  success: boolean;
}

// ============================================
// API ERROR
// ============================================

export interface ApiError {
  title?: string;
  detail?: string;
  status?: number;
  errors?: { [key: string]: string[] };
}
