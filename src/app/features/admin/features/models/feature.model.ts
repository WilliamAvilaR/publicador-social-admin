// Modelos para la API de catálogo de features y límites

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: string | number;
}

// Feature del catálogo (la API usa PascalCase)
export interface Feature {
  Id: number;
  Key: string;
  Name: string;
  Description: string;
  Category: string;
  DisplayOrder: number;
}

// Límite del catálogo (la API usa PascalCase)
export interface Limit {
  Key: string;
  Name: string;
  Description: string;
  Category: string;
  Unit: string;
}

// Catálogo de features (la API usa PascalCase)
export interface FeaturesCatalog {
  Modules: Feature[];
  Networks: Feature[];
  All: Feature[];
  TotalCount: number;
  ModulesCount: number;
  NetworksCount: number;
}

// Catálogo de límites (la API usa PascalCase)
export interface LimitsCatalog {
  Limits: Limit[];
  GroupedByCategory: { [category: string]: Limit[] };
  TotalCount: number;
  Categories: string[];
}

// Respuesta del catálogo de features
export interface FeaturesCatalogResponse {
  data: FeaturesCatalog;
  success: boolean;
}

// Respuesta del catálogo de límites
export interface LimitsCatalogResponse {
  data: LimitsCatalog;
  success: boolean;
}
