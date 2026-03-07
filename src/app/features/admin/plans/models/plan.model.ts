// Modelos para la API de administración de planes

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  meta?: ApiResponseMeta;
}

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

// Feature de un plan (la API usa PascalCase)
export interface PlanFeature {
  FeatureKey: string;
  IsEnabled: boolean;
}

// Límite de un plan (la API usa PascalCase)
export interface PlanLimit {
  LimitKey: string;
  Value: number | null; // null = ilimitado
}

// Plan básico (lo que devuelve el listado)
// La API devuelve en PascalCase
export interface Plan {
  PlanId: number;
  Code: string;
  Name: string;
  Description: string;
  IsDefault: boolean;
  IsPaid: boolean;
  IsActive: boolean;
  Price: number | null;
}

// Plan detallado (lo que devuelve GET /api/admin/plans/{planId})
// La API devuelve en PascalCase
export interface PlanDetail {
  PlanId: number;
  Code: string;
  Name: string;
  Description: string;
  IsDefault: boolean;
  IsPaid: boolean;
  IsActive: boolean;
  Price: number | null;
  CreatedAt: string;
  Features: PlanFeature[];
  Limits: PlanLimit[];
  FeaturesCount: number;
  LimitsCount: number;
}

// Estructura de datos del listado (según la API, usa "Plans" con mayúscula)
export interface PlansListData {
  Plans: Plan[]; // La API devuelve "Plans" con mayúscula
  Count: number; // La API devuelve "Count" con mayúscula
}

// Respuesta del listado de planes
export interface PlansListResponse {
  data: PlansListData;
  success: boolean;
}

// Respuesta de un plan detallado
export interface PlanDetailResponse {
  data: PlanDetail;
  success: boolean;
}

// Request para crear un plan (la API espera PascalCase)
export interface CreatePlanRequest {
  Code: string;
  Name: string;
  Description: string;
  IsDefault: boolean;
  IsPaid: boolean;
  IsActive: boolean;
  Price: number | null;
  Features: PlanFeature[];
  Limits: PlanLimit[];
}

// Request para actualizar un plan (todos los campos opcionales, PascalCase)
export interface UpdatePlanRequest {
  Name?: string;
  Description?: string;
  IsDefault?: boolean;
  IsPaid?: boolean;
  IsActive?: boolean;
  Price?: number | null;
}

// Request para actualizar features de un plan (PascalCase)
export interface UpdatePlanFeaturesRequest {
  Features: PlanFeature[];
}

// Request para actualizar límites de un plan (PascalCase)
export interface UpdatePlanLimitsRequest {
  Limits: PlanLimit[];
}

// Respuesta de creación/actualización de plan
export interface PlanOperationResponse {
  data: PlanDetail & { message?: string };
  success: boolean;
}

// Feature del nuevo endpoint de definiciones (camelCase)
export interface PlanDefinitionFeature {
  key: string;
  name: string;
  category: string; // "Modules" o "Networks"
}

// Límite del nuevo endpoint de definiciones (camelCase)
export interface PlanDefinitionLimit {
  key: string;
  name: string;
  category: string; // "General", "Facebook", etc.
  dependsOnFeatures: string[]; // Array de feature keys
}

// Respuesta del endpoint de definiciones de planes
export interface PlanDefinitionsResponse {
  data: {
    features: PlanDefinitionFeature[];
    limits: PlanDefinitionLimit[];
  };
  success: boolean;
}