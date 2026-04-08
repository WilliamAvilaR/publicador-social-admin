import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AdminGlobalMonthlyUsageResponse,
  AdminGlobalOverviewResponse,
  AdminGlobalPlanDistributionResponse,
  AdminGlobalTopClientsResponse,
  AdminOverviewMetrics,
  AdminOverviewPeriod,
  AdminOverviewTrends,
  AdminSimplePeriod,
  ApiError,
  GetGlobalMonthlyUsageParams,
  GetGlobalOverviewParams,
  GetGlobalPlanDistributionParams,
  GetGlobalTopClientsParams
} from '../models/metrics.model';

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private readonly apiUrl = '/api/admin/metrics/global';

  constructor(private http: HttpClient) {}

  getGlobalOverview(params?: GetGlobalOverviewParams): Observable<AdminGlobalOverviewResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.from) {
        httpParams = httpParams.set('from', params.from);
      }
      if (params.to) {
        httpParams = httpParams.set('to', params.to);
      }
      if (params.compareFrom) {
        httpParams = httpParams.set('compareFrom', params.compareFrom);
      }
      if (params.compareTo) {
        httpParams = httpParams.set('compareTo', params.compareTo);
      }
    }

    return this.http.get<unknown>(`${this.apiUrl}/overview`, { params: httpParams }).pipe(
      map((body) => this.normalizeGlobalOverviewResponse(body)),
      catchError(this.handleError)
    );
  }

  getGlobalPlanDistribution(params?: GetGlobalPlanDistributionParams): Observable<AdminGlobalPlanDistributionResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.from) {
        httpParams = httpParams.set('from', params.from);
      }
      if (params.to) {
        httpParams = httpParams.set('to', params.to);
      }
    }

    return this.http.get<unknown>(`${this.apiUrl}/plan-distribution`, { params: httpParams }).pipe(
      map((body) => this.normalizeGlobalPlanDistributionResponse(body)),
      catchError(this.handleError)
    );
  }

  getGlobalMonthlyUsage(params?: GetGlobalMonthlyUsageParams): Observable<AdminGlobalMonthlyUsageResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.from) {
        httpParams = httpParams.set('from', params.from);
      }
      if (params.to) {
        httpParams = httpParams.set('to', params.to);
      }
      if (params.months !== undefined) {
        httpParams = httpParams.set('months', params.months.toString());
      }
    }

    return this.http.get<unknown>(`${this.apiUrl}/monthly-usage`, { params: httpParams }).pipe(
      map((body) => this.normalizeGlobalMonthlyUsageResponse(body)),
      catchError(this.handleError)
    );
  }

  getGlobalTopClients(params?: GetGlobalTopClientsParams): Observable<AdminGlobalTopClientsResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.from) {
        httpParams = httpParams.set('from', params.from);
      }
      if (params.to) {
        httpParams = httpParams.set('to', params.to);
      }
      if (params.limit !== undefined) {
        httpParams = httpParams.set('limit', params.limit.toString());
      }
    }

    return this.http.get<unknown>(`${this.apiUrl}/top-clients`, { params: httpParams }).pipe(
      map((body) => this.normalizeGlobalTopClientsResponse(body)),
      catchError(this.handleError)
    );
  }

  private normalizeGlobalOverviewResponse(body: unknown): AdminGlobalOverviewResponse {
    const b = body as Record<string, unknown>;
    const raw = (b?.['data'] ?? b) as Record<string, unknown>;
    const metricsRaw = (raw['metrics'] ?? raw['Metrics']) as Record<string, unknown>;
    const trendsRaw = (raw['trends'] ?? raw['Trends']) as Record<string, unknown>;
    const periodRaw = (raw['period'] ?? raw['Period']) as Record<string, unknown>;

    return {
      data: {
        metrics: this.normalizeMetrics(metricsRaw),
        trends: this.normalizeTrends(trendsRaw),
        period: this.normalizePeriod(periodRaw)
      },
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeGlobalPlanDistributionResponse(body: unknown): AdminGlobalPlanDistributionResponse {
    const b = body as Record<string, unknown>;
    const raw = (b?.['data'] ?? b) as Record<string, unknown>;
    const plansRaw = (raw['plans'] ?? raw['Plans'] ?? []) as unknown[];
    return {
      data: {
        plans: plansRaw.map((item) => this.normalizePlanDistributionItem(item as Record<string, unknown>)),
        total: Number(raw['total'] ?? raw['Total'] ?? 0),
        period: this.normalizeSimplePeriod((raw['period'] ?? raw['Period']) as Record<string, unknown>)
      },
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeGlobalMonthlyUsageResponse(body: unknown): AdminGlobalMonthlyUsageResponse {
    const b = body as Record<string, unknown>;
    const raw = (b?.['data'] ?? b) as Record<string, unknown>;
    const itemsRaw = (raw['items'] ?? raw['Items'] ?? []) as unknown[];
    return {
      data: {
        items: itemsRaw.map((item) => this.normalizeMonthlyUsageItem(item as Record<string, unknown>)),
        count: Number(raw['count'] ?? raw['Count'] ?? 0),
        period: this.normalizeSimplePeriod((raw['period'] ?? raw['Period']) as Record<string, unknown>)
      },
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeGlobalTopClientsResponse(body: unknown): AdminGlobalTopClientsResponse {
    const b = body as Record<string, unknown>;
    const raw = (b?.['data'] ?? b) as Record<string, unknown>;
    const itemsRaw = (raw['items'] ?? raw['Items'] ?? []) as unknown[];
    return {
      data: {
        items: itemsRaw.map((item) => this.normalizeTopClientItem(item as Record<string, unknown>)),
        count: Number(raw['count'] ?? raw['Count'] ?? 0),
        period: this.normalizeSimplePeriod((raw['period'] ?? raw['Period']) as Record<string, unknown>)
      },
      requiresReauth: Boolean(b?.['requiresReauth']),
      meta: (b?.['meta'] as unknown) ?? null
    };
  }

  private normalizeMetrics(raw: Record<string, unknown>): AdminOverviewMetrics {
    return {
      totalActiveUsers: Number(raw['totalActiveUsers'] ?? raw['TotalActiveUsers'] ?? 0),
      totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
      totalScheduledPosts: Number(raw['totalScheduledPosts'] ?? raw['TotalScheduledPosts'] ?? 0),
      averageUsage: Number(raw['averageUsage'] ?? raw['AverageUsage'] ?? 0),
      churn: Number(raw['churn'] ?? raw['Churn'] ?? 0),
      arpu: Number(raw['arpu'] ?? raw['Arpu'] ?? 0)
    };
  }

  private normalizeTrends(raw: Record<string, unknown>): AdminOverviewTrends {
    return {
      totalActiveUsers: this.normalizeTrend(raw['totalActiveUsers'] ?? raw['TotalActiveUsers']),
      totalPages: this.normalizeTrend(raw['totalPages'] ?? raw['TotalPages']),
      totalScheduledPosts: this.normalizeTrend(raw['totalScheduledPosts'] ?? raw['TotalScheduledPosts']),
      averageUsage: this.normalizeTrend(raw['averageUsage'] ?? raw['AverageUsage']),
      churn: this.normalizeTrend(raw['churn'] ?? raw['Churn']),
      arpu: this.normalizeTrend(raw['arpu'] ?? raw['Arpu'])
    };
  }

  private normalizeTrend(raw: unknown) {
    const trend = (raw ?? {}) as Record<string, unknown>;
    const changePercentRaw = trend['changePercent'] ?? trend['ChangePercent'];
    return {
      change: Number(trend['change'] ?? trend['Change'] ?? 0),
      changePercent: changePercentRaw === null || changePercentRaw === undefined
        ? null
        : Number(changePercentRaw),
      isPositive: Boolean(trend['isPositive'] ?? trend['IsPositive'])
    };
  }

  private normalizePeriod(raw: Record<string, unknown>): AdminOverviewPeriod {
    return {
      from: String(raw['from'] ?? raw['From'] ?? ''),
      to: String(raw['to'] ?? raw['To'] ?? ''),
      compareFrom: String(raw['compareFrom'] ?? raw['CompareFrom'] ?? ''),
      compareTo: String(raw['compareTo'] ?? raw['CompareTo'] ?? '')
    };
  }

  private normalizeSimplePeriod(raw: Record<string, unknown>): AdminSimplePeriod {
    return {
      from: String(raw?.['from'] ?? raw?.['From'] ?? ''),
      to: String(raw?.['to'] ?? raw?.['To'] ?? '')
    };
  }

  private normalizePlanDistributionItem(raw: Record<string, unknown>) {
    return {
      plan: String(raw['plan'] ?? raw['Plan'] ?? 'unknown'),
      count: Number(raw['count'] ?? raw['Count'] ?? 0),
      percentage: Number(raw['percentage'] ?? raw['Percentage'] ?? 0)
    };
  }

  private normalizeMonthlyUsageItem(raw: Record<string, unknown>) {
    return {
      month: String(raw['month'] ?? raw['Month'] ?? ''),
      users: Number(raw['users'] ?? raw['Users'] ?? 0),
      posts: Number(raw['posts'] ?? raw['Posts'] ?? 0)
    };
  }

  private normalizeTopClientItem(raw: Record<string, unknown>) {
    return {
      name: String(raw['name'] ?? raw['Name'] ?? ''),
      plan: String(raw['plan'] ?? raw['Plan'] ?? ''),
      posts: Number(raw['posts'] ?? raw['Posts'] ?? 0),
      pages: Number(raw['pages'] ?? raw['Pages'] ?? 0)
    };
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Ocurrió un error al cargar las métricas globales.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      const apiError = error.error as ApiError;
      switch (error.status) {
        case 401:
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          errorMessage = apiError?.detail || apiError?.title || 'No tienes permisos para ver métricas globales.';
          break;
        case 500:
          errorMessage = apiError?.detail || 'Error del servidor. Por favor, intenta más tarde.';
          break;
        default:
          if (apiError?.detail) {
            errorMessage = apiError.detail;
          } else if (apiError?.title) {
            errorMessage = apiError.title;
          } else if (error.message) {
            errorMessage = error.message;
          }
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}
