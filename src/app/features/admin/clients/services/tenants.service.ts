import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  TenantsListResponse,
  TenantDetailResponse,
  TenantWorkspaceResponse,
  TenantUpdateResponse,
  TenantLimitsResponse,
  TenantLimitsUpdateResponse,
  UpdateTenantStatusRequest,
  UpdateTenantPlanRequest,
  UpdateTenantLimitsRequest,
  GetTenantsParams,
  TenantStatusesResponse,
  ApiError
} from '../models/tenant.model';

@Injectable({
  providedIn: 'root'
})
export class TenantsService {
  private readonly apiUrl = '/api/admin/tenants';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el listado global de todos los tenants del sistema
   * @param params Parámetros opcionales para filtrar y paginar los resultados
   * @returns Observable con la lista de tenants filtrados y paginados
   */
  getTenants(params?: GetTenantsParams): Observable<TenantsListResponse> {
    let httpParams = new HttpParams();

    // Agregar parámetros solo si están definidos
    if (params) {
      if (params.search) {
        httpParams = httpParams.set('Search', params.search);
      }
      if (params.status) {
        httpParams = httpParams.set('Status', params.status);
      }
      if (params.planCode) {
        httpParams = httpParams.set('PlanCode', params.planCode);
      }
      if (params.createdFrom) {
        httpParams = httpParams.set('CreatedFrom', params.createdFrom);
      }
      if (params.createdTo) {
        httpParams = httpParams.set('CreatedTo', params.createdTo);
      }
      if (params.page !== undefined) {
        httpParams = httpParams.set('Page', params.page.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('PageSize', params.pageSize.toString());
      }
    }

    return this.http.get<TenantsListResponse>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene información detallada de un tenant específico
   */
  getTenantById(tenantId: number): Observable<TenantDetailResponse> {
    return this.http.get<TenantDetailResponse>(`${this.apiUrl}/${tenantId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el workspace (área de trabajo) de un tenant específico
   * Permite a usuarios Internal ver el tenant "como está" desde la perspectiva del cliente
   */
  getTenantWorkspace(tenantId: number): Observable<TenantWorkspaceResponse> {
    return this.http.get<TenantWorkspaceResponse>(`${this.apiUrl}/${tenantId}/workspace`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza el estado de un tenant
   * @param tenantId ID del tenant a actualizar
   * @param status Nuevo estado del tenant (active, suspended, trial)
   * @returns Observable con la respuesta actualizada del tenant
   */
  updateTenantStatus(tenantId: number, status: string): Observable<TenantUpdateResponse> {
    const request: UpdateTenantStatusRequest = { Status: status };
    return this.http.patch<TenantUpdateResponse>(
      `${this.apiUrl}/${tenantId}/status`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza el plan de un tenant
   * @param tenantId ID del tenant a actualizar
   * @param planCode Código del nuevo plan (ej: free, pro, enterprise)
   * @returns Observable con la respuesta actualizada del tenant
   */
  updateTenantPlan(tenantId: number, planCode: string): Observable<TenantUpdateResponse> {
    const request: UpdateTenantPlanRequest = { PlanCode: planCode };
    return this.http.patch<TenantUpdateResponse>(
      `${this.apiUrl}/${tenantId}/plan`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los límites de un tenant
   * @param tenantId ID del tenant
   * @returns Observable con los límites del tenant
   */
  getTenantLimits(tenantId: number): Observable<TenantLimitsResponse> {
    return this.http.get<TenantLimitsResponse>(`${this.apiUrl}/${tenantId}/limits`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza los límites de un tenant
   * @param tenantId ID del tenant a actualizar
   * @param limits Objeto con los nuevos límites del tenant
   * @returns Observable con la respuesta actualizada de los límites
   */
  updateTenantLimits(tenantId: number, limits: UpdateTenantLimitsRequest): Observable<TenantLimitsUpdateResponse> {
    return this.http.put<TenantLimitsUpdateResponse>(
      `${this.apiUrl}/${tenantId}/limits`,
      limits
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los estados disponibles para tenants
   * @returns Observable con la lista de estados disponibles
   */
  getTenantStatuses(): Observable<TenantStatusesResponse> {
    return this.http.get<TenantStatusesResponse>(`${this.apiUrl}/statuses`).pipe(
      catchError(this.handleError)
    );
  }

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
            'No tienes permisos para acceder a esta funcionalidad. Se requiere rol de administrador (Internal o Admin).';
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
