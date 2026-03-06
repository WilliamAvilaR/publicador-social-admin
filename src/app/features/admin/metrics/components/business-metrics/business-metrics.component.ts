import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-business-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-metrics.component.html',
  styleUrl: './business-metrics.component.scss'
})
export class BusinessMetricsComponent {
  Math = Math;
  // Métricas principales
  mainMetrics = {
    totalActiveUsers: 1250,
    totalPages: 3420,
    totalScheduledPosts: 15600,
    averageUsage: 78.5,
    churn: 3.2,
    arpu: 45.80
  };

  // Tendencias (comparación mes anterior)
  trends = {
    totalActiveUsers: { value: 1250, change: 5.2, isPositive: true },
    totalPages: { value: 3420, change: 8.1, isPositive: true },
    totalScheduledPosts: { value: 15600, change: 12.3, isPositive: true },
    averageUsage: { value: 78.5, change: -2.1, isPositive: false },
    churn: { value: 3.2, change: -0.5, isPositive: true },
    arpu: { value: 45.80, change: 3.4, isPositive: true }
  };

  // Distribución por plan
  planDistribution = [
    { plan: 'Free', count: 850, percentage: 68 },
    { plan: 'Pro', count: 350, percentage: 28 },
    { plan: 'Enterprise', count: 50, percentage: 4 }
  ];

  // Uso por mes (últimos 6 meses)
  monthlyUsage = [
    { month: 'Jul 2023', users: 980, posts: 12000 },
    { month: 'Ago 2023', users: 1050, posts: 13200 },
    { month: 'Sep 2023', users: 1120, posts: 14000 },
    { month: 'Oct 2023', users: 1180, posts: 14500 },
    { month: 'Nov 2023', users: 1220, posts: 15000 },
    { month: 'Dic 2023', users: 1250, posts: 15600 }
  ];

  // Top clientes por uso
  topClients = [
    { name: 'Corporación DEF', plan: 'Enterprise', posts: 1250, pages: 25 },
    { name: 'Empresa ABC', plan: 'Pro', posts: 450, pages: 5 },
    { name: 'Startup XYZ', plan: 'Free', posts: 120, pages: 1 }
  ];
}
