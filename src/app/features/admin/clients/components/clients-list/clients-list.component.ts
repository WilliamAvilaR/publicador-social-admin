import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../services/tenants.service';
import { Tenant, GetTenantsParams, TenantStatus } from '../../models/tenant.model';
import { PlansService } from '../../../plans/services/plans.service';
import { Plan } from '../../../plans/models/plan.model';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.scss'
})
export class ClientsListComponent implements OnInit {
  clients: Tenant[] = [];
  isLoading = false;
  errorMessage = '';

  // Filtros
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedPlanCode: string = '';

  // Planes disponibles para el filtro (cargados desde GET /api/admin/plans)
  availablePlans: Plan[] = [];
  isLoadingPlans: boolean = false;
  
  // Estados disponibles para el filtro (cargados desde GET /api/admin/tenants/statuses)
  availableStatuses: Array<{ value: string; label: string }> = [];
  isLoadingStatuses: boolean = false;
  
  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 0;

  // Valores estables para evitar parpadeo durante la carga
  stableActiveClients: number = 0;
  stableTrialClients: number = 0;
  stableSuspendedClients: number = 0;
  stableInactiveClients: number = 0;

  constructor(
    private tenantsService: TenantsService,
    private plansService: PlansService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Leer query params para restaurar paginación y filtros
    this.route.queryParams.subscribe(params => {
      // Restaurar paginación (con valores por defecto cuando no hay query param)
      const page = parseInt(params['page'], 10);
      this.currentPage = Number.isFinite(page) && page > 0 ? page : 1;

      const pageSize = parseInt(params['pageSize'], 10);
      this.pageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;

      // Restaurar filtros (si no existen en URL, se limpian)
      this.searchTerm = params['search'] ?? '';
      this.selectedStatus = params['status'] ?? '';
      this.selectedPlanCode = params['planCode'] ?? '';
      
      // Cargar datos
      this.loadPlans();
      this.loadStatuses();
      this.loadTenants();
    });
  }

  /**
   * Carga los estados disponibles desde la API de administración de tenants
   * para poblar el filtro de "Todos los estados"
   */
  loadStatuses(): void {
    this.isLoadingStatuses = true;
    
    this.tenantsService.getTenantStatuses().subscribe({
      next: (response) => {
        const data: any = response.data || {};
        const rawStatuses: any[] = data.Statuses || data.statuses || [];
        
        // Normalizar los estados para el filtro
        this.availableStatuses = rawStatuses.map((s: any) => {
          const value = s.Value ?? s.value ?? '';
          const label = s.Label ?? s.label ?? value;
          return { value, label };
        });
        
        this.isLoadingStatuses = false;
      },
      error: (error) => {
        console.error('Error al cargar estados para el filtro:', error);
        // Sin fallback local: si falla la API, no se cargan estados
        this.availableStatuses = [];
        this.isLoadingStatuses = false;
      }
    });
  }

  /**
   * Carga los planes disponibles desde la API de administración de planes
   * para poblar el filtro de "Todos los planes"
   */
  loadPlans(): void {
    this.isLoadingPlans = true;

    this.plansService.getPlans().subscribe({
      next: (response) => {
        const data: any = response.data || {};

        // Soportar tanto data.Plans (docs) como data.plans (API real)
        const rawPlans: any[] = data.Plans || data.plans || [];

        // Normalizar a la interfaz Plan (PascalCase) para el resto de la app
        this.availablePlans = rawPlans.map((p: any) => ({
          PlanId: p.PlanId ?? p.planId ?? 0,
          Code: p.Code ?? p.code,
          Name: p.Name ?? p.name,
          Description: p.Description ?? p.description ?? '',
          IsDefault: p.IsDefault ?? p.isDefault ?? false,
          IsPaid: p.IsPaid ?? p.isPaid ?? false,
          IsActive: p.IsActive ?? p.isActive ?? false,
          Price: p.Price ?? p.price ?? null
        }));

        this.isLoadingPlans = false;
      },
      error: (error) => {
        console.error('Error al cargar planes para el filtro:', error);
        // En caso de error, dejamos availablePlans vacío y no bloqueamos la pantalla
        this.isLoadingPlans = false;
      }
    });
  }

  loadTenants(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: GetTenantsParams = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    // Agregar filtros solo si tienen valor
    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }
    if (this.selectedPlanCode) {
      params.planCode = this.selectedPlanCode;
    }

    this.tenantsService.getTenants(params).subscribe({
      next: (response) => {
        // Mapear desde la respuesta de la API (PascalCase) al modelo (camelCase)
        const data: any = response.data || {};
        
        // La API devuelve "Tenants" con mayúscula, mapear a camelCase
        const rawTenants = data.Tenants ?? data.tenants ?? [];
        const tenantsArray: any[] = Array.isArray(rawTenants) ? rawTenants : [];
        
        // Opción 1: Mantener datos anteriores - Solo actualizar cuando los datos estén listos
        // NO limpiar this.clients aquí, se actualiza directamente
        this.clients = tenantsArray.map((t: any) => ({
          tenantId: t.TenantId ?? t.tenantId ?? 0,
          name: t.Name ?? t.name ?? '',
          email: t.Email ?? t.email ?? t.OwnerEmail ?? t.ownerEmail ?? t.UserEmail ?? t.userEmail ?? '',
          slug: t.Slug ?? t.slug ?? '',
          description: t.Description ?? t.description ?? '',
          planCode: t.PlanCode ?? t.planCode ?? '',
          isActive: t.IsActive ?? t.isActive ?? false,
          status: t.Status ?? t.status ?? '', // Campo status de la API
          suspendedAt: t.SuspendedAt ?? t.suspendedAt ?? null,
          createdAt: t.CreatedAt ?? t.createdAt ?? '',
          activeUsersCount: t.ActiveUsersCount ?? t.activeUsersCount ?? 0
        }));
        
        // Total de registros (soporta PascalCase y camelCase)
        this.totalCount = data.Total ?? data.total ?? data.count ?? 0;
        
        // Calcular totalPages desde meta si está disponible, o desde la propia data
        if (response.meta) {
          this.totalPages = response.meta.totalPages;
          this.currentPage = response.meta.currentPage;
        } else if (data.TotalPages !== undefined || data.totalPages !== undefined) {
          // Usar TotalPages/totalPages de la respuesta si está disponible
          this.totalPages = data.TotalPages ?? data.totalPages;
          this.currentPage = data.Page ?? data.page ?? 1;
        } else {
          // Calcular totalPages manualmente si meta/data no lo traen explícito
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        }
        
        // Actualizar valores estables solo después de cargar los datos
        this.stableActiveClients = this.activeClients;
        this.stableTrialClients = this.trialClients;
        this.stableSuspendedClients = this.suspendedClients;
        this.stableInactiveClients = this.inactiveClients;
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar los clientes';
        this.isLoading = false;
        console.error('Error loading tenants:', error);
      }
    });
  }

  /**
   * Opción 3: trackBy para optimizar el renderizado y evitar recrear filas innecesariamente
   */
  trackByClientId(index: number, client: Tenant): any {
    return client.tenantId || index;
  }

  /**
   * Aplica los filtros y recarga los tenants
   */
  applyFilters(): void {
    this.currentPage = 1; // Resetear a la primera página
    this.updateQueryParams();
    this.loadTenants();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedPlanCode = '';
    this.currentPage = 1;
    this.clearQueryParams();
    this.loadTenants();
  }

  /**
   * Cambia de página
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateQueryParams();
      this.loadTenants();
    }
  }

  /**
   * Maneja el cambio de tamaño de página
   */
  onPageSizeChange(): void {
    this.currentPage = 1; // Resetear a la primera página
    this.updateQueryParams();
    this.loadTenants();
  }

  /**
   * Genera los números de página a mostrar con lógica de elipsis
   * Retorna un array donde -1 representa elipsis
   */
  getPageNumbers(): (number | -1)[] {
    const pages: number[] = [];
    const maxVisible = 7; // Máximo de números visibles
    const sidePages = 2; // Páginas a cada lado de la actual

    if (this.totalPages <= maxVisible) {
      // Si hay pocas páginas, mostrar todas
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1);

      // Calcular rango de páginas alrededor de la actual
      let start = Math.max(2, this.currentPage - sidePages);
      let end = Math.min(this.totalPages - 1, this.currentPage + sidePages);

      // Ajustar si estamos cerca del inicio
      if (this.currentPage <= sidePages + 2) {
        end = Math.min(maxVisible - 1, this.totalPages - 1);
      }

      // Ajustar si estamos cerca del final
      if (this.currentPage >= this.totalPages - sidePages - 1) {
        start = Math.max(2, this.totalPages - maxVisible + 2);
      }

      // Agregar elipsis antes si es necesario
      if (start > 2) {
        pages.push(-1); // -1 representa elipsis
      }

      // Agregar páginas del rango
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Agregar elipsis después si es necesario
      if (end < this.totalPages - 1) {
        pages.push(-1); // -1 representa elipsis
      }

      // Siempre mostrar última página
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  /**
   * Calcula el índice inicial de los resultados mostrados
   */
  getStartIndex(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Calcula el índice final de los resultados mostrados
   */
  getEndIndex(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(end, this.totalCount);
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'active') return 'status-active';
    if (normalizedStatus === 'suspended') return 'status-suspended';
    if (normalizedStatus === 'trial') return 'status-trial';
    if (normalizedStatus === 'inactive') return 'status-inactive';
    
    return '';
  }

  getStatusText(status: string | undefined): string {
    if (!status) return '-';
    
    // Buscar el estado en la lista cargada desde la API
    const statusObj = this.availableStatuses.find(s => 
      s.value.toLowerCase() === status.toLowerCase()
    );
    
    // Si se encuentra el estado, devolver su etiqueta traducida; si no, devolver el valor original
    return statusObj ? statusObj.label : status;
  }

  getPlanClass(planCode: string | undefined): string {
    if (!planCode) return '';
    const planMap: { [key: string]: string } = {
      'free': 'plan-free',
      'pro': 'plan-pro',
      'enterprise': 'plan-enterprise'
    };
    return planMap[planCode.toLowerCase()] || '';
  }

  /**
   * Obtiene el nombre del plan desde la API usando el código del plan
   */
  getPlanText(planCode: string | undefined): string {
    if (!planCode) return '-';
    
    // Buscar el plan en la lista cargada desde la API
    const plan = this.availablePlans.find(p => 
      p.Code && p.Code.toLowerCase() === planCode.toLowerCase()
    );
    
    // Si se encuentra el plan, devolver su nombre; si no, devolver el código
    return plan ? plan.Name : planCode;
  }

  // Getters para estadísticas
  get totalClients(): number {
    return this.clients.length;
  }

  get activeClients(): number {
    return this.clients.filter(c => {
      const status = (c.status || '').toLowerCase();
      return status === 'active' || (status === '' && c.isActive);
    }).length;
  }

  get trialClients(): number {
    return this.clients.filter(c => {
      const status = (c.status || '').toLowerCase();
      return status === 'trial';
    }).length;
  }

  get suspendedClients(): number {
    return this.clients.filter(c => {
      const status = (c.status || '').toLowerCase();
      return status === 'suspended';
    }).length;
  }

  get inactiveClients(): number {
    return this.clients.filter(c => {
      const status = (c.status || '').toLowerCase();
      return status === 'inactive';
    }).length;
  }

  /**
   * Actualiza los query params en la URL para preservar el estado de paginación y filtros
   */
  private updateQueryParams(): void {
    const queryParams: any = {};
    
    // Solo agregar query params si no son los valores por defecto
    queryParams['page'] = this.currentPage > 1 ? this.currentPage : null;
    
    if (this.pageSize !== 10) {
      queryParams['pageSize'] = this.pageSize;
    }
    
    queryParams['search'] = this.searchTerm && this.searchTerm.trim()
      ? this.searchTerm.trim()
      : null;
    
    queryParams['status'] = this.selectedStatus || null;
    
    queryParams['planCode'] = this.selectedPlanCode || null;
    
    // Actualizar URL sin recargar la página
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true // Reemplazar en lugar de agregar al historial
    });
  }

  /**
   * Limpia los query params de filtros de la URL (para cuando se limpian los filtros)
   * Mantiene pageSize si no es el valor por defecto
   */
  private clearQueryParams(): void {
    const queryParams: any = {
      page: null,      // Resetear a página 1
      search: null,    // Eliminar búsqueda
      status: null,    // Eliminar filtro de estado
      planCode: null   // Eliminar filtro de plan
    };
    
    // Mantener pageSize solo si no es el valor por defecto
    if (this.pageSize !== 10) {
      queryParams['pageSize'] = this.pageSize;
    } else {
      queryParams['pageSize'] = null;
    }
    
    // Actualizar URL eliminando los query params de filtros
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
