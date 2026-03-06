// Modelos para la API de administración general

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: string | number;
}

// Información del admin autenticado (GET /api/admin/me)
export interface AdminInfo {
  UserId: string;
  Email: string;
  FullName: string;
  UserType: string;
  InternalRoles: string[];
}

// Respuesta de GET /api/admin/me
export interface AdminInfoResponse {
  data: AdminInfo;
  success: boolean;
}

// Respuesta de GET /api/admin/platform-owners-only
export interface PlatformOwnerResponse {
  data: string;
  success: boolean;
}

// Datos sensibles (GET /api/admin/sensitive-data)
export interface SensitiveData {
  Message: string;
  InternalRoles: string[];
  SensitiveData: string;
}

// Respuesta de GET /api/admin/sensitive-data
export interface SensitiveDataResponse {
  data: SensitiveData;
  success: boolean;
}
