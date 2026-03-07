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
  PlanLimit,
  PlanDefinitionsResponse
} from '../../models/plan.model';
import {
  Feature,
  Limit
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

  // Wizard steps
  currentStep: number = 1;
  totalSteps: number = 4; // Paso 1: Info, Paso 2: Features, Paso 3: Limits, Paso 4: Preview
  showPreview: boolean = false;

  constructor(
    private plansService: PlansService,
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

    this.loadPlanDefinitions();
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

  /**
   * Carga las definiciones de features y limits desde el nuevo endpoint
   * que incluye las dependencias automáticas
   */
  loadPlanDefinitions(): void {
    this.isLoadingCatalog = true;

    this.plansService.getPlanDefinitions().subscribe({
      next: (response: PlanDefinitionsResponse | any) => {
        const data: any = response.data || {};

        // Normalizar features del nuevo endpoint (camelCase)
        const rawFeatures: any[] = data.features || data.Features || [];
        
        // Función para normalizar categorías a los valores que espera el HTML
        const normalizeCategory = (cat: string): string => {
          const lower = cat?.toLowerCase() || 'module';
          if (lower === 'modules' || lower === 'module') return 'module';
          if (lower === 'networks' || lower === 'network') return 'network';
          return lower;
        };
        
        this.featuresCatalog = rawFeatures.map((f: any, index: number) => ({
          Id: index + 1, // El nuevo endpoint no incluye Id, generamos uno
          Key: f.key ?? f.Key,
          Name: f.name ?? f.Name,
          Description: '', // El nuevo endpoint no incluye Description
          Category: normalizeCategory(f.category ?? f.Category),
          DisplayOrder: index + 1
        }));

        // Normalizar limits del nuevo endpoint (camelCase) con dependsOnFeatures
        const rawLimits: any[] = data.limits || data.Limits || [];
        this.limitsCatalog = rawLimits.map((l: any) => ({
          Key: l.key ?? l.Key,
          Name: l.name ?? l.Name,
          Description: '', // El nuevo endpoint no incluye Description
          Category: l.category ?? l.Category,
          Unit: '', // El nuevo endpoint no incluye Unit
          DependsOnFeatures: l.dependsOnFeatures ?? l.DependsOnFeatures ?? []
        }));

        this.organizeFeaturesByCategory();
        this.organizeLimitsByCategory();
        this.isLoadingCatalog = false;
      },
      error: (error) => {
        console.error('Error al cargar definiciones de planes:', error);
        this.isLoadingCatalog = false;
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
    // Validar todos los pasos
    if (!this.validateCurrentStep()) {
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

  /**
   * Navegación del wizard
   */
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps - 1) {
        this.currentStep++;
      } else {
        // Último paso: mostrar preview
        this.showPreview = true;
        this.currentStep = this.totalSteps;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showPreview = false;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      // Solo permitir ir a pasos anteriores o al siguiente si el actual está validado
      if (step < this.currentStep || (step === this.currentStep + 1 && this.validateCurrentStep())) {
        this.currentStep = step;
        this.showPreview = step === this.totalSteps;
      }
    }
  }

  /**
   * Valida el paso actual antes de avanzar
   */
  validateCurrentStep(): boolean {
    if (this.currentStep === 1) {
      // Validar información básica
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
      this.errorMessage = '';
      return true;
    }
    // Los pasos 2 y 3 no requieren validación obligatoria (pueden estar vacíos)
    this.errorMessage = '';
    return true;
  }

  /**
   * Obtiene los límites relacionados con una feature específica
   * Usa DependsOnFeatures del nuevo endpoint
   */
  getRelatedLimits(featureKey: string): Limit[] {
    return this.limitsCatalog.filter(limit => 
      limit.DependsOnFeatures?.includes(featureKey) || false
    );
  }

  /**
   * Verifica si un límite debe mostrarse basado en las features activas
   * Usa DependsOnFeatures del nuevo endpoint
   */
  shouldShowLimit(limit: Limit): boolean {
    // Si el límite no tiene dependencias, siempre mostrarlo (límites globales)
    if (!limit.DependsOnFeatures || limit.DependsOnFeatures.length === 0) {
      return true;
    }
    
    // Si tiene dependencias, verificar si alguna feature relacionada está activa
    return limit.DependsOnFeatures.some(featureKey => 
      this.selectedFeatures.get(featureKey) === true
    );
  }

  /**
   * Obtiene el hint para una feature específica
   */
  getFeatureHint(featureKey: string): string {
    const relatedLimits = this.getRelatedLimits(featureKey);
    if (relatedLimits.length === 0) {
      return '';
    }
    
    const limitNames = relatedLimits.map(l => `• ${l.Name}`).join('\n');
    return `Al habilitarlo podrás configurar:\n${limitNames}`;
  }

  /**
   * Obtiene las líneas del hint para renderizar en el HTML
   */
  getFeatureHintLines(featureKey: string): string[] {
    const hint = this.getFeatureHint(featureKey);
    if (!hint) {
      return [];
    }
    return hint.split('\n');
  }

  /**
   * Obtiene el número de features habilitadas
   */
  get enabledFeaturesCount(): number {
    return Array.from(this.selectedFeatures.values()).filter(v => v).length;
  }

  /**
   * Verifica si hay features habilitadas
   */
  get hasEnabledFeatures(): boolean {
    return this.enabledFeaturesCount > 0;
  }

  /**
   * Obtiene el número de límites configurados (no nulos)
   */
  get configuredLimitsCount(): number {
    return Array.from(this.selectedLimits.values()).filter(v => v !== null && v !== undefined).length;
  }

  /**
   * Verifica si hay límites configurados
   */
  get hasConfiguredLimits(): boolean {
    return this.configuredLimitsCount > 0;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/planes']);
  }
}
