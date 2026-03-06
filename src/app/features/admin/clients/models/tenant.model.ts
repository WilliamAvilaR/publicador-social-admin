// Modelos para la API de administración de tenants

export interface ApiResponseMeta {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviusPage: boolean;
  nextPageUrl: string;
  previusPageUrl: string;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: string | number;
}

// Tenant básico (lo que devuelve el listado)
export interface Tenant {
  tenantId: number;
  name: string;
  slug: string;
  description: string;
  planCode: string;
  isActive: boolean;
  status?: string; // Estado del tenant (Active, Suspended, Trial, Inactive)
  suspendedAt?: string | null; // Fecha de suspensión si está suspendido
  createdAt: string;
  activeUsersCount: number;
}

// Estructura de datos del listado (la API devuelve en PascalCase)
export interface TenantsListDataRaw {
  Tenants: TenantRaw[]; // La API devuelve "Tenants" con mayúscula
  Total: number; // La API devuelve "Total" con mayúscula
  Page?: number;
  PageSize?: number;
  TotalPages?: number;
}

// Tenant básico en formato de la API (PascalCase)
export interface TenantRaw {
  TenantId: number;
  Name: string;
  Slug: string;
  Description: string;
  PlanCode: string;
  IsActive: boolean;
  SuspendedAt: string | null;
  Status: string;
  ExternalKey: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  ActiveUsersCount: number;
}

// Estructura de datos del listado mapeada (camelCase)
export interface TenantsListData {
  tenants: Tenant[];
  count: number;
}

// Respuesta del listado de tenants
export interface TenantsListResponse {
  data: TenantsListDataRaw | TenantsListData; // Soporta ambos formatos
  success?: boolean;
  meta?: ApiResponseMeta; // Meta opcional para paginación
}

// Usuario del tenant (según la respuesta de GET /api/admin/tenants/{tenantId})
export interface TenantUser {
  UserId: number;
  UserEmail: string;
  UserName: string;
  RoleInTenant: string;
  JoinedAt: string;
}

// Suscripción activa del tenant
export interface TenantActiveSubscription {
  SubscriptionId: number;
  PlanCode: string;
  Status: string;
  StartDate: string;
  EndDate: string | null;
  ExternalSubscriptionId: string | null;
  CreatedAt: string;
}

// Tenant detallado (lo que devuelve GET /api/admin/tenants/{tenantId})
// La API devuelve en PascalCase
export interface TenantDetailRaw {
  TenantId: number;
  Name: string;
  Slug: string;
  Description: string;
  PlanCode: string;
  IsActive: boolean;
  SuspendedAt: string | null;
  ExternalKey: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Users: TenantUser[];
  ActiveUsersCount: number;
  ActiveSubscription: TenantActiveSubscription | null;
  // Campos opcionales que pueden venir en respuestas de actualización
  Status?: string; // Viene en PATCH /api/admin/tenants/{id}/status pero no en GET
  status?: string; // Versión camelCase por si acaso
  message?: string; // Mensaje de respuesta de actualización
}

// Tenant detallado mapeado para uso en el componente (camelCase)
export interface TenantDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  planCode: string;
  plan: string; // Para compatibilidad con la vista actual
  isActive: boolean;
  suspendedAt: string | null;
  externalKey: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivity: string; // Mapeado desde UpdatedAt
  status: string; // Calculado desde IsActive + SuspendedAt
      users: TenantUser[];
      activeUsersCount: number;
      activeSubscription: TenantActiveSubscription | null;
      // Campos opcionales que pueden no existir pero se mantienen para compatibilidad
      email?: string; // No existe en la API, se puede obtener del primer usuario
      userName?: string; // Nombre del usuario principal (Owner o primer usuario)
      pages?: TenantPage[];
      groups?: TenantGroup[];
      metrics?: TenantMetrics;
}

export interface TenantPage {
  id: number;
  name: string;
  connected: boolean;
  lastSync: string;
}

export interface TenantGroup {
  id: number;
  name: string;
  connected: boolean;
  lastSync: string;
}

export interface TenantMetrics {
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  engagementRate: number;
}

// Respuesta del detalle de tenant (la API devuelve en PascalCase)
export interface TenantDetailResponse {
  data: TenantDetailRaw;
  success: boolean;
}

// Workspace del tenant
export interface TenantWorkspace {
  tenantId: number;
  // Agregar campos según lo que devuelva la API
}

export interface TenantWorkspaceResponse {
  data: TenantWorkspace;
  meta: ApiResponseMeta;
}

// Request para actualizar el status de un tenant (la API espera PascalCase)
export interface UpdateTenantStatusRequest {
  Status: string;
}

// Request para actualizar el plan de un tenant (la API espera PascalCase)
export interface UpdateTenantPlanRequest {
  PlanCode: string;
}

// Respuesta genérica para operaciones de actualización (la API devuelve en PascalCase)
export interface TenantUpdateResponse {
  data: TenantDetailRaw;
  success: boolean;
}

// Límites de un tenant
export interface TenantLimits {
  maxUsers: number;
  maxStorageMB: number;
  maxPostsPerMonth: number;
  maxIntegrations: number;
  maxCollections: number;
  notes?: string;
}

// Request para actualizar los límites de un tenant
export interface UpdateTenantLimitsRequest {
  maxUsers: number;
  maxStorageMB: number;
  maxPostsPerMonth: number;
  maxIntegrations: number;
  maxCollections: number;
  notes?: string;
}

// Respuesta al obtener los límites de un tenant
export interface TenantLimitsResponse {
  data: TenantLimits;
  meta: ApiResponseMeta;
}

// Respuesta al actualizar los límites de un tenant
export interface TenantLimitsUpdateResponse {
  data: TenantLimits;
  meta: ApiResponseMeta;
}

// Estado disponible para tenants (según GET /api/admin/tenants/statuses)
export interface TenantStatus {
  Value: string; // Ej: "Active", "Suspended", "Trial", "Inactive"
  Label: string; // Ej: "Activo", "Suspendido", "Prueba", "Inactivo"
}

// Respuesta del endpoint de estados de tenants
export interface TenantStatusesResponse {
  data: {
    Statuses: TenantStatus[];
  };
  success: boolean;
}

// Parámetros opcionales para filtrar y paginar la lista de tenants
export interface GetTenantsParams {
  search?: string;
  status?: string;
  planCode?: string;
  createdFrom?: string; // ISO date-time string
  createdTo?: string; // ISO date-time string
  page?: number;
  pageSize?: number;
}