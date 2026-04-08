export interface AdminMetricTrend {
  change: number;
  changePercent: number | null;
  isPositive: boolean;
}

export interface AdminOverviewMetrics {
  totalActiveUsers: number;
  totalPages: number;
  totalScheduledPosts: number;
  averageUsage: number;
  churn: number;
  arpu: number;
}

export interface AdminOverviewTrends {
  totalActiveUsers: AdminMetricTrend;
  totalPages: AdminMetricTrend;
  totalScheduledPosts: AdminMetricTrend;
  averageUsage: AdminMetricTrend;
  churn: AdminMetricTrend;
  arpu: AdminMetricTrend;
}

export interface AdminOverviewPeriod {
  from: string;
  to: string;
  compareFrom: string;
  compareTo: string;
}

export interface AdminGlobalOverviewData {
  metrics: AdminOverviewMetrics;
  trends: AdminOverviewTrends;
  period: AdminOverviewPeriod;
}

export interface AdminGlobalOverviewResponse {
  data: AdminGlobalOverviewData;
  requiresReauth: boolean;
  meta: unknown | null;
}

export interface GetGlobalOverviewParams {
  from?: string;
  to?: string;
  compareFrom?: string;
  compareTo?: string;
}

export interface AdminSimplePeriod {
  from: string;
  to: string;
}

export interface AdminPlanDistributionItem {
  plan: string;
  count: number;
  percentage: number;
}

export interface AdminGlobalPlanDistributionData {
  plans: AdminPlanDistributionItem[];
  total: number;
  period: AdminSimplePeriod;
}

export interface AdminGlobalPlanDistributionResponse {
  data: AdminGlobalPlanDistributionData;
  requiresReauth: boolean;
  meta: unknown | null;
}

export interface GetGlobalPlanDistributionParams {
  from?: string;
  to?: string;
}

export interface AdminMonthlyUsageItem {
  month: string;
  users: number;
  posts: number;
}

export interface AdminGlobalMonthlyUsageData {
  items: AdminMonthlyUsageItem[];
  count: number;
  period: AdminSimplePeriod;
}

export interface AdminGlobalMonthlyUsageResponse {
  data: AdminGlobalMonthlyUsageData;
  requiresReauth: boolean;
  meta: unknown | null;
}

export interface GetGlobalMonthlyUsageParams {
  from?: string;
  to?: string;
  months?: number;
}

export interface AdminTopClientItem {
  name: string;
  plan: string;
  posts: number;
  pages: number;
}

export interface AdminGlobalTopClientsData {
  items: AdminTopClientItem[];
  count: number;
  period: AdminSimplePeriod;
}

export interface AdminGlobalTopClientsResponse {
  data: AdminGlobalTopClientsData;
  requiresReauth: boolean;
  meta: unknown | null;
}

export interface GetGlobalTopClientsParams {
  from?: string;
  to?: string;
  limit?: number;
}

export interface ApiError {
  title?: string;
  detail?: string;
  status?: number;
  errors?: { [key: string]: string[] };
}
