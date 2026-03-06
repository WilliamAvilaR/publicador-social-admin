import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae el mensaje de error de una respuesta HTTP
 */
export function extractErrorMessage(error: HttpErrorResponse | Error): string {
  if (error instanceof HttpErrorResponse) {
    if (error.error?.detail) {
      return error.error.detail;
    }
    if (error.error?.title) {
      return error.error.title;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Ocurrió un error desconocido';
  }
  
  return error.message || 'Ocurrió un error desconocido';
}
