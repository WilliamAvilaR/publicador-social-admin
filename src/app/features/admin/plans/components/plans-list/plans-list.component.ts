import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs';
import { PlansService } from '../../services/plans.service';
import { Plan, PublicPlan } from '../../models/plan.model';

export type PlansListSubTab = 'admin' | 'public';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plans-list.component.html',
  styleUrl: './plans-list.component.scss'
})
export class PlansListComponent implements OnInit {
  /** Pestaña activa (query `subtab`): admin | public */
  activeSubTab: PlansListSubTab = 'admin';

  /** Listado administración (GET /api/admin/plans) */
  plans: Plan[] = [];
  /** Catálogo público (GET /api/public/plans) */
  publicPlans: PublicPlan[] = [];

  isLoadingAdmin = false;
  isLoadingPublic = false;
  errorMessage = '';
  publicErrorMessage = '';

  constructor(
    private plansService: PlansService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((q) => (q.get('subtab') === 'public' ? 'public' : 'admin') as PlansListSubTab),
        distinctUntilChanged()
      )
      .subscribe((tab) => {
        this.activeSubTab = tab;
        if (tab === 'admin') {
          this.loadAdminPlans();
        } else {
          this.loadPublicPlans();
        }
      });
  }

  loadAdminPlans(): void {
    this.isLoadingAdmin = true;
    this.errorMessage = '';

    this.plansService.getPlans().subscribe({
      next: (response: any) => {
        const data: any = response.data || {};
        const rawPlans: any[] = data.Plans || data.plans || [];

        this.plans = rawPlans.map((p: any) => ({
          PlanId: p.PlanId ?? p.planId ?? 0,
          Code: p.Code ?? p.code,
          Name: p.Name ?? p.name,
          Description: p.Description ?? p.description ?? '',
          IsDefault: p.IsDefault ?? p.isDefault ?? false,
          IsPaid: p.IsPaid ?? p.isPaid ?? false,
          IsActive: p.IsActive ?? p.isActive ?? false,
          Price: p.Price ?? p.price ?? null
        }));

        this.isLoadingAdmin = false;
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Error al cargar los planes';
        this.isLoadingAdmin = false;
      }
    });
  }

  loadPublicPlans(): void {
    this.isLoadingPublic = true;
    this.publicErrorMessage = '';

    this.plansService.getPublicPlans().subscribe({
      next: (response: any) => {
        const data: any = response.data || {};
        const raw: any[] = data.plans || data.Plans || [];

        this.publicPlans = raw.map((p: any) => this.normalizePublicPlan(p));
        this.isLoadingPublic = false;
      },
      error: (error: any) => {
        this.publicErrorMessage =
          error.message || 'No se pudo cargar el catálogo público de planes.';
        this.publicPlans = [];
        this.isLoadingPublic = false;
      }
    });
  }

  private normalizePublicPlan(p: any): PublicPlan {
    return {
      code: p.code ?? p.Code ?? '',
      name: p.name ?? p.Name ?? '',
      description: p.description ?? p.Description ?? '',
      isDefault: p.isDefault ?? p.IsDefault ?? false,
      isPaid: p.isPaid ?? p.IsPaid ?? false,
      price: p.price !== undefined ? p.price : p.Price ?? null,
      currency: p.currency ?? p.Currency,
      billingPeriod: p.billingPeriod ?? p.BillingPeriod,
      displayOrder: p.displayOrder ?? p.DisplayOrder,
      limits: p.limits ?? p.Limits,
      features: p.features ?? p.Features
    };
  }

  getPlanStatusClass(plan: Plan): string {
    if (!plan.IsActive) {
      return 'status-inactive';
    }
    if (plan.IsDefault) {
      return 'status-default';
    }
    return 'status-active';
  }

  getPlanStatusText(plan: Plan): string {
    if (!plan.IsActive) {
      return 'Inactivo';
    }
    if (plan.IsDefault) {
      return 'Por Defecto';
    }
    return 'Activo';
  }

  formatPrice(price: number | null): string {
    if (price === null) {
      return 'Gratis';
    }
    return `$${price.toFixed(2)}`;
  }

  /** Texto del importe en card (mismo criterio que Suscripciones: Gratis vs número) */
  getPublicCardAmount(p: PublicPlan): string {
    if (p.price === null || p.price === undefined || p.price === 0) {
      return 'Gratis';
    }
    const n = Number(p.price);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  showPublicPricePeriod(p: PublicPlan): boolean {
    return p.price != null && p.price > 0;
  }

  getPublicPricePeriodLabel(p: PublicPlan): string {
    if (p.billingPeriod === 'year') return '/año';
    return '/mes';
  }

  getPublicLimitForCard(
    p: PublicPlan,
    key: 'pages' | 'users' | 'scheduledPosts' | 'apiCalls'
  ): string {
    if (!p.limits) {
      return 'N/A';
    }
    const value = p.limits[key];
    if (value === undefined) {
      return 'N/A';
    }
    return this.formatPublicLimit(value);
  }

  formatPublicLimit(value: number | null | undefined): string {
    if (value === null || value === undefined || value === -1) {
      return 'Ilimitado';
    }
    if (typeof value === 'number' && value >= 1000) {
      return value.toLocaleString();
    }
    return String(value);
  }

  get totalPlans(): number {
    return this.plans.length;
  }

  get activePlans(): number {
    return this.plans.filter((p) => p.IsActive).length;
  }

  get paidPlans(): number {
    return this.plans.filter((p) => p.IsPaid).length;
  }

  get defaultPlan(): Plan | undefined {
    return this.plans.find((p) => p.IsDefault);
  }

  /** Orden estable para cards y columnas de la comparativa */
  get publicPlansOrdered(): PublicPlan[] {
    return [...this.publicPlans].sort((a, b) => {
      const oa = a.displayOrder ?? 999;
      const ob = b.displayOrder ?? 999;
      if (oa !== ob) {
        return oa - ob;
      }
      return (a.name || '').localeCompare(b.name || '', 'es');
    });
  }

  readonly comparisonLimitRows: {
    key: 'pages' | 'users' | 'scheduledPosts' | 'apiCalls';
    label: string;
  }[] = [
    { key: 'pages', label: 'Páginas' },
    { key: 'users', label: 'Usuarios' },
    { key: 'scheduledPosts', label: 'Posts programados' },
    { key: 'apiCalls', label: 'Límite API' }
  ];

  /** Textos de feature únicos en todo el catálogo (para filas de la tabla) */
  get uniquePublicFeatureLabels(): string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const plan of this.publicPlansOrdered) {
      for (const f of plan.features || []) {
        const t = (f || '').trim();
        if (!t || seen.has(t)) {
          continue;
        }
        seen.add(t);
        ordered.push(t);
      }
    }
    return ordered.sort((a, b) => a.localeCompare(b, 'es'));
  }

  planIncludesFeature(plan: PublicPlan, featureLabel: string): boolean {
    return (plan.features || []).some((f) => (f || '').trim() === featureLabel);
  }

  /**
   * Resumen corto para la card: hasta 3 ítems; prioriza features, si no hay, límites con etiqueta.
   */
  getPublicCardHighlights(p: PublicPlan, max = 3): string[] {
    const out: string[] = [];
    if (p.features?.length) {
      for (const f of p.features) {
        if (out.length >= max) {
          break;
        }
        const t = (f || '').trim();
        if (t) {
          out.push(t);
        }
      }
      return out;
    }
    for (const row of this.comparisonLimitRows) {
      if (out.length >= max) {
        break;
      }
      const v = this.getPublicLimitForCard(p, row.key);
      if (v !== 'N/A') {
        out.push(`${row.label}: ${v}`);
      }
    }
    return out;
  }
}
