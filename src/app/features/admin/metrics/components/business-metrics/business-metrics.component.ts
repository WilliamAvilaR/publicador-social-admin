import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';
import { MetricsService } from '../../services/metrics.service';
import { AdminOverviewTrends } from '../../models/metrics.model';

@Component({
  selector: 'app-business-metrics',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './business-metrics.component.html',
  styleUrl: './business-metrics.component.scss'
})
export class BusinessMetricsComponent implements OnInit {
  Math = Math;
  isLoadingOverview = false;
  overviewError = '';

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
  trends: Pick<AdminOverviewTrends, 'totalActiveUsers' | 'totalPages' | 'totalScheduledPosts' | 'averageUsage' | 'churn' | 'arpu'> = {
    totalActiveUsers: { change: 5.2, changePercent: 5.2, isPositive: true },
    totalPages: { change: 8.1, changePercent: 8.1, isPositive: true },
    totalScheduledPosts: { change: 12.3, changePercent: 12.3, isPositive: true },
    averageUsage: { change: -2.1, changePercent: -2.1, isPositive: false },
    churn: { change: -0.5, changePercent: -0.5, isPositive: true },
    arpu: { change: 3.4, changePercent: 3.4, isPositive: true }
  };

  // Distribución por plan
  planDistribution = [
    { plan: 'Free', count: 850, percentage: 68 },
    { plan: 'Pro', count: 350, percentage: 28 },
    { plan: 'Enterprise', count: 50, percentage: 4 }
  ];

  /** ECharts: barras horizontales (usuarios por plan) */
  planDistributionChartOptions: EChartsCoreOption = {};
  hasPlanDistributionChart = false;
  planDistributionChartHeight = 280;

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

  constructor(private metricsService: MetricsService) {}

  ngOnInit(): void {
    this.loadOverview();
    this.loadPlanDistribution();
    this.loadMonthlyUsage();
    this.loadTopClients();
    this.rebuildPlanDistributionChart();
  }

  private loadOverview(): void {
    this.isLoadingOverview = true;
    this.overviewError = '';

    this.metricsService.getGlobalOverview().subscribe({
      next: (response) => {
        this.mainMetrics = response.data.metrics;
        this.trends = {
          totalActiveUsers: this.mapTrendToUi(response.data.trends.totalActiveUsers),
          totalPages: this.mapTrendToUi(response.data.trends.totalPages),
          totalScheduledPosts: this.mapTrendToUi(response.data.trends.totalScheduledPosts),
          averageUsage: this.mapTrendToUi(response.data.trends.averageUsage),
          churn: this.mapTrendToUi(response.data.trends.churn),
          arpu: this.mapTrendToUi(response.data.trends.arpu)
        };
        this.isLoadingOverview = false;
      },
      error: (error: Error) => {
        this.overviewError = error.message || 'No se pudo cargar el overview de métricas.';
        this.isLoadingOverview = false;
      }
    });
  }

  private mapTrendToUi(trend: { change: number; changePercent: number | null; isPositive: boolean }) {
    return {
      change: trend.changePercent ?? trend.change,
      changePercent: trend.changePercent,
      isPositive: trend.isPositive
    };
  }

  private loadPlanDistribution(): void {
    this.metricsService.getGlobalPlanDistribution().subscribe({
      next: (response) => {
        this.planDistribution = response.data.plans.map((plan) => ({
          plan: this.normalizePlanLabel(plan.plan),
          count: plan.count,
          percentage: plan.percentage
        }));
        this.rebuildPlanDistributionChart();
      },
      error: () => {
        this.rebuildPlanDistributionChart();
      }
    });
  }

  private rebuildPlanDistributionChart(): void {
    const rows = this.planDistribution;
    if (!rows.length) {
      this.hasPlanDistributionChart = false;
      this.planDistributionChartOptions = {};
      return;
    }

    const categories = rows.map((r) => r.plan);
    /** Misma altura base que Métricas globales en inicio (220px), escala si hay muchos planes */
    this.planDistributionChartHeight = Math.min(520, Math.max(220, 56 + rows.length * 48));

    this.hasPlanDistributionChart = true;
    this.planDistributionChartOptions = {
      textStyle: { fontFamily: 'inherit' },
      legend: {
        data: ['Usuarios'],
        bottom: 0,
        itemGap: 16,
        textStyle: { fontSize: 11, color: '#64748b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const data = p as { name: string; value: number; dataIndex: number };
          const idx = data.dataIndex;
          const row = rows[idx];
          if (!row) return '';
          return `${row.plan}<br/>${row.count.toLocaleString()} usuarios · ${row.percentage}%`;
        }
      },
      grid: {
        left: '2%',
        right: '3%',
        bottom: 40,
        top: 12,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 11, color: '#64748b' },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.25)' } }
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true,
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          name: 'Usuarios',
          type: 'bar',
          data: rows.map((r) => r.count),
          barMaxWidth: 36,
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#f472b6' },
                { offset: 1, color: '#a78bfa' }
              ]
            }
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: { dataIndex: number }) => {
              const row = rows[p.dataIndex];
              return row ? `${row.percentage}%` : '';
            },
            fontSize: 11,
            color: '#7c3aed',
            fontWeight: 600
          }
        }
      ]
    };
  }

  private loadMonthlyUsage(): void {
    this.metricsService.getGlobalMonthlyUsage({ months: 6 }).subscribe({
      next: (response) => {
        this.monthlyUsage = response.data.items.map((item) => ({
          month: this.formatMonthLabel(item.month),
          users: item.users,
          posts: item.posts
        }));
      }
    });
  }

  private loadTopClients(): void {
    this.metricsService.getGlobalTopClients({ limit: 10 }).subscribe({
      next: (response) => {
        this.topClients = response.data.items.map((client) => ({
          name: client.name,
          plan: this.normalizePlanLabel(client.plan),
          posts: client.posts,
          pages: client.pages
        }));
      }
    });
  }

  private normalizePlanLabel(planCode: string): string {
    const normalized = (planCode || 'unknown').toLowerCase();
    if (!normalized) {
      return 'Unknown';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private formatMonthLabel(monthValue: string): string {
    if (!monthValue || !monthValue.includes('-')) {
      return monthValue;
    }
    const [yearPart, monthPart] = monthValue.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return monthValue;
    }

    const date = new Date(Date.UTC(year, month - 1, 1));
    const label = date.toLocaleString('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    return label.replace('.', '').replace(/^./, (char) => char.toUpperCase());
  }
}
