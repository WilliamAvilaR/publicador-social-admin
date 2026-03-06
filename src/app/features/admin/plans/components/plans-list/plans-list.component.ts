import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlansService } from '../../services/plans.service';
import { Plan, PlansListResponse } from '../../models/plan.model';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plans-list.component.html',
  styleUrl: './plans-list.component.scss'
})
export class PlansListComponent implements OnInit {
  plans: Plan[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private plansService: PlansService) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.plansService.getPlans().subscribe({
      next: (response: any) => {
        const data: any = response.data || {};

        // Soportar tanto data.Plans (documentación) como data.plans (API real)
        const rawPlans: any[] = data.Plans || data.plans || [];

        // Normalizar al modelo Plan (PascalCase) que usa el resto de la app
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

        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Error al cargar los planes';
        this.isLoading = false;
      }
    });
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

  get totalPlans(): number {
    return this.plans.length;
  }

  get activePlans(): number {
    return this.plans.filter(p => p.IsActive).length;
  }

  get paidPlans(): number {
    return this.plans.filter(p => p.IsPaid).length;
  }

  get defaultPlan(): Plan | undefined {
    return this.plans.find(p => p.IsDefault);
  }
}
