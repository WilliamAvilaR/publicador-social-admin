import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SubscriptionsService } from '../../services/subscriptions.service';
import { PlansService } from '../../../plans/services/plans.service';
import { TenantsService } from '../../../clients/services/tenants.service';
import { Subscription, SubscriptionDetail, GetSubscriptionsParams } from '../../models/subscription.model';
import { Plan } from '../../../plans/models/plan.model';
import { TenantLimits, UpdateTenantLimitsRequest } from '../../../clients/models/tenant.model';

// Interfaz local para mostrar planes en la UI
interface PlanDisplay {
  name: string;
  code: string;
  price: number;
  limits: {
    pages: number | string;
    users: number | string;
    scheduledPosts: number | string;
    apiCalls: number | string;
  };
  features: string[];
}

@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './subscriptions-list.component.html',
  styleUrl: './subscriptions-list.component.scss'
})
export class SubscriptionsListComponent implements OnInit {
  errorMessage = '';
  successMessage = '';
  updatingPlanId: number | null = null;
  updatingStatusId: number | null = null;
  isLoading = false;
  isLoadingPlans = false;
  subscriptions: Subscription[] = [];
  plans: PlanDisplay[] = [];

  // Filtros
  selectedTenantId: number | null = null;
  selectedStatus: string = '';
  selectedIsActive: boolean | null = null;

  // Estados disponibles (cargados desde la API)
  availableStatuses: Array<{ value: string; label: string }> = [];
  isLoadingStatuses = false;

  // Modal de detalles
  showModal = false;
  selectedSubscription: SubscriptionDetail | null = null;
  isLoadingDetails = false;
  isLoadingLimits = false;
  isUpdatingPlan = false;
  isUpdatingLimits = false;
  modalActiveTab: 'info' | 'plan' | 'limits' = 'info';
  
  // Datos del modal
  tenantLimits: TenantLimits | null = null;
  availablePlansForSelect: Plan[] = [];
  selectedPlanCode: string = '';
  
  // Formulario de límites
  limitsForm: UpdateTenantLimitsRequest = {
    maxUsers: 0,
    maxStorageMB: 0,
    maxPostsPerMonth: 0,
    maxIntegrations: 0,
    maxCollections: 0,
    notes: ''
  };

  constructor(
    private subscriptionsService: SubscriptionsService,
    private plansService: PlansService,
    private tenantsService: TenantsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPlans();
    this.loadStatuses();
    this.loadSubscriptions();
  }

  /**
   * Carga los estados disponibles desde la API
   */
  loadStatuses(): void {
    this.isLoadingStatuses = true;
    this.subscriptionsService.getSubscriptionStatuses().subscribe({
      next: (response) => {
        const data: any = response.data || {};
        const rawStatuses: any[] = data.Statuses || data.statuses || [];
        
        // Normalizar los estados a camelCase para uso en el componente
        this.availableStatuses = rawStatuses.map((s: any) => {
          const value = s.Value ?? s.value ?? '';
          const label = s.Label ?? s.label ?? value;
          return { value, label };
        });
        
        this.isLoadingStatuses = false;
      },
      error: (error) => {
        console.error('Error al cargar estados:', error);
        // En caso de error, usar valores por defecto
        this.availableStatuses = [
          { value: 'Active', label: 'Activa' },
          { value: 'Cancelled', label: 'Cancelada' },
          { value: 'Expired', label: 'Expirada' },
          { value: 'Suspended', label: 'Suspendida' },
          { value: 'Trial', label: 'Prueba' }
        ];
        this.isLoadingStatuses = false;
      }
    });
  }

  /**
   * Carga los planes desde la API
   */
  loadPlans(): void {
    this.isLoadingPlans = true;
    this.plansService.getPlans().subscribe({
      next: (response) => {
        const data: any = response.data || {};

        // Soportar tanto data.Plans (docs) como data.plans (API real)
        const rawPlans: any[] = data.Plans || data.plans || [];

        // Normalizar a la interfaz Plan (PascalCase) para reutilizar mapPlanToDisplay
        const normalizedPlans: Plan[] = rawPlans.map((p: any) => ({
          PlanId: p.PlanId ?? p.planId ?? 0,
          Code: p.Code ?? p.code,
          Name: p.Name ?? p.name,
          Description: p.Description ?? p.description ?? '',
          IsDefault: p.IsDefault ?? p.isDefault ?? false,
          IsPaid: p.IsPaid ?? p.isPaid ?? false,
          IsActive: p.IsActive ?? p.isActive ?? false,
          Price: p.Price ?? p.price ?? null
        }));

        const apiPlans = normalizedPlans;
        
        if (apiPlans.length === 0) {
          // Si no hay planes, usar los por defecto
          this.plans = this.getDefaultPlans();
          this.isLoadingPlans = false;
          return;
        }

        // Verificar si tenemos IDs válidos para cargar detalles
        const plansWithId = apiPlans.filter(p => p.PlanId && p.PlanId > 0);

        if (plansWithId.length > 0 && plansWithId.length === apiPlans.length) {
          // Cargar detalles de cada plan para obtener features y limits
          const planPromises = plansWithId.map(plan => 
            firstValueFrom(this.plansService.getPlanById(plan.PlanId))
          );

          Promise.all(planPromises).then(planDetails => {
            this.plans = planDetails
              .filter(detail => detail !== undefined)
              .map(detail => this.mapPlanDetailToDisplay(detail!.data));
            this.isLoadingPlans = false;
          }).catch(error => {
            console.error('Error loading plan details:', error);
            // Si falla cargar detalles, usar solo la info básica
            this.plans = apiPlans.map(plan => this.mapPlanToDisplay(plan));
            this.isLoadingPlans = false;
          });
        } else {
          // Si no hay IDs válidos, usar solo la info básica de la lista
          this.plans = apiPlans.map(plan => this.mapPlanToDisplay(plan));
          this.isLoadingPlans = false;
        }
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        // Si falla, usar planes por defecto como fallback
        this.plans = this.getDefaultPlans();
        this.isLoadingPlans = false;
      }
    });
  }

  /**
   * Mapea un Plan básico de la API al formato de display
   */
  private mapPlanToDisplay(plan: Plan): PlanDisplay {
    return {
      name: plan.Name,
      code: plan.Code,
      price: plan.Price || 0,
      limits: {
        pages: 'N/A',
        users: 'N/A',
        scheduledPosts: 'N/A',
        apiCalls: 'N/A'
      },
      features: []
    };
  }

  /**
   * Mapea un PlanDetail completo al formato de display
   */
  private mapPlanDetailToDisplay(planDetail: any): PlanDisplay {
    // Extraer límites específicos de los limits del plan
    const limits = this.extractLimitsFromPlan(planDetail.Limits || []);
    
    // Generar features como texto descriptivo
    const features = this.generateFeaturesText(planDetail.Features || []);

    return {
      name: planDetail.Name,
      code: planDetail.Code,
      price: planDetail.Price || 0,
      limits: limits,
      features: features
    };
  }

  /**
   * Extrae límites específicos de la lista de límites del plan
   */
  private extractLimitsFromPlan(planLimits: any[]): PlanDisplay['limits'] {
    const limits: PlanDisplay['limits'] = {
      pages: 'N/A',
      users: 'N/A',
      scheduledPosts: 'N/A',
      apiCalls: 'N/A'
    };

    planLimits.forEach(limit => {
      const key = (limit.LimitKey || limit.limitKey || '').toLowerCase();
      const value = limit.Value !== undefined ? limit.Value : limit.value;

      if (key.includes('page') || key.includes('pagina')) {
        limits.pages = value === null ? 'Ilimitado' : value;
      } else if (key.includes('user')) {
        limits.users = value === null ? 'Ilimitado' : value;
      } else if (key.includes('post')) {
        limits.scheduledPosts = value === null ? 'Ilimitado' : value;
      } else if (key.includes('api')) {
        limits.apiCalls = value === null ? 'Ilimitado' : value;
      }
    });

    return limits;
  }

  /**
   * Genera texto descriptivo de las features
   */
  private generateFeaturesText(features: any[]): string[] {
    if (!features || features.length === 0) {
      return [];
    }

    // Contar features habilitadas por categoría
    const enabledFeatures = features.filter(f => 
      f.IsEnabled !== undefined ? f.IsEnabled : f.isEnabled
    );
    const moduleCount = enabledFeatures.filter(f => {
      const key = f.FeatureKey || f.featureKey || '';
      return key.startsWith('module.');
    }).length;
    const networkCount = enabledFeatures.filter(f => {
      const key = f.FeatureKey || f.featureKey || '';
      return key.startsWith('network.');
    }).length;

    const featureTexts: string[] = [];
    if (moduleCount > 0) {
      featureTexts.push(`${moduleCount} módulo${moduleCount > 1 ? 's' : ''} habilitado${moduleCount > 1 ? 's' : ''}`);
    }
    if (networkCount > 0) {
      featureTexts.push(`${networkCount} red${networkCount > 1 ? 'es' : ''} social${networkCount > 1 ? 'es' : ''}`);
    }

    return featureTexts.length > 0 ? featureTexts : ['Sin features configuradas'];
  }

  /**
   * Planes por defecto como fallback si la API falla
   */
  private getDefaultPlans(): PlanDisplay[] {
    return [
      {
        name: 'Free',
        code: 'free',
        price: 0,
        limits: {
          pages: 1,
          users: 1,
          scheduledPosts: 10,
          apiCalls: 1000
        },
        features: ['1 Página', '1 Usuario', '10 Posts programados', '1,000 llamadas API/mes']
      },
      {
        name: 'Pro',
        code: 'pro',
        price: 29,
        limits: {
          pages: 5,
          users: 3,
          scheduledPosts: 100,
          apiCalls: 10000
        },
        features: ['5 Páginas', '3 Usuarios', '100 Posts programados', '10,000 llamadas API/mes']
      },
      {
        name: 'Enterprise',
        code: 'enterprise',
        price: 99,
        limits: {
          pages: 'Ilimitado',
          users: 'Ilimitado',
          scheduledPosts: 'Ilimitado',
          apiCalls: 'Ilimitado'
        },
        features: ['Páginas ilimitadas', 'Usuarios ilimitados', 'Posts ilimitados', 'API ilimitada']
      }
    ];
  }

  /**
   * Carga las suscripciones desde la API
   */
  loadSubscriptions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: GetSubscriptionsParams = {};
    
    if (this.selectedTenantId !== null) {
      params.tenantId = this.selectedTenantId;
    }
    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }
    if (this.selectedIsActive !== null) {
      params.isActive = this.selectedIsActive;
    }

    this.subscriptionsService.getSubscriptions(params).subscribe({
      next: (response) => {
        this.subscriptions = response.data?.Subscriptions || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar las suscripciones';
        this.isLoading = false;
        console.error('Error loading subscriptions:', error);
      }
    });
  }

  /**
   * Aplica los filtros y recarga las suscripciones
   */
  applyFilters(): void {
    this.loadSubscriptions();
  }

  /**
   * Limpia los filtros y recarga todas las suscripciones
   */
  clearFilters(): void {
    this.selectedTenantId = null;
    this.selectedStatus = '';
    this.selectedIsActive = null;
    this.loadSubscriptions();
  }

  getPlanClass(planCode: string): string {
    return `plan-${planCode.toLowerCase()}`;
  }

  /**
   * Formatea el valor de un límite para mostrar
   */
  getLimitDisplay(limit: number | string): string {
    if (typeof limit === 'string') {
      return limit;
    }
    if (limit === -1 || limit === null) {
      return 'Ilimitado';
    }
    if (typeof limit === 'number' && limit >= 1000) {
      return limit.toLocaleString();
    }
    return limit.toString();
  }

  /**
   * Abre el modal de detalles de suscripción
   */
  viewPaymentHistory(subscriptionId: number): void {
    this.showModal = true;
    this.isLoadingDetails = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.modalActiveTab = 'info';
    this.selectedSubscription = null;
    this.tenantLimits = null;

    // Cargar detalles de la suscripción
    this.subscriptionsService.getSubscriptionById(subscriptionId).subscribe({
      next: (response) => {
        this.selectedSubscription = response.data;
        this.selectedPlanCode = response.data.PlanCode;
        this.isLoadingDetails = false;
        
        // Cargar límites del tenant
        this.loadTenantLimits(response.data.TenantId);
        
        // Cargar planes disponibles para el select
        this.loadAvailablePlans();
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar los detalles de la suscripción';
        this.isLoadingDetails = false;
        console.error('Error loading subscription details:', error);
      }
    });
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showModal = false;
    this.selectedSubscription = null;
    this.tenantLimits = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Carga los límites del tenant
   */
  loadTenantLimits(tenantId: number): void {
    this.isLoadingLimits = true;
    this.tenantsService.getTenantLimits(tenantId).subscribe({
      next: (response: any) => {
        const raw = response.data || {};
        const limits = raw.Limits || raw.limits;
        
        if (limits) {
          this.tenantLimits = {
            maxUsers: limits.MaxUsers ?? limits.maxUsers ?? 0,
            maxStorageMB: limits.MaxStorageMB ?? limits.maxStorageMB ?? 0,
            maxPostsPerMonth: limits.MaxPostsPerMonth ?? limits.maxPostsPerMonth ?? 0,
            maxIntegrations: limits.MaxIntegrations ?? limits.maxIntegrations ?? 0,
            maxCollections: limits.MaxCollections ?? limits.maxCollections ?? 0,
            notes: limits.Notes ?? limits.notes ?? ''
          };
          
          // Prellenar formulario
          this.limitsForm = {
            maxUsers: this.tenantLimits.maxUsers,
            maxStorageMB: this.tenantLimits.maxStorageMB,
            maxPostsPerMonth: this.tenantLimits.maxPostsPerMonth,
            maxIntegrations: this.tenantLimits.maxIntegrations,
            maxCollections: this.tenantLimits.maxCollections,
            notes: this.tenantLimits.notes || ''
          };
        } else {
          // Si no hay límites personalizados, inicializar con valores por defecto
          this.tenantLimits = null;
          this.limitsForm = {
            maxUsers: 0,
            maxStorageMB: 0,
            maxPostsPerMonth: 0,
            maxIntegrations: 0,
            maxCollections: 0,
            notes: ''
          };
        }
        this.isLoadingLimits = false;
      },
      error: (error) => {
        console.error('Error loading tenant limits:', error);
        // Si no hay límites, no es un error crítico
        this.tenantLimits = null;
        this.limitsForm = {
          maxUsers: 0,
          maxStorageMB: 0,
          maxPostsPerMonth: 0,
          maxIntegrations: 0,
          maxCollections: 0,
          notes: ''
        };
        this.isLoadingLimits = false;
      }
    });
  }

  /**
   * Carga los planes disponibles para el select
   */
  loadAvailablePlans(): void {
    this.plansService.getPlans().subscribe({
      next: (response: any) => {
        const data: any = response.data || {};
        const rawPlans: any[] = data.Plans || data.plans || [];
        
        this.availablePlansForSelect = rawPlans.map((p: any) => ({
          PlanId: p.PlanId ?? p.planId ?? 0,
          Code: p.Code ?? p.code,
          Name: p.Name ?? p.name,
          Description: p.Description ?? p.description ?? '',
          IsDefault: p.IsDefault ?? p.isDefault ?? false,
          IsPaid: p.IsPaid ?? p.isPaid ?? false,
          IsActive: p.IsActive ?? p.isActive ?? false,
          Price: p.Price ?? p.price ?? null
        }));
      },
      error: (error) => {
        console.error('Error loading plans for select:', error);
      }
    });
  }

  /**
   * Cambia el plan del tenant
   */
  updateTenantPlan(): void {
    if (!this.selectedSubscription || !this.selectedPlanCode) {
      return;
    }

    if (this.selectedPlanCode === this.selectedSubscription.PlanCode) {
      this.errorMessage = 'El tenant ya tiene este plan asignado';
      return;
    }

    if (!confirm(`¿Cambiar el plan de "${this.selectedSubscription.PlanCode}" a "${this.selectedPlanCode}" para ${this.selectedSubscription.TenantName}?`)) {
      return;
    }

    this.isUpdatingPlan = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.updateTenantPlan(this.selectedSubscription.TenantId, this.selectedPlanCode).subscribe({
      next: (response: any) => {
        const data = response.data || {};
        
        // Actualizar el plan en la suscripción local
        if (this.selectedSubscription) {
          this.selectedSubscription.PlanCode = this.selectedPlanCode;
        }
        
        // Actualizar en la lista de suscripciones
        const subscription = this.subscriptions.find(s => s.SubscriptionId === this.selectedSubscription?.SubscriptionId);
        if (subscription) {
          subscription.PlanCode = this.selectedPlanCode;
        }
        
        this.isUpdatingPlan = false;
        this.successMessage = data.Message || `Plan actualizado exitosamente a "${this.selectedPlanCode}"`;
        
        // Recargar suscripciones para obtener datos actualizados
        this.loadSubscriptions();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al actualizar el plan';
        this.isUpdatingPlan = false;
        console.error('Error updating tenant plan:', error);
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Actualiza los límites del tenant
   */
  updateTenantLimits(): void {
    if (!this.selectedSubscription) {
      return;
    }

    this.isUpdatingLimits = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.tenantsService.updateTenantLimits(this.selectedSubscription.TenantId, this.limitsForm).subscribe({
      next: (response: any) => {
        const data = response.data || {};
        const limits = data.Limits || data.limits || {};
        
        // Actualizar límites locales
        this.tenantLimits = {
          maxUsers: limits.MaxUsers ?? limits.maxUsers ?? this.limitsForm.maxUsers,
          maxStorageMB: limits.MaxStorageMB ?? limits.maxStorageMB ?? this.limitsForm.maxStorageMB,
          maxPostsPerMonth: limits.MaxPostsPerMonth ?? limits.maxPostsPerMonth ?? this.limitsForm.maxPostsPerMonth,
          maxIntegrations: limits.MaxIntegrations ?? limits.maxIntegrations ?? this.limitsForm.maxIntegrations,
          maxCollections: limits.MaxCollections ?? limits.maxCollections ?? this.limitsForm.maxCollections,
          notes: limits.Notes ?? limits.notes ?? this.limitsForm.notes
        };
        
        this.isUpdatingLimits = false;
        this.successMessage = data.Message || 'Límites actualizados exitosamente';
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al actualizar los límites';
        this.isUpdatingLimits = false;
        console.error('Error updating tenant limits:', error);
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Cambia el tab activo del modal
   */
  setModalTab(tab: 'info' | 'plan' | 'limits'): void {
    this.modalActiveTab = tab;
  }

  /**
   * Actualiza el estado de una suscripción
   */
  updateSubscriptionStatus(subscriptionId: number, newStatus: string): void {
    const subscription = this.subscriptions.find(s => s.SubscriptionId === subscriptionId);
    if (!subscription || newStatus === subscription.Status) {
      return;
    }

    const cancellationReason = newStatus === 'Cancelled' 
      ? prompt('Razón de cancelación (opcional):') || null
      : null;

    if (newStatus === 'Cancelled' && cancellationReason === null && !confirm('¿Continuar sin razón de cancelación?')) {
      return;
    }

    if (!confirm(`¿Cambiar el estado de "${subscription.Status}" a "${newStatus}" para ${subscription.TenantName}?`)) {
      return;
    }

    this.updatingStatusId = subscriptionId;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscriptionsService.updateSubscriptionStatus(subscriptionId, {
      Status: newStatus,
      CancellationReason: cancellationReason
    }).subscribe({
      next: (response) => {
        console.log('Update status response:', response);
        console.log('Current subscription before update:', subscription);
        console.log('Available statuses:', this.availableStatuses);
        
        // Actualizar el estado en la suscripción local
        // Usar el valor de la respuesta o el valor enviado como fallback
        const newStatusValue = response.data.NewStatus || newStatus;
        console.log('New status value from API:', newStatusValue);
        console.log('New status sent:', newStatus);
        
        // Buscar el estado en availableStatuses para asegurar que usamos el formato correcto
        const statusObj = this.availableStatuses.find(s => 
          s.value && s.value.toLowerCase() === newStatusValue.toLowerCase()
        );
        console.log('Status object found:', statusObj);
        
        // Usar el valor del estado encontrado o el valor original
        const finalStatus = statusObj ? statusObj.value : newStatusValue;
        console.log('Final status to set:', finalStatus);
        
        // Actualizar directamente el objeto en el array
        subscription.Status = finalStatus;
        subscription.IsActive = response.data.IsActive;
        
        if (response.data.CancelledAt) {
          subscription.CancelledAt = response.data.CancelledAt;
        }
        if (response.data.CancellationReason !== undefined) {
          subscription.CancellationReason = response.data.CancellationReason;
        }
        
        console.log('Subscription after update:', subscription);
        console.log('Subscription.Status:', subscription.Status);
        
        // Crear una nueva referencia del array para forzar la detección de cambios
        this.subscriptions = [...this.subscriptions];
        
        // Forzar detección de cambios para actualizar la vista
        this.cdr.detectChanges();
        
        // Obtener el label del estado para el mensaje
        const statusLabel = statusObj ? statusObj.label : newStatusValue;
        this.updatingStatusId = null;
        this.successMessage = response.data.Message || `Estado actualizado exitosamente a "${statusLabel}"`;
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || `Error al actualizar el estado para ${subscription.TenantName}`;
        this.updatingStatusId = null;
        console.error('Error updating subscription status:', error);
        
        // Limpiar mensaje de error después de 5 segundos
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Obtiene el nombre del plan desde el código
   */
  getPlanName(planCode: string): string {
    const plan = this.plans.find(p => p.code === planCode.toLowerCase());
    return plan ? plan.name : planCode.charAt(0).toUpperCase() + planCode.slice(1).toLowerCase();
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'status-active';
    if (statusLower === 'cancelled') return 'status-cancelled';
    if (statusLower === 'expired') return 'status-expired';
    if (statusLower === 'suspended') return 'status-suspended';
    if (statusLower === 'trial') return 'status-trial';
    return 'status-default';
  }

  /**
   * Obtiene el texto en español para el estado desde la lista cargada de la API
   */
  getStatusText(status: string): string {
    if (!status) return '-';
    
    // Buscar el estado en la lista cargada desde la API
    const statusObj = this.availableStatuses.find(s => 
      s.value && s.value.toLowerCase() === status.toLowerCase()
    );
    
    // Si se encuentra el estado, devolver su label; si no, devolver el valor original
    return statusObj ? statusObj.label : status;
  }
}
