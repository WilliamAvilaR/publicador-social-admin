import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacebookOAuthService {
  private readonly apiUrl = '/api/Facebook';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la URL de autorización de Facebook
   */
  getAuthUrl(): Observable<{ data: { authUrl: string } }> {
    return this.http.get<{ data: { authUrl: string } }>(`${this.apiUrl}/auth-url`);
  }

  /**
   * Procesa el callback de Facebook después de la autorización
   */
  handleCallback(code: string, state: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/callback`, { code, state });
  }
}
