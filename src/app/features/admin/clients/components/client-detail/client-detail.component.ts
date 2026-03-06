import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TenantsService } from '../../services/tenants.service';
import { PlansService } from '../../../plans/services/plans.service';
import { TenantDetail, TenantDetailRaw } from '../../models/tenant.model';
import { Plan } from '../../../plans/models/plan.model';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent implements OnInit {
  clientId: number | null = null;
  client: TenantDetail | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isUpdatingStatus = false;
  isUpdatingPlan = false;

  // Opciones disponibles para status (cargadas desde la API)
  availableStatuses: { value: string; label: string }[] = [];
  isLoadingStatuses = false;
  availablePlans: Plan[] = [];
  isLoadingPlans = false;

  constructor(
    private route: ActivatedRoute,
    private tenantsService: TenantsService,
    private plansService: PlansService,
    private cdr: ChangeDetectorRef
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    this.clientId = id ? parseInt(id, 10) : null;
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadPlans();
      this.loadStatuses();
      this.loadTenantDetail();
    } else {
      this.errorMessage = 'ID de cliente no válido';
    }
  }

  /**
   * Carga los estados disponibles desde la API
   */
  loadStatuses(): void {
    this.isLoadingStatuses = true;
    this.tenantsService.getTenantStatuses().subscribe({
      next: (response) => {
        const data: any = response.data || {};
        const rawStatuses: any[] = data.Statuses || data.statuses || [];
        
        // Normalizar los estados a minúsculas para que coincidan con client.status
        this.availableStatuses = rawStatuses.map((s: any) => {
          const rawValue = s.Value ?? s.value ?? '';
          const value = rawValue.toLowerCase(); // Normalizar a minúsculas
          const label = s.Label ?? s.label ?? rawValue;
          return { value, label };
        });
        
        this.isLoadingStatuses = false;
      },
      error: (error) => {
        console.error('Error al cargar estados:', error);
        // En caso de error, usar valores por defecto
        this.availableStatuses = [
          { value: 'active', label: 'Activo' },
          { value: 'suspended', label: 'Suspendido' },
          { value: 'trial', label: 'Trial' },
          { value: 'inactive', label: 'Inactivo' }
        ];
        this.isLoadingStatuses = false;
      }
    });
  }

  /**
   * Carga los planes disponibles desde la API
   */
  loadPlans(): void {
    this.isLoadingPlans = true;
    this.plansService.getPlans().subscribe({
      next: (response) => {
        const data: any = response.data || {};
        const rawPlans: any[] = data.Plans || data.plans || [];
        
        // Normalizar a la interfaz Plan (PascalCase)
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
        console.error('Error al cargar planes:', error);
        this.isLoadingPlans = false;
      }
    });
  }

  loadTenantDetail(callback?: () => void): void {
    if (!this.clientId) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.tenantsService.getTenantById(this.clientId).subscribe({
      next: (response) => {
        console.log('Raw API response:', response);
        console.log('Response data:', response.data);
        
        // Mapear desde la respuesta real de la API (PascalCase) a nuestro modelo (camelCase)
        this.client = this.mapTenantDetail(response.data);
        console.log('Tenant detail loaded:', this.client);
        console.log('Tenant name:', this.client.name);
        console.log('User name:', this.client.userName);
        this.isLoading = false;
        
        // Ejecutar callback si se proporciona (útil para actualizar campos después de recargar)
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el detalle del cliente';
        this.isLoading = false;
        console.error('Error loading tenant detail:', error);
      }
    });
  }

  /**
   * Mapea la respuesta de la API (PascalCase) al modelo del componente (camelCase)
   */
  private mapTenantDetail(raw: any): TenantDetail {
    console.log('mapTenantDetail - Raw input:', raw);
    console.log('mapTenantDetail - raw.Name:', raw?.Name);
    console.log('mapTenantDetail - raw.name:', raw?.name);
    
    // La API puede devolver en PascalCase o camelCase, soportar ambos
    const tenantId = raw.TenantId ?? raw.tenantId ?? raw.id ?? 0;
    const name = raw.Name ?? raw.name ?? '';
    const slug = raw.Slug ?? raw.slug ?? '';
    const description = raw.Description ?? raw.description ?? '';
    const planCode = raw.PlanCode ?? raw.planCode ?? '';
    const isActive = raw.IsActive ?? raw.isActive ?? false;
    const suspendedAt = raw.SuspendedAt ?? raw.suspendedAt ?? null;
    const externalKey = raw.ExternalKey ?? raw.externalKey ?? null;
    const createdAt = raw.CreatedAt ?? raw.createdAt ?? '';
    const updatedAt = raw.UpdatedAt ?? raw.updatedAt ?? '';
    const users = raw.Users ?? raw.users ?? [];
    const activeUsersCount = raw.ActiveUsersCount ?? raw.activeUsersCount ?? 0;
    const activeSubscription = raw.ActiveSubscription ?? raw.activeSubscription ?? null;
    
    // Calcular el estado desde IsActive y SuspendedAt
    // Según la documentación de estados permitidos:
    // - Active: IsActive = true, SuspendedAt = null
    // - Suspended: IsActive = true, SuspendedAt != null
    // - Trial: IsActive = true, SuspendedAt = null (similar a active, no se puede distinguir sin más info)
    // - Inactive: IsActive = false, SuspendedAt = null
    let status = 'active';
    
    // Si la API devuelve un campo Status, usarlo directamente (normalizado a minúsculas)
    const apiStatus = raw.Status ?? raw.status;
    if (apiStatus) {
      // Normalizar a minúsculas para que coincida con availableStatuses
      status = apiStatus.toLowerCase();
      console.log('Status from API:', apiStatus, '-> normalized:', status);
    } else {
      // Si no hay Status, calcular desde IsActive y SuspendedAt
      if (suspendedAt) {
        // Si tiene SuspendedAt, es "suspended" (IsActive puede ser true o false)
        status = 'suspended';
      } else if (!isActive) {
        // Si no está activo y no tiene SuspendedAt, es "inactive"
        status = 'inactive';
      } else {
        // Si está activo y no tiene SuspendedAt, por defecto es "active"
        // (no podemos distinguir entre "active" y "trial" sin más información)
        status = 'active';
      }
    }

    // Obtener email del primer usuario si existe
    const email = users && users.length > 0 ? (users[0].UserEmail ?? users[0].userEmail ?? '') : '';

    // Obtener nombre del usuario Owner o el primer usuario disponible
    let userName = '';
    if (users && users.length > 0) {
      // Buscar usuario con rol Owner
      const ownerUser = users.find((u: any) => {
        const role = u.RoleInTenant ?? u.roleInTenant ?? '';
        return role.toLowerCase() === 'owner';
      });
      
      if (ownerUser) {
        userName = ownerUser.UserName ?? ownerUser.userName ?? '';
      } else if (users[0]) {
        // Si no hay Owner, usar el primer usuario
        userName = users[0].UserName ?? users[0].userName ?? '';
      }
    }
    
    console.log('Mapping tenant - Name found:', name);
    console.log('Mapping tenant - Slug found:', slug);
    console.log('Mapping tenant - Users:', users);
    console.log('Mapping tenant - UserName:', userName);
    
    // Capitalizar el plan para mostrar
    const planDisplay = planCode 
      ? planCode.charAt(0).toUpperCase() + planCode.slice(1)
      : '';

    // Asegurar que el nombre del tenant siempre tenga un valor
    const tenantName = name || slug || 'Sin nombre';
    
    console.log('Mapping tenant - Final tenantName:', tenantName);

    return {
      id: tenantId,
      name: tenantName,
      slug: slug,
      description: description,
      planCode: planCode,
      plan: planDisplay, // Para compatibilidad con la vista
      isActive: isActive,
      suspendedAt: suspendedAt,
      externalKey: externalKey,
      createdAt: createdAt,
      updatedAt: updatedAt,
      lastActivity: updatedAt, // Usar UpdatedAt como última actividad
      status: status,
      users: users,
      activeUsersCount: activeUsersCount,
      activeSubscription: activeSubscription,
      email: email, // Email del primer usuario
      userName: userName, // Nombre del usuario principal
      pages: [], // No existe en la API, mantener array vacío
      groups: [] // No existe en la API, mantener array vacío
    };
  }

  forceLogout(): void {
    if (confirm('¿Estás seguro de forzar el logout de este cliente?')) {
      console.log('Forzando logout para cliente:', this.clientId);
      // Implementar lógica cuando esté disponible en la API
    }
  }

  resetFacebookTokens(): void {
    if (confirm('¿Estás seguro de resetear los tokens de Facebook? Esto desconectará todas las páginas y grupos.')) {
      console.log('Reseteando tokens de Facebook para cliente:', this.clientId);
      // Implementar lógica cuando esté disponible en la API
    }
  }

  /**
   * Actualiza el estado del tenant
   * La API espera: 'active', 'suspended', 'trial' (en minúsculas)
   */
  updateStatus(newStatus: string): void {
    if (!this.clientId || !this.client) return;
    
    // Convertir a minúsculas para la API
    const statusForApi = newStatus.toLowerCase();
    
    if (statusForApi === this.client.status) {
      return; // No hacer nada si es el mismo estado
    }

    const statusDisplay = this.getStatusDisplayName(statusForApi);
    const currentStatusDisplay = this.getStatusDisplayName(this.client.status);

    if (!confirm(`¿Cambiar el estado de "${currentStatusDisplay}" a "${statusDisplay}"?`)) {
      return;
    }

    this.isUpdatingStatus = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.updateTenantStatus(this.clientId, statusForApi).subscribe({
      next: (response) => {
        console.log('Status update response:', response);
        // La respuesta puede tener Status o status, usar any para flexibilidad
        const responseData = response.data as any;
        const updatedStatus = responseData?.Status ?? responseData?.status ?? statusForApi;
        const normalizedStatus = updatedStatus.toLowerCase();
        
        this.isUpdatingStatus = false;
        this.successMessage = `Estado actualizado exitosamente a "${statusDisplay}"`;
        
        // Recargar el tenant completo para obtener todos los campos actualizados
        // Pero preservar el status actualizado porque el GET no lo devuelve
        this.loadTenantDetail(() => {
          // Después de recargar, actualizar el status con el valor de la respuesta de actualización
          if (this.client) {
            this.client.status = normalizedStatus;
            this.cdr.detectChanges();
          }
        });
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al actualizar el estado';
        this.isUpdatingStatus = false;
        console.error('Error updating status:', error);
      }
    });
  }

  /**
   * Actualiza el plan del tenant
   * La API espera el PlanCode en minúsculas (ej: 'free', 'pro', 'enterprise')
   */
  updatePlan(newPlanCode: string): void {
    if (!this.clientId || !this.client) return;
    
    // Convertir a minúsculas para la API
    const planCode = newPlanCode.toLowerCase();
    
    if (planCode === this.client.planCode?.toLowerCase()) {
      return; // No hacer nada si es el mismo plan
    }

    // Obtener el nombre del plan para mostrar
    const plan = this.availablePlans.find(p => p.Code.toLowerCase() === planCode);
    const planDisplayName = plan ? plan.Name : newPlanCode;
    const currentPlanDisplay = this.client.plan || this.client.planCode;

    if (!confirm(`¿Cambiar el plan de "${currentPlanDisplay}" a "${planDisplayName}"?`)) {
      return;
    }

    this.isUpdatingPlan = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.updateTenantPlan(this.clientId, planCode).subscribe({
      next: (response) => {
        this.isUpdatingPlan = false;
        this.successMessage = `Plan actualizado exitosamente a "${planDisplayName}"`;
        
        // Recargar el tenant completo para obtener todos los campos actualizados
        this.loadTenantDetail();
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al actualizar el plan';
        this.isUpdatingPlan = false;
        console.error('Error updating plan:', error);
      }
    });
  }

  /**
   * Obtiene el nombre para mostrar del estado desde la lista cargada de la API
   */
  getStatusDisplayName(status: string | undefined): string {
    if (!status) return '-';
    
    // Buscar el estado en la lista cargada desde la API
    const statusObj = this.availableStatuses.find(s => 
      s.value && s.value.toLowerCase() === status.toLowerCase()
    );
    
    // Si se encuentra el estado, devolver su label; si no, devolver el valor original
    return statusObj ? statusObj.label : status;
  }

  /**
   * Obtiene la clase CSS para el status
   */
  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'status-active';
    if (statusLower === 'suspended') return 'status-suspended';
    if (statusLower === 'trial') return 'status-trial';
    if (statusLower === 'inactive') return 'status-inactive';
    return '';
  }

  /**
   * Obtiene la clase CSS para el plan
   */
  getPlanClass(planCode: string | undefined): string {
    if (!planCode) return '';
    const planLower = planCode.toLowerCase();
    if (planLower === 'free') return 'plan-free';
    if (planLower === 'pro') return 'plan-pro';
    if (planLower === 'enterprise') return 'plan-enterprise';
    return '';
  }

  /**
   * Obtiene el nombre del plan para mostrar
   */
  getPlanDisplayName(planCode: string | undefined): string {
    if (!planCode) return '-';
    const plan = this.availablePlans.find(p => p.Code.toLowerCase() === planCode.toLowerCase());
    return plan ? plan.Name : planCode.charAt(0).toUpperCase() + planCode.slice(1);
  }
}
