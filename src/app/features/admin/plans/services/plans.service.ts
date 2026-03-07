import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PlansListResponse,
  PlanDetailResponse,
  PlanOperationResponse,
  CreatePlanRequest,
  UpdatePlanRequest,
  UpdatePlanFeaturesRequest,
  UpdatePlanLimitsRequest,
  PlanDefinitionsResponse,
  ApiError
} from '../models/plan.model';

@Injectable({
  providedIn: 'root'
})
export class PlansService {
  private readonly apiUrl = '/api/admin/plans';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el listado de todos los planes disponibles
   * @returns Observable con la lista de planes
   */
  getPlans(): Observable<PlansListResponse> {
    return this.http.get<PlansListResponse>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene información detallada de un plan específico
   * @param planId ID del plan
   * @returns Observable con el detalle del plan incluyendo features y límites
   */
  getPlanById(planId: number): Observable<PlanDetailResponse> {
    return this.http.get<PlanDetailResponse>(`${this.apiUrl}/${planId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene información detallada de un plan específico usando su código
   * @param code Código del plan (ej: free, pro, enterprise)
   * @returns Observable con el detalle del plan incluyendo features y límites
   */
  getPlanByCode(code: string): Observable<PlanDetailResponse> {
    return this.http.get<PlanDetailResponse>(`${this.apiUrl}/by-code/${code}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo plan con sus features y límites
   * @param plan Datos del plan a crear
   * @returns Observable con el plan creado
   */
  createPlan(plan: CreatePlanRequest): Observable<PlanOperationResponse> {
    return this.http.post<PlanOperationResponse>(this.apiUrl, plan).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza los campos básicos de un plan (actualización parcial)
   * @param planId ID del plan a actualizar
   * @param plan Datos a actualizar (todos los campos son opcionales)
   * @returns Observable con el plan actualizado
   */
  updatePlan(planId: number, plan: UpdatePlanRequest): Observable<PlanOperationResponse> {
    return this.http.put<PlanOperationResponse>(`${this.apiUrl}/${planId}`, plan).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza las features de un plan (reemplaza todas las features)
   * @param planId ID del plan a actualizar
   * @param features Nuevas features del plan
   * @returns Observable con el plan actualizado
   */
  updatePlanFeatures(planId: number, features: UpdatePlanFeaturesRequest): Observable<PlanOperationResponse> {
    return this.http.put<PlanOperationResponse>(`${this.apiUrl}/${planId}/features`, features).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza los límites de un plan (reemplaza todos los límites)
   * @param planId ID del plan a actualizar
   * @param limits Nuevos límites del plan
   * @returns Observable con el plan actualizado
   */
  updatePlanLimits(planId: number, limits: UpdatePlanLimitsRequest): Observable<PlanOperationResponse> {
    return this.http.put<PlanOperationResponse>(`${this.apiUrl}/${planId}/limits`, limits).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene las definiciones de features y limits para crear planes
   * Incluye las dependencias automáticas entre features y limits
   * @returns Observable con features y limits con sus dependencias
   */
  getPlanDefinitions(): Observable<PlanDefinitionsResponse> {
    return this.http.get<PlanDefinitionsResponse>(`${this.apiUrl}/definitions`).pipe(
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
          errorMessage = apiError?.detail || 'Plan no encontrado.';
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
