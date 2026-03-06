import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PlansService } from '../../services/plans.service';
import { FeaturesService } from '../../../features/services/features.service';
import {
  PlanDetail,
  CreatePlanRequest,
  UpdatePlanRequest,
  UpdatePlanFeaturesRequest,
  UpdatePlanLimitsRequest,
  PlanFeature,
  PlanLimit
} from '../../models/plan.model';
import {
  Feature,
  Limit,
  FeaturesCatalogResponse,
  LimitsCatalogResponse
} from '../../../features/models/feature.model';

@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plan-form.component.html',
  styleUrl: './plan-form.component.scss'
})
export class PlanFormComponent implements OnInit {
  planId: number | null = null;   // Se obtiene desde el detalle (PlanDetail)
  planCode: string | null = null; // Se obtiene desde la ruta (by-code)
  isEditMode = false;
  isLoading = false;
  isLoadingCatalog = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  // Formulario básico
  formData = {
    Code: '',
    Name: '',
    Description: '',
    IsDefault: false,
    IsPaid: false,
    IsActive: true,
    Price: null as number | null
  };

  // Features y límites
  selectedFeatures: Map<string, boolean> = new Map();
  selectedLimits: Map<string, number | null> = new Map();

  // Catálogos
  featuresCatalog: Feature[] = [];
  limitsCatalog: Limit[] = [];
  featuresByCategory: { [key: string]: Feature[] } = {};
  limitsByCategory: { [key: string]: Limit[] } = {};

  // Tabs
  activeTab: 'basic' | 'features' | 'limits' = 'basic';

  constructor(
    private plansService: PlansService,
    private featuresService: FeaturesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idOrCode = params['id'];

      // "nuevo" => modo creación
      if (idOrCode && idOrCode !== 'nuevo') {
        this.isEditMode = true;
        // Usamos el código del plan en la URL y el nuevo endpoint by-code
        this.planCode = idOrCode;
        this.loadPlan();
      }
    });

    this.loadCatalogs();
  }

  loadPlan(): void {
    if (!this.planCode) return;

    this.isLoading = true;
    this.errorMessage = '';

    // Usamos el nuevo endpoint: GET /api/admin/plans/by-code/{code}
    this.plansService.getPlanByCode(this.planCode).subscribe({
      next: (response: any) => {
        const raw = response.data || {};

        // Normalizar el detalle del plan para soportar tanto PascalCase (docs)
        // como camelCase (backend real)
        const plan: PlanDetail = {
          PlanId: raw.PlanId ?? raw.planId ?? 0,
          Code: raw.Code ?? raw.code,
          Name: raw.Name ?? raw.name,
          Description: raw.Description ?? raw.description ?? '',
          IsDefault: raw.IsDefault ?? raw.isDefault ?? false,
          IsPaid: raw.IsPaid ?? raw.isPaid ?? false,
          IsActive: raw.IsActive ?? raw.isActive ?? false,
          Price: raw.Price ?? raw.price ?? null,
          CreatedAt: raw.CreatedAt ?? raw.createdAt ?? '',
          Features: (raw.Features ?? raw.features ?? []).map((f: any) => ({
            FeatureKey: f.FeatureKey ?? f.featureKey,
            IsEnabled: f.IsEnabled ?? f.isEnabled
          })),
          Limits: (raw.Limits ?? raw.limits ?? []).map((l: any) => ({
            LimitKey: l.LimitKey ?? l.limitKey,
            Value: l.Value ?? l.value ?? null
          })),
          FeaturesCount: raw.FeaturesCount ?? raw.featuresCount ?? 0,
          LimitsCount: raw.LimitsCount ?? raw.limitsCount ?? 0
        };

        // Guardar el PlanId real devuelto por el backend para las operaciones de actualización
        this.planId = plan.PlanId;

        // Información básica
        this.formData = {
          Code: plan.Code,
          Name: plan.Name,
          Description: plan.Description || '',
          IsDefault: plan.IsDefault,
          IsPaid: plan.IsPaid,
          IsActive: plan.IsActive,
          Price: plan.Price
        };

        // Cargar features seleccionadas
        this.selectedFeatures.clear();
        (plan.Features || []).forEach(f => {
          if (f.FeatureKey) {
            this.selectedFeatures.set(f.FeatureKey, f.IsEnabled);
          }
        });

        // Cargar límites seleccionados
        this.selectedLimits.clear();
        (plan.Limits || []).forEach(l => {
          if (l.LimitKey) {
            this.selectedLimits.set(l.LimitKey, l.Value);
          }
        });

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar el plan';
        this.isLoading = false;
      }
    });
  }

  loadCatalogs(): void {
    this.isLoadingCatalog = true;

    // Cargar catálogo de features
    this.featuresService.getFeaturesCatalog().subscribe({
      next: (response: FeaturesCatalogResponse | any) => {
        const data: any = response.data || {};

        // La documentación decía PascalCase (All/Modules/Networks),
        // pero el backend real está devolviendo camelCase (all/modules/networks).
        const rawAll: any[] = data.All || data.all || [];
        const rawModules: any[] = data.Modules || data.modules || [];
        const rawNetworks: any[] = data.Networks || data.networks || [];

        // Si "all" viene vacío, lo construimos concatenando modules + networks
        const combined: any[] =
          rawAll && rawAll.length > 0 ? rawAll : [...rawModules, ...rawNetworks];

        // Normalizar cada feature al modelo Feature (PascalCase)
        this.featuresCatalog = combined.map((f: any) => ({
          Id: f.Id ?? f.id,
          Key: f.Key ?? f.key,
          Name: f.Name ?? f.name,
          Description: f.Description ?? f.description,
          Category: f.Category ?? f.category,
          DisplayOrder: f.DisplayOrder ?? f.displayOrder
        }));

        this.organizeFeaturesByCategory();
        this.isLoadingCatalog = false;
      },
      error: (error) => {
        console.error('Error al cargar catálogo de features:', error);
        this.isLoadingCatalog = false;
      }
    });

    // Cargar catálogo de límites
    this.featuresService.getLimitsCatalog().subscribe({
      next: (response: LimitsCatalogResponse | any) => {
        const data: any = response.data || {};

        // La documentación decía PascalCase (Limits/GroupedByCategory...)
        // pero el backend real devuelve camelCase (limits/groupedByCategory...)
        const rawLimits: any[] = data.Limits || data.limits || [];

        // Normalizar cada límite al modelo Limit (PascalCase)
        this.limitsCatalog = rawLimits.map((l: any) => ({
          Key: l.Key ?? l.key,
          Name: l.Name ?? l.name,
          Description: l.Description ?? l.description,
          Category: l.Category ?? l.category,
          Unit: l.Unit ?? l.unit
        }));

        this.organizeLimitsByCategory();
      },
      error: (error) => {
        console.error('Error al cargar catálogo de límites:', error);
      }
    });
  }

  organizeFeaturesByCategory(): void {
    this.featuresByCategory = {};
    this.featuresCatalog.forEach(feature => {
      if (!this.featuresByCategory[feature.Category]) {
        this.featuresByCategory[feature.Category] = [];
      }
      this.featuresByCategory[feature.Category].push(feature);
    });
  }

  organizeLimitsByCategory(): void {
    this.limitsByCategory = {};
    this.limitsCatalog.forEach(limit => {
      if (!this.limitsByCategory[limit.Category]) {
        this.limitsByCategory[limit.Category] = [];
      }
      this.limitsByCategory[limit.Category].push(limit);
      
      // Inicializar límites no configurados con null (ilimitado)
      if (!this.selectedLimits.has(limit.Key)) {
        this.selectedLimits.set(limit.Key, null);
      }
    });
  }

  toggleFeature(featureKey: string): void {
    const current = this.selectedFeatures.get(featureKey) || false;
    this.selectedFeatures.set(featureKey, !current);
  }

  updateLimit(limitKey: string, value: string): void {
    if (value === '' || value === null) {
      this.selectedLimits.set(limitKey, null);
    } else {
      const numValue = parseFloat(value);
      this.selectedLimits.set(limitKey, isNaN(numValue) ? null : numValue);
    }
  }

  getLimitValue(limitKey: string): string {
    const value = this.selectedLimits.get(limitKey);
    return value === null || value === undefined ? '' : value.toString();
  }

  isFeatureEnabled(featureKey: string): boolean {
    return this.selectedFeatures.get(featureKey) || false;
  }

  getCategoryKeys(obj: { [key: string]: any }): string[] {
    return Object.keys(obj);
  }

  savePlan(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isEditMode && this.planId) {
      this.updatePlan();
    } else {
      this.createPlan();
    }
  }

  validateForm(): boolean {
    if (!this.formData.Code.trim()) {
      this.errorMessage = 'El código del plan es requerido';
      return false;
    }
    if (!this.formData.Name.trim()) {
      this.errorMessage = 'El nombre del plan es requerido';
      return false;
    }
    if (this.formData.IsPaid && (this.formData.Price === null || this.formData.Price < 0)) {
      this.errorMessage = 'El precio es requerido para planes de pago';
      return false;
    }
    return true;
  }

  createPlan(): void {
    const features: PlanFeature[] = Array.from(this.selectedFeatures.entries())
      .filter(([_, enabled]) => enabled)
      .map(([key, enabled]) => ({
        FeatureKey: key,
        IsEnabled: enabled
      }));

    const limits: PlanLimit[] = Array.from(this.selectedLimits.entries())
      .map(([key, value]) => ({
        LimitKey: key,
        Value: value === undefined ? null : value
      }));

    const request: CreatePlanRequest = {
      ...this.formData,
      Features: features,
      Limits: limits
    };

    this.plansService.createPlan(request).subscribe({
      next: (response) => {
        this.successMessage = response.data.message || 'Plan creado correctamente';
        setTimeout(() => {
          this.router.navigate(['/dashboard/planes']);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al crear el plan';
        this.isSaving = false;
      }
    });
  }

  updatePlan(): void {
    if (!this.planId) return;

    // Actualizar información básica
    const basicUpdate: UpdatePlanRequest = {
      Name: this.formData.Name,
      Description: this.formData.Description,
      IsDefault: this.formData.IsDefault,
      IsPaid: this.formData.IsPaid,
      IsActive: this.formData.IsActive,
      Price: this.formData.Price
    };

    this.plansService.updatePlan(this.planId, basicUpdate).subscribe({
      next: () => {
        // Actualizar features
        const featuresUpdate: UpdatePlanFeaturesRequest = {
          Features: Array.from(this.selectedFeatures.entries())
            .filter(([_, enabled]) => enabled)
            .map(([key, enabled]) => ({
              FeatureKey: key,
              IsEnabled: enabled
            }))
        };

        this.plansService.updatePlanFeatures(this.planId!, featuresUpdate).subscribe({
          next: () => {
            // Actualizar límites
            const limitsUpdate: UpdatePlanLimitsRequest = {
              Limits: Array.from(this.selectedLimits.entries())
                .map(([key, value]) => ({
                  LimitKey: key,
                  Value: value === undefined ? null : value
                }))
            };

            this.plansService.updatePlanLimits(this.planId!, limitsUpdate).subscribe({
              next: (response) => {
                this.successMessage = response.data.message || 'Plan actualizado correctamente';
                this.isSaving = false;
                setTimeout(() => {
                  this.router.navigate(['/dashboard/planes']);
                }, 1500);
              },
              error: (error) => {
                this.errorMessage = error.message || 'Error al actualizar los límites';
                this.isSaving = false;
              }
            });
          },
          error: (error) => {
            this.errorMessage = error.message || 'Error al actualizar las features';
            this.isSaving = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al actualizar el plan';
        this.isSaving = false;
      }
    });
  }

  setActiveTab(tab: 'basic' | 'features' | 'limits'): void {
    this.activeTab = tab;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/planes']);
  }
}
