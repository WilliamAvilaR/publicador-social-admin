import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  SubscriptionsListResponse,
  SubscriptionDetailResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  UpdateSubscriptionStatusRequest,
  UpdateSubscriptionStatusResponse,
  GetSubscriptionsParams,
  SubscriptionStatusesResponse,
  ApiError
} from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {
  private readonly apiUrl = '/api/admin/subscriptions';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el listado de suscripciones con filtros opcionales
   * @param params Parámetros opcionales para filtrar los resultados
   * @returns Observable con la lista de suscripciones filtradas
   */
  getSubscriptions(params?: GetSubscriptionsParams): Observable<SubscriptionsListResponse> {
    let httpParams = new HttpParams();

    // Agregar parámetros solo si están definidos
    if (params) {
      if (params.tenantId !== undefined) {
        httpParams = httpParams.set('tenantId', params.tenantId.toString());
      }
      if (params.status) {
        httpParams = httpParams.set('status', params.status);
      }
      if (params.isActive !== undefined) {
        httpParams = httpParams.set('isActive', params.isActive.toString());
      }
    }

    return this.http.get<SubscriptionsListResponse>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene información detallada de una suscripción específica
   * @param subscriptionId ID de la suscripción
   * @returns Observable con el detalle de la suscripción
   */
  getSubscriptionById(subscriptionId: number): Observable<SubscriptionDetailResponse> {
    return this.http.get<SubscriptionDetailResponse>(`${this.apiUrl}/${subscriptionId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea una nueva suscripción para un tenant
   * @param subscription Datos de la suscripción a crear
   * @returns Observable con la suscripción creada
   */
  createSubscription(subscription: CreateSubscriptionRequest): Observable<CreateSubscriptionResponse> {
    return this.http.post<CreateSubscriptionResponse>(this.apiUrl, subscription).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza el estado de una suscripción
   * @param subscriptionId ID de la suscripción
   * @param statusRequest Datos del nuevo estado
   * @returns Observable con la suscripción actualizada
   */
  updateSubscriptionStatus(
    subscriptionId: number,
    statusRequest: UpdateSubscriptionStatusRequest
  ): Observable<UpdateSubscriptionStatusResponse> {
    return this.http.patch<UpdateSubscriptionStatusResponse>(
      `${this.apiUrl}/${subscriptionId}/status`,
      statusRequest
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los estados disponibles para suscripciones
   * @returns Observable con la lista de estados disponibles
   */
  getSubscriptionStatuses(): Observable<SubscriptionStatusesResponse> {
    return this.http.get<SubscriptionStatusesResponse>(`${this.apiUrl}/statuses`).pipe(
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
          errorMessage = apiError?.detail || 'Suscripción no encontrada.';
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
