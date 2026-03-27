/**
 * Modelos para el módulo de Soporte Técnico
 */

// ============================================
// REQUEST LOGS
// ============================================

export interface ApiRequestLog {
  Id: number;
  CorrelationId: string;
  UserId?: number | null;
  TenantId?: number | null;
  TenantName?: string | null;
  HttpMethod: string;
  Path: string;
  QueryString?: string | null;
  StatusCode: number;
  ElapsedMs: number;
  UserAgent?: string | null;
  IpAddress?: string | null;
  IsSuccess: boolean;
  OccurredAt: string;
  CreatedAt: string;
}

export interface ErrorLog {
  Id: number;
  ExceptionType?: string | null;
  ExceptionMessage?: string | null;
  Severity?: string | null;
  IsHandled?: boolean | null;
}

export interface ApiRequestLogDetail extends ApiRequestLog {
  ErrorLogs?: ErrorLog[];
}

export interface GetRequestsParams {
  tenantId?: number;
  userId?: number;
  method?: string;
  path?: string;
  statusCode?: number;
  fromDate?: string;
  toDate?: string;
  minElapsedMs?: number;
  onlyFailed?: boolean;
  correlationId?: string;
  page?: number;
  pageSize?: number;
}

export interface RequestsListResponse {
  data: {
    Requests: ApiRequestLog[];
    Total: number;
    Page: number;
    PageSize: number;
    TotalPages: number;
  };
  success: boolean;
}

export interface RequestDetailResponse {
  data: ApiRequestLogDetail;
  success: boolean;
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
