import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AdminInfoResponse,
  PlatformOwnerResponse,
  SensitiveDataResponse,
  ApiError
} from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = '/api/admin';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene información del usuario admin autenticado
   * @returns Observable con la información del admin
   */
  getAdminInfo(): Observable<AdminInfoResponse> {
    return this.http.get<AdminInfoResponse>(`${this.apiUrl}/me`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Endpoint solo para PlatformOwner
   * @returns Observable con mensaje de confirmación
   */
  getPlatformOwnerData(): Observable<PlatformOwnerResponse> {
    return this.http.get<PlatformOwnerResponse>(`${this.apiUrl}/platform-owners-only`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene datos sensibles (requiere PlatformSupport o PlatformOwner)
   * @returns Observable con datos sensibles
   */
  getSensitiveData(): Observable<SensitiveDataResponse> {
    return this.http.get<SensitiveDataResponse>(`${this.apiUrl}/sensitive-data`).pipe(
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
