import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../admin/admin/services/admin.service';
import { AdminInfo } from '../../../admin/admin/models/admin.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: AdminInfo | null = null;
  isLoading = false;
  errorMessage = '';
  currentPageTitle = 'Inicio';
  private routerSubscription?: Subscription;

  // Mapeo de rutas a títulos
  private routeTitleMap: { [key: string]: string } = {
    '/dashboard': 'Inicio',
    '/dashboard/clientes': 'Gestión de Clientes',
    '/dashboard/suscripciones': 'Gestión de Suscripciones',
    '/dashboard/planes': 'Gestión de Planes',
    '/dashboard/planes/nuevo': 'Crear Nuevo Plan',
    '/dashboard/soporte': 'Soporte Técnico',
    '/dashboard/metricas': 'Métricas Globales'
  };

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAdminInfo();
    this.setupRouteListener();
    this.updatePageTitle();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  setupRouteListener(): void {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
    });
  }

  updatePageTitle(): void {
    const url = this.router.url.split('?')[0]; // Remover query params
    
    // Buscar coincidencia exacta primero
    if (this.routeTitleMap[url]) {
      this.currentPageTitle = this.routeTitleMap[url];
      return;
    }

    // Buscar coincidencia parcial (para rutas con parámetros como /dashboard/clientes/:id)
    for (const route in this.routeTitleMap) {
      if (url.startsWith(route) && route !== '/dashboard') {
        // Si es una ruta con parámetro, usar el título base
        if (url.includes('/clientes/') && route === '/dashboard/clientes') {
          this.currentPageTitle = 'Detalle de Cliente';
        } else if (url.includes('/planes/') && !url.includes('/nuevo')) {
          this.currentPageTitle = 'Editar Plan';
        } else {
          this.currentPageTitle = this.routeTitleMap[route];
        }
        return;
      }
    }

    // Por defecto
    this.currentPageTitle = 'Inicio';
  }

  loadAdminInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getAdminInfo().subscribe({
      next: (response) => {
        this.user = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        // Si falla, intentar obtener del AuthService como fallback
        const fallbackUser = this.authService.getUser();
        if (fallbackUser) {
          this.user = {
            UserId: fallbackUser.idUsuario?.toString() || '',
            Email: fallbackUser.email || '',
            FullName: fallbackUser.fullName || '',
            UserType: 'Internal',
            InternalRoles: []
          };
        }
        this.errorMessage = error.message || 'Error al cargar información del usuario';
        this.isLoading = false;
      }
    });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }

  hasRole(role: string): boolean {
    return this.user?.InternalRoles?.includes(role) || false;
  }

  isPlatformOwner(): boolean {
    return this.hasRole('PlatformOwner');
  }

  isPlatformSupport(): boolean {
    return this.hasRole('PlatformSupport');
  }
}
