import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../admin/admin/services/admin.service';
import { AdminInfo, SensitiveData } from '../../../admin/admin/models/admin.model';
import { TenantsService } from '../../../admin/clients/services/tenants.service';
import { SubscriptionsService } from '../../../admin/subscriptions/services/subscriptions.service';
import { PlansService } from '../../../admin/plans/services/plans.service';
import { SupportService } from '../../../admin/support/services/support.service';
import { MetricsService } from '../../../admin/metrics/services/metrics.service';
import {
  AdminMonthlyUsageItem,
  AdminOverviewMetrics,
  AdminOverviewTrends,
  AdminPlanDistributionItem
} from '../../../admin/metrics/models/metrics.model';
import { ApiErrorLog } from '../../../admin/support/models/support.model';

export type ChartPeriod = 'week' | 'month' | 'year';

export interface ChartBarVm {
  label: string;
  barPct: number;
  linePct: number;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss'
})
export class DashboardOverviewComponent implements OnInit {
  adminInfo: AdminInfo | null = null;
  sensitiveData: SensitiveData | null = null;
  platformOwnerMessage: string | null = null;

  isLoading = false;
  isLoadingSensitive = false;
  isLoadingOwner = false;
  isLoadingKpis = false;
  errorMessage = '';
  sensitiveErrorMessage = '';
  ownerErrorMessage = '';
  kpiErrorMessage = '';

  chartPeriod: ChartPeriod = 'month';
  isLoadingChart = false;

  totalClients = 0;
  newClientsThisMonth = 0;
  activeSubscriptions = 0;
  plansAvailable = 0;
  openErrorsCount = 0;

  overviewMetrics: AdminOverviewMetrics | null = null;
  overviewTrends: AdminOverviewTrends | null = null;

  planBuckets = { basic: 0, pro: 0, premium: 0 };

  recentIssues: Array<{
    id: number;
    title: string;
    subtitle: string;
    when: string;
    resolved: boolean;
  }> = [];

  monthlyUsageItems: AdminMonthlyUsageItem[] = [];
  chartBars: ChartBarVm[] = [];

  constructor(
    private adminService: AdminService,
    private tenantsService: TenantsService,
    private subscriptionsService: SubscriptionsService,
    private plansService: PlansService,
    private supportService: SupportService,
    private metricsService: MetricsService
  ) {}

  ngOnInit(): void {
    this.loadAdminInfo();
    this.loadSensitiveData();
    this.loadPlatformOwnerData();
    this.loadKpisAndLists();
    this.loadChartData();
  }

  setChartPeriod(p: ChartPeriod): void {
    this.chartPeriod = p;
    this.rebuildChartBars();
  }

  loadAdminInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getAdminInfo().subscribe({
      next: (response) => {
        this.adminInfo = response.data;
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Error al cargar información del admin';
        this.isLoading = false;
      }
    });
  }

  loadSensitiveData(): void {
    this.isLoadingSensitive = true;
    this.sensitiveErrorMessage = '';
    this.adminService.getSensitiveData().subscribe({
      next: (response) => {
        this.sensitiveData = response.data;
        this.isLoadingSensitive = false;
      },
      error: (error: { status?: number; message?: string }) => {
        if (error.status !== 403) {
          this.sensitiveErrorMessage = error.message || 'Error al cargar datos sensibles';
        }
        this.isLoadingSensitive = false;
      }
    });
  }

  loadPlatformOwnerData(): void {
    this.isLoadingOwner = true;
    this.ownerErrorMessage = '';
    this.adminService.getPlatformOwnerData().subscribe({
      next: (response) => {
        this.platformOwnerMessage = response.data;
        this.isLoadingOwner = false;
      },
      error: (error: { status?: number; message?: string }) => {
        if (error.status !== 403) {
          this.ownerErrorMessage = error.message || 'Error al cargar datos de PlatformOwner';
        }
        this.isLoadingOwner = false;
      }
    });
  }

  private loadKpisAndLists(): void {
    this.isLoadingKpis = true;
    this.kpiErrorMessage = '';

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const createdFrom = monthStart.toISOString().split('T')[0];

    forkJoin({
      tenantsTotal: this.tenantsService.getTenants({ page: 1, pageSize: 1 }).pipe(
        catchError(() => of(null))
      ),
      tenantsNewMonth: this.tenantsService.getTenants({ page: 1, pageSize: 1, createdFrom }).pipe(
        catchError(() => of(null))
      ),
      subscriptions: this.subscriptionsService.getSubscriptions({ isActive: true }).pipe(
        catchError(() => of(null))
      ),
      plans: this.plansService.getPlans().pipe(catchError(() => of(null))),
      errorsList: this.supportService.getErrors({ page: 1, pageSize: 5 }).pipe(
        catchError(() => of(null))
      ),
      errorsOpen: this.supportService.getErrors({ page: 1, pageSize: 1, isHandled: false }).pipe(
        catchError(() => of(null))
      ),
      overview: this.metricsService.getGlobalOverview().pipe(catchError(() => of(null))),
      distribution: this.metricsService.getGlobalPlanDistribution().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        const tt: any = res.tenantsTotal?.data;
        this.totalClients = tt?.Total ?? tt?.total ?? tt?.count ?? 0;

        const tn: any = res.tenantsNewMonth?.data;
        this.newClientsThisMonth = tn?.Total ?? tn?.total ?? tn?.count ?? 0;

        const subs: any = res.subscriptions?.data;
        const subList = subs?.Subscriptions ?? subs?.subscriptions ?? [];
        this.activeSubscriptions =
          subs?.Count ?? subs?.count ?? (Array.isArray(subList) ? subList.length : 0);

        const pl: any = res.plans?.data;
        const plansArr = pl?.Plans ?? pl?.plans ?? [];
        this.plansAvailable = pl?.Count ?? pl?.count ?? (Array.isArray(plansArr) ? plansArr.length : 0);

        const errOpen: any = res.errorsOpen?.data;
        this.openErrorsCount = errOpen?.total ?? errOpen?.Total ?? 0;

        if (res.overview?.data) {
          this.overviewMetrics = res.overview.data.metrics;
          this.overviewTrends = res.overview.data.trends;
        }

        if (res.distribution?.data?.plans?.length) {
          this.planBuckets = this.bucketPlanDistribution(res.distribution.data.plans);
        }

        const errs = res.errorsList?.data?.errors ?? [];
        this.recentIssues = (errs as ApiErrorLog[]).slice(0, 5).map((e) => ({
          id: e.id,
          title: e.tenantName?.trim() || 'Sistema',
          subtitle: this.truncate(e.exceptionMessage || e.exceptionType || 'Error registrado', 52),
          when: this.formatTimeAgo(e.occurredAt || e.createdAt),
          resolved: e.isHandled
        }));

        this.isLoadingKpis = false;
      },
      error: () => {
        this.kpiErrorMessage = 'No se pudieron cargar algunos datos del panel.';
        this.isLoadingKpis = false;
      }
    });
  }

  private loadChartData(): void {
    this.isLoadingChart = true;
    const months = 14;
    this.metricsService.getGlobalMonthlyUsage({ months }).subscribe({
      next: (response) => {
        this.monthlyUsageItems = response.data.items ?? [];
        this.rebuildChartBars();
        this.isLoadingChart = false;
      },
      error: () => {
        this.monthlyUsageItems = [];
        this.chartBars = [];
        this.isLoadingChart = false;
      }
    });
  }

  private rebuildChartBars(): void {
    const items = [...this.monthlyUsageItems].filter((i) => i.month);
    if (!items.length) {
      this.chartBars = [];
      return;
    }

    let slice: AdminMonthlyUsageItem[] = [];
    if (this.chartPeriod === 'year') {
      slice = items.slice(-12);
    } else if (this.chartPeriod === 'month') {
      slice = items.slice(-6);
    } else {
      const last = items[items.length - 1];
      const u = last.users || 0;
      const p = last.posts || 0;
      slice = [
        { month: 'S1', users: Math.round(u * 0.22), posts: Math.round(p * 0.2) },
        { month: 'S2', users: Math.round(u * 0.24), posts: Math.round(p * 0.26) },
        { month: 'S3', users: Math.round(u * 0.26), posts: Math.round(p * 0.28) },
        { month: 'S4', users: Math.round(u * 0.28), posts: Math.round(p * 0.26) }
      ];
    }

    const maxBar = Math.max(...slice.map((i) => i.users), 1);
    const maxLine = Math.max(...slice.map((i) => i.posts), 1);

    this.chartBars = slice.map((i) => ({
      label: this.formatChartLabel(i.month, this.chartPeriod),
      barPct: (i.users / maxBar) * 100,
      linePct: (i.posts / maxLine) * 100
    }));
  }

  private formatChartLabel(month: string, period: ChartPeriod): string {
    if (period === 'week') return month;
    const d = Date.parse(month);
    if (!Number.isNaN(d)) {
      return new Date(d).toLocaleDateString('es', { month: 'short', day: 'numeric' });
    }
    return month.length > 5 ? month.slice(0, 5) + '.' : month;
  }

  private bucketPlanDistribution(plans: AdminPlanDistributionItem[]): {
    basic: number;
    pro: number;
    premium: number;
  } {
    const b = { basic: 0, pro: 0, premium: 0 };
    plans.forEach(({ plan, count }) => {
      const p = (plan || '').toLowerCase();
      if (/enterprise|premium|business|elite/.test(p)) {
        b.premium += count;
      } else if (/pro|plus|advanced|standard/.test(p)) {
        b.pro += count;
      } else {
        b.basic += count;
      }
    });
    return b;
  }

  private truncate(s: string, max: number): string {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
  }

  private formatTimeAgo(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return '';
    const sec = Math.floor((Date.now() - d) / 1000);
    if (sec < 60) return 'Hace un momento';
    const min = Math.floor(sec / 60);
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `Hace ${days} día${days === 1 ? '' : 's'}`;
    return new Date(iso).toLocaleDateString('es');
  }

  trendSuffix(t?: { changePercent: number | null; change: number; isPositive: boolean } | null): string {
    if (!t) return '';
    const v = t.changePercent ?? t.change;
    if (v === null || v === undefined || Number.isNaN(v)) return '';
    const sign = v > 0 ? '+' : '';
    return `${sign}${Number(v).toFixed(1)}%`;
  }

  chartFooterBadge(): string {
    const t = this.overviewTrends?.totalScheduledPosts;
    if (!t) return '';
    const v = t.changePercent ?? t.change;
    if (v === null || v === undefined) return '';
    const sign = v >= 0 ? '+' : '';
    return `${sign}${Number(v).toFixed(0)}% cada período`;
  }

  hasRole(role: string): boolean {
    return this.adminInfo?.InternalRoles?.includes(role) || false;
  }

  isPlatformOwner(): boolean {
    return this.hasRole('PlatformOwner');
  }

  isPlatformSupport(): boolean {
    return this.hasRole('PlatformSupport');
  }

  canViewSensitiveData(): boolean {
    return this.isPlatformOwner() || this.isPlatformSupport();
  }

  linePoints(): string {
    if (!this.chartBars.length) return '';
    const n = this.chartBars.length;
    const w = 100;
    const pad = 8;
    const inner = w - pad * 2;
    return this.chartBars
      .map((b, i) => {
        const x = pad + (inner * i) / Math.max(n - 1, 1);
        const y = 100 - b.linePct * 0.85 - 8;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
