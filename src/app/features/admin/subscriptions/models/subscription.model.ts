// Modelos para la API de administración de suscripciones

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: string | number;
}

// Suscripción básica (lo que devuelve el listado)
// La API devuelve en PascalCase
export interface Subscription {
  SubscriptionId: number;
  TenantId: number;
  TenantName: string;
  PlanCode: string;
  Status: string;
  IsActive: boolean;
  StartDate: string;
  EndDate: string | null;
  CancelledAt: string | null;
  CancellationReason: string | null;
  ExternalSubscriptionId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

// Suscripción detallada (lo que devuelve GET /api/admin/subscriptions/{subscriptionId})
export interface SubscriptionDetail {
  SubscriptionId: number;
  TenantId: number;
  TenantName: string;
  TenantSlug: string;
  PlanCode: string;
  Status: string;
  IsActive: boolean;
  StartDate: string;
  EndDate: string | null;
  CancelledAt: string | null;
  CancellationReason: string | null;
  ExternalSubscriptionId: string | null;
  Notes: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

// Estructura de datos del listado
export interface SubscriptionsListData {
  Subscriptions: Subscription[];
  Count: number;
  Filters?: {
    TenantId?: number;
    Status?: string;
    IsActive?: boolean;
  };
}

// Respuesta del listado de suscripciones
export interface SubscriptionsListResponse {
  data: SubscriptionsListData;
  success: boolean;
}

// Respuesta de una suscripción detallada
export interface SubscriptionDetailResponse {
  data: SubscriptionDetail;
  success: boolean;
}

// Request para crear una suscripción (la API espera PascalCase)
export interface CreateSubscriptionRequest {
  TenantId: number;
  PlanCode: string;
  StartDate?: string;
  EndDate?: string | null;
  Status?: string;
  ExternalSubscriptionId?: string | null;
  Notes?: string | null;
}

// Request para actualizar el estado de una suscripción
export interface UpdateSubscriptionStatusRequest {
  Status: string;
  CancellationReason?: string | null;
}

// Respuesta de creación de suscripción
export interface CreateSubscriptionResponse {
  data: Subscription & { Message?: string };
  success: boolean;
}

// Respuesta de actualización de estado
export interface UpdateSubscriptionStatusResponse {
  data: {
    SubscriptionId: number;
    TenantId: number;
    OldStatus: string;
    NewStatus: string;
    IsActive: boolean;
    CancelledAt?: string | null;
    CancellationReason?: string | null;
    Message: string;
  };
  success: boolean;
}

// Estado disponible para suscripciones (según GET /api/admin/subscriptions/statuses)
export interface SubscriptionStatus {
  Value: string; // Ej: "Active", "Cancelled", "Expired", "Trial", "Suspended"
  Label: string; // Ej: "Activa", "Cancelada", "Expirada", "Prueba", "Suspendida"
}

// Respuesta del endpoint de estados de suscripciones
export interface SubscriptionStatusesResponse {
  data: {
    Statuses: SubscriptionStatus[];
  };
  success: boolean;
}

// Parámetros para filtrar suscripciones
export interface GetSubscriptionsParams {
  tenantId?: number;
  status?: string;
  isActive?: boolean;
}
