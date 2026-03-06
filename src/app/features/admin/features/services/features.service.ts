import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FeaturesCatalogResponse,
  LimitsCatalogResponse,
  ApiError
} from '../models/feature.model';

@Injectable({
  providedIn: 'root'
})
export class FeaturesService {
  private readonly apiUrl = '/api/admin/features';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el catálogo completo de features disponibles (módulos y redes)
   * @returns Observable con el catálogo de features
   */
  getFeaturesCatalog(): Observable<FeaturesCatalogResponse> {
    return this.http.get<FeaturesCatalogResponse>(`${this.apiUrl}/catalog`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el catálogo completo de límites disponibles
   * @returns Observable con el catálogo de límites
   */
  getLimitsCatalog(): Observable<LimitsCatalogResponse> {
    return this.http.get<LimitsCatalogResponse>(`${this.apiUrl}/limits/catalog`).pipe(
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
