import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/components/dashboard-overview/dashboard-overview.component').then(m => m.DashboardOverviewComponent)
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/admin/clients/components/clients-list/clients-list.component').then(m => m.ClientsListComponent)
      },
      {
        path: 'clientes/:id',
        loadComponent: () => import('./features/admin/clients/components/client-detail/client-detail.component').then(m => m.ClientDetailComponent)
      },
      {
        path: 'suscripciones',
        loadComponent: () => import('./features/admin/subscriptions/components/subscriptions-list/subscriptions-list.component').then(m => m.SubscriptionsListComponent)
      },
      {
        path: 'planes',
        loadComponent: () => import('./features/admin/plans/components/plans-list/plans-list.component').then(m => m.PlansListComponent)
      },
      {
        path: 'planes/nuevo',
        loadComponent: () => import('./features/admin/plans/components/plan-form/plan-form.component').then(m => m.PlanFormComponent)
      },
      {
        path: 'planes/:id',
        loadComponent: () => import('./features/admin/plans/components/plan-form/plan-form.component').then(m => m.PlanFormComponent)
      },
      {
        path: 'soporte',
        loadComponent: () => import('./features/admin/support/components/support-dashboard/support-dashboard.component').then(m => m.SupportDashboardComponent)
      },
      {
        path: 'metricas',
        loadComponent: () => import('./features/admin/metrics/components/business-metrics/business-metrics.component').then(m => m.BusinessMetricsComponent)
      }
    ]
  }
];
