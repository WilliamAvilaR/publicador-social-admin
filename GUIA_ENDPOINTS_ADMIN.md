# Guía Técnica - Endpoints de Administración

## Tabla de Contenidos

1. [Autenticación y Autorización](#autenticación-y-autorización)
2. [Endpoints de Planes](#endpoints-de-planes)
3. [Endpoints de Features (Catálogo)](#endpoints-de-features-catálogo)
4. [Endpoints de Tenants](#endpoints-de-tenants)
5. [Endpoints de Suscripciones](#endpoints-de-suscripciones)
6. [Endpoints Generales de Admin](#endpoints-generales-de-admin)
7. [Estructura de Respuestas](#estructura-de-respuestas)
8. [Códigos de Estado HTTP](#códigos-de-estado-http)

---

## Autenticación y Autorización

Todos los endpoints de administración requieren:

- **Autenticación**: Token JWT válido en el header `Authorization: Bearer {token}`
- **Autorización**: Usuario con `UserType = "Internal"` (política `InternalOnly`)
- **Base URL**: `https://api.tudominio.com/api/admin`

---

## Endpoints de Planes

**Base Path**: `/api/admin/plans`

### 1. Obtener Lista de Planes

**GET** `/api/admin/plans`

Obtiene el catálogo completo de planes disponibles.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Plans": [
      {
        "Code": "free",
        "Name": "Plan Gratuito",
        "Description": "Plan básico gratuito",
        "IsDefault": true,
        "IsPaid": false,
        "IsActive": true,
        "Price": null
      }
    ],
    "Count": 1
  },
  "success": true
}
```

---

### 2. Crear Plan

**POST** `/api/admin/plans`

Crea un nuevo plan con sus features y límites.

**Body**:
```json
{
  "Code": "pro",
  "Name": "Plan Pro",
  "Description": "Plan profesional para equipos",
  "IsDefault": false,
  "IsPaid": true,
  "IsActive": true,
  "Price": 29.99,
  "Features": [
    {
      "FeatureKey": "module.dashboard",
      "IsEnabled": true
    },
    {
      "FeatureKey": "network.facebook.pages",
      "IsEnabled": true
    }
  ],
  "Limits": [
    {
      "LimitKey": "limit.users",
      "Value": 50
    },
    {
      "LimitKey": "limit.facebook.pages",
      "Value": 5
    }
  ]
}
```

**Respuesta Exitosa (201 Created)**:
```json
{
  "data": {
    "PlanId": 2,
    "Code": "pro",
    "Name": "Plan Pro",
    "Description": "Plan profesional para equipos",
    "IsDefault": false,
    "IsPaid": true,
    "IsActive": true,
    "Price": 29.99,
    "FeaturesCount": 2,
    "LimitsCount": 2,
    "CreatedAt": "2026-03-04T23:33:23.3966774Z",
    "Message": "Plan creado correctamente"
  },
  "success": true
}
```

**Validaciones**:
- `Code` es requerido y único
- `Name` es requerido
- Si `IsDefault = true`, se desmarca el default anterior automáticamente

---

### 3. Obtener Plan por ID

**GET** `/api/admin/plans/{planId}`

Obtiene información detallada de un plan, incluyendo features y límites.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "PlanId": 2,
    "Code": "pro",
    "Name": "Plan Pro",
    "Description": "Plan profesional para equipos",
    "IsDefault": false,
    "IsPaid": true,
    "IsActive": true,
    "Price": 29.99,
    "CreatedAt": "2026-03-04T23:33:23.3966774Z",
    "Features": [
      {
        "FeatureKey": "module.dashboard",
        "IsEnabled": true
      }
    ],
    "Limits": [
      {
        "LimitKey": "limit.users",
        "Value": 50
      }
    ],
    "FeaturesCount": 1,
    "LimitsCount": 1
  },
  "success": true
}
```

**Errores**:
- `404 Not Found`: Plan no encontrado

---

### 4. Actualizar Plan

**PUT** `/api/admin/plans/{planId}`

Actualiza los campos básicos de un plan (actualización parcial).

**Body** (todos los campos son opcionales):
```json
{
  "Name": "Plan Pro Actualizado",
  "Description": "Nueva descripción",
  "IsDefault": false,
  "IsPaid": true,
  "IsActive": true,
  "Price": 39.99
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "PlanId": 2,
    "Code": "pro",
    "Name": "Plan Pro Actualizado",
    "Description": "Nueva descripción",
    "IsDefault": false,
    "IsPaid": true,
    "IsActive": true,
    "Price": 39.99,
    "Message": "Plan actualizado correctamente"
  },
  "success": true
}
```

**Notas**:
- Si `IsDefault = true`, se desmarca el default anterior automáticamente
- Solo se actualizan los campos enviados (null = no cambiar)

---

### 5. Actualizar Features de un Plan

**PUT** `/api/admin/plans/{planId}/features`

Reemplaza todas las features del plan con las proporcionadas.

**Body**:
```json
{
  "Features": [
    {
      "FeatureKey": "module.dashboard",
      "IsEnabled": true
    },
    {
      "FeatureKey": "module.scheduler",
      "IsEnabled": true
    },
    {
      "FeatureKey": "network.facebook.pages",
      "IsEnabled": false
    }
  ]
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "PlanId": 2,
    "Code": "pro",
    "Features": [
      {
        "FeatureKey": "module.dashboard",
        "IsEnabled": true
      }
    ],
    "FeaturesCount": 1,
    "Message": "Features del plan actualizadas correctamente"
  },
  "success": true
}
```

**Notas**:
- Reemplaza TODAS las features existentes
- Si envías un array vacío, elimina todas las features

---

### 6. Actualizar Límites de un Plan

**PUT** `/api/admin/plans/{planId}/limits`

Reemplaza todos los límites del plan con los proporcionados.

**Body**:
```json
{
  "Limits": [
    {
      "LimitKey": "limit.users",
      "Value": 100
    },
    {
      "LimitKey": "limit.facebook.pages",
      "Value": 10
    },
    {
      "LimitKey": "limit.postsPerMonth",
      "Value": null
    }
  ]
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "PlanId": 2,
    "Code": "pro",
    "Limits": [
      {
        "LimitKey": "limit.users",
        "Value": 100
      }
    ],
    "LimitsCount": 1,
    "Message": "Límites del plan actualizados correctamente"
  },
  "success": true
}
```

**Notas**:
- `Value: null` = ilimitado
- Reemplaza TODOS los límites existentes
- Si envías un array vacío, elimina todos los límites

---

## Endpoints de Features (Catálogo)

**Base Path**: `/api/admin/features`

### 1. Obtener Catálogo de Features

**GET** `/api/admin/features/catalog`

Obtiene el catálogo completo de features disponibles (módulos y redes) desde la base de datos.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Modules": [
      {
        "Id": 1,
        "Key": "module.dashboard",
        "Name": "Dashboard",
        "Description": "Panel principal de control y estadísticas",
        "Category": "module",
        "DisplayOrder": 1
      }
    ],
    "Networks": [
      {
        "Id": 7,
        "Key": "network.facebook.pages",
        "Name": "Páginas de Facebook",
        "Description": "Conectar y gestionar páginas de Facebook",
        "Category": "network",
        "DisplayOrder": 10
      }
    ],
    "All": [...],
    "TotalCount": 12,
    "ModulesCount": 6,
    "NetworksCount": 6
  },
  "success": true
}
```

---

### 2. Obtener Catálogo de Límites

**GET** `/api/admin/features/limits/catalog`

Obtiene el catálogo completo de límites disponibles (desde código hardcodeado).

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Limits": [
      {
        "Key": "limit.users",
        "Name": "Usuarios",
        "Description": "Máximo número de usuarios activos en el tenant",
        "Category": "general",
        "Unit": "usuarios"
      }
    ],
    "GroupedByCategory": {
      "general": [...],
      "facebook": [...]
    },
    "TotalCount": 10,
    "Categories": ["general", "facebook", "instagram", "linkedin"]
  },
  "success": true
}
```

---

## Endpoints de Tenants

**Base Path**: `/api/admin/tenants`

### 1. Obtener Lista de Tenants

**GET** `/api/admin/tenants`

Obtiene el listado de todos los tenants con filtros y paginación.

**Query Parameters**:
- `search` (string, opcional): Busca en nombre, slug o descripción
- `status` (string, opcional): `active`, `suspended`, `inactive`
- `planCode` (string, opcional): Filtra por código de plan
- `createdFrom` (datetime, opcional): Filtra desde fecha
- `createdTo` (datetime, opcional): Filtra hasta fecha
- `page` (int, opcional, default: 1): Número de página
- `pageSize` (int, opcional, default: 20, max: 100): Tamaño de página

**Ejemplo**:
```
GET /api/admin/tenants?search=empresa&status=active&planCode=pro&page=1&pageSize=20
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Tenants": [
      {
        "TenantId": 1,
        "Name": "Empresa ABC",
        "Slug": "empresa-abc",
        "Description": "Descripción del tenant",
        "PlanCode": "pro",
        "IsActive": true,
        "SuspendedAt": null,
        "Status": "Active",
        "ExternalKey": null,
        "CreatedAt": "2026-01-01T00:00:00Z",
        "UpdatedAt": "2026-01-01T00:00:00Z",
        "ActiveUsersCount": 5
      }
    ],
    "Total": 100,
    "Page": 1,
    "PageSize": 20,
    "TotalPages": 5
  },
  "success": true
}
```

---

### 2. Obtener Tenant por ID

**GET** `/api/admin/tenants/{tenantId}`

Obtiene información detallada de un tenant, incluyendo usuarios y suscripción activa.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "TenantId": 1,
    "Name": "Empresa ABC",
    "Slug": "empresa-abc",
    "Description": "Descripción del tenant",
    "PlanCode": "pro",
    "IsActive": true,
    "SuspendedAt": null,
    "ExternalKey": null,
    "CreatedAt": "2026-01-01T00:00:00Z",
    "UpdatedAt": "2026-01-01T00:00:00Z",
    "Users": [
      {
        "UserId": 10,
        "UserEmail": "usuario@empresa.com",
        "UserName": "Juan Pérez",
        "RoleInTenant": "Owner",
        "JoinedAt": "2026-01-01T00:00:00Z"
      }
    ],
    "ActiveUsersCount": 1,
    "ActiveSubscription": {
      "SubscriptionId": 5,
      "PlanCode": "pro",
      "Status": "Active",
      "StartDate": "2026-01-01T00:00:00Z",
      "EndDate": null,
      "ExternalSubscriptionId": "ext_123",
      "CreatedAt": "2026-01-01T00:00:00Z"
    }
  },
  "success": true
}
```

**Errores**:
- `404 Not Found`: Tenant no encontrado

---

### 3. Actualizar Estado de Tenant

**PATCH** `/api/admin/tenants/{tenantId}/status`

Actualiza el estado de un tenant.

**Body**:
```json
{
  "Status": "active"
}
```

**Valores permitidos**:
- `active`: Activa el tenant y quita suspensión
- `suspended`: Suspende el tenant (mantiene IsActive = true pero establece SuspendedAt)
- `trial`: Similar a active (para lógica futura)

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "TenantId": 1,
    "Name": "Empresa ABC",
    "Status": "active",
    "IsActive": true,
    "SuspendedAt": null,
    "Message": "Tenant actualizado a estado: active"
  },
  "success": true
}
```

**Errores**:
- `400 Bad Request`: Estado inválido
- `404 Not Found`: Tenant no encontrado

---

### 4. Actualizar Plan de Tenant

**PATCH** `/api/admin/tenants/{tenantId}/plan`

Actualiza el plan de un tenant. Crea una nueva suscripción y desactiva la anterior.

**Body**:
```json
{
  "PlanCode": "enterprise"
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "TenantId": 1,
    "Name": "Empresa ABC",
    "PlanCode": "enterprise",
    "UpdatedAt": "2026-03-04T00:00:00Z",
    "NewSubscription": {
      "SubscriptionId": 6,
      "PlanCode": "enterprise",
      "Status": "Active",
      "StartDate": "2026-03-04T00:00:00Z"
    },
    "PreviousSubscription": {
      "SubscriptionId": 5,
      "PlanCode": "pro",
      "EndDate": "2026-03-04T00:00:00Z"
    },
    "Message": "Plan actualizado a: enterprise"
  },
  "success": true
}
```

**Validaciones**:
- `PlanCode` debe existir en la tabla `Plans`
- Si el tenant ya tiene ese plan activo, retorna error

**Errores**:
- `400 Bad Request`: PlanCode inválido o ya tiene ese plan
- `404 Not Found`: Tenant no encontrado

---

### 5. Obtener Límites de Tenant

**GET** `/api/admin/tenants/{tenantId}/limits`

Obtiene los límites personalizados de un tenant.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "TenantId": 1,
    "TenantName": "Empresa ABC",
    "PlanCode": "pro",
    "Limits": {
      "MaxUsers": 100,
      "MaxStorageMB": 5000,
      "MaxPostsPerMonth": 1000,
      "MaxIntegrations": 20,
      "MaxCollections": 50,
      "Notes": "Límites personalizados para cliente VIP",
      "UpdatedAt": "2026-03-04T00:00:00Z"
    },
    "Message": "Límites del tenant"
  },
  "success": true
}
```

**Notas**:
- Si el tenant no tiene límites personalizados, `Limits` será `null`

---

### 6. Actualizar Límites de Tenant

**PUT** `/api/admin/tenants/{tenantId}/limits`

Actualiza o crea los límites personalizados de un tenant.

**Body**:
```json
{
  "MaxUsers": 100,
  "MaxStorageMB": 5000,
  "MaxPostsPerMonth": 1000,
  "MaxIntegrations": 20,
  "MaxCollections": 50,
  "Notes": "Límites personalizados para cliente VIP"
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "TenantId": 1,
    "TenantName": "Empresa ABC",
    "Limits": {
      "MaxUsers": 100,
      "MaxStorageMB": 5000,
      "MaxPostsPerMonth": 1000,
      "MaxIntegrations": 20,
      "MaxCollections": 50,
      "Notes": "Límites personalizados para cliente VIP",
      "UpdatedAt": "2026-03-04T00:00:00Z"
    },
    "Message": "Límites actualizados correctamente"
  },
  "success": true
}
```

**Notas**:
- Si el tenant no tiene límites, se crean automáticamente
- Todos los campos son opcionales (puedes actualizar solo algunos)

---

## Endpoints de Suscripciones

**Base Path**: `/api/admin/subscriptions`

### 1. Obtener Lista de Suscripciones

**GET** `/api/admin/subscriptions`

Obtiene el listado de suscripciones con filtros opcionales.

**Query Parameters**:
- `tenantId` (int, opcional): Filtra por tenant
- `status` (string, opcional): Filtra por estado
- `isActive` (bool, opcional): Filtra por activo/inactivo

**Ejemplo**:
```
GET /api/admin/subscriptions?tenantId=1&status=Active&isActive=true
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Subscriptions": [
      {
        "SubscriptionId": 5,
        "TenantId": 1,
        "TenantName": "Empresa ABC",
        "PlanCode": "pro",
        "Status": "Active",
        "IsActive": true,
        "StartDate": "2026-01-01T00:00:00Z",
        "EndDate": null,
        "CancelledAt": null,
        "CancellationReason": null,
        "ExternalSubscriptionId": "ext_123",
        "CreatedAt": "2026-01-01T00:00:00Z",
        "UpdatedAt": "2026-01-01T00:00:00Z"
      }
    ],
    "Count": 1,
    "Filters": {
      "TenantId": 1,
      "Status": "Active",
      "IsActive": true
    }
  },
  "success": true
}
```

---

### 2. Obtener Suscripción por ID

**GET** `/api/admin/subscriptions/{subscriptionId}`

Obtiene información detallada de una suscripción.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "SubscriptionId": 5,
    "TenantId": 1,
    "TenantName": "Empresa ABC",
    "TenantSlug": "empresa-abc",
    "PlanCode": "pro",
    "Status": "Active",
    "IsActive": true,
    "StartDate": "2026-01-01T00:00:00Z",
    "EndDate": null,
    "CancelledAt": null,
    "CancellationReason": null,
    "ExternalSubscriptionId": "ext_123",
    "Notes": "Notas adicionales",
    "CreatedAt": "2026-01-01T00:00:00Z",
    "UpdatedAt": "2026-01-01T00:00:00Z"
  },
  "success": true
}
```

**Errores**:
- `404 Not Found`: Suscripción no encontrada

---

### 3. Crear Suscripción

**POST** `/api/admin/subscriptions`

Crea una nueva suscripción para un tenant.

**Body**:
```json
{
  "TenantId": 1,
  "PlanCode": "pro",
  "StartDate": "2026-03-04T00:00:00Z",
  "EndDate": null,
  "Status": "Active",
  "ExternalSubscriptionId": "ext_123",
  "Notes": "Suscripción creada manualmente"
}
```

**Respuesta Exitosa (201 Created)**:
```json
{
  "data": {
    "SubscriptionId": 6,
    "TenantId": 1,
    "TenantName": "Empresa ABC",
    "PlanCode": "pro",
    "Status": "Active",
    "IsActive": true,
    "StartDate": "2026-03-04T00:00:00Z",
    "EndDate": null,
    "Message": "Suscripción creada correctamente"
  },
  "success": true
}
```

**Validaciones**:
- `TenantId` es requerido
- `PlanCode` es requerido y debe existir en la tabla `Plans`
- Si se crea una suscripción activa, se desactiva la anterior del mismo tenant
- Si la nueva suscripción es activa, se actualiza `Tenant.PlanCode`

**Errores**:
- `400 Bad Request`: PlanCode inválido o TenantId requerido
- `404 Not Found`: Tenant no encontrado

---

### 4. Actualizar Estado de Suscripción

**PATCH** `/api/admin/subscriptions/{subscriptionId}/status`

Actualiza el estado de una suscripción.

**Body**:
```json
{
  "Status": "Cancelled",
  "CancellationReason": "Cliente solicitó cancelación"
}
```

**Valores permitidos**:
- `Active`: Activa la suscripción (desactiva otras del mismo tenant)
- `Cancelled`: Cancela la suscripción
- `Expired`: Marca como expirada
- `Suspended`: Suspende la suscripción
- `Trial`: Marca como trial

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "SubscriptionId": 5,
    "TenantId": 1,
    "OldStatus": "Active",
    "NewStatus": "Cancelled",
    "IsActive": false,
    "CancelledAt": "2026-03-04T00:00:00Z",
    "CancellationReason": "Cliente solicitó cancelación",
    "Message": "Estado actualizado de 'Active' a 'Cancelled'"
  },
  "success": true
}
```

**Lógica por Estado**:
- **Active**: Desactiva otras suscripciones activas del mismo tenant, actualiza `Tenant.PlanCode`
- **Cancelled**: Marca `IsActive = false`, establece `CancelledAt` y `EndDate`
- **Expired/Suspended**: Marca `IsActive = false`, establece `EndDate`
- **Trial**: Marca `IsActive = true`, quita `EndDate`

**Errores**:
- `400 Bad Request`: Estado inválido
- `404 Not Found`: Suscripción no encontrada

---

## Endpoints Generales de Admin

**Base Path**: `/api/admin`

### 1. Obtener Información del Admin

**GET** `/api/admin/me`

Obtiene información del usuario admin autenticado.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "UserId": "1",
    "Email": "admin@datacolor.com",
    "FullName": "Admin User",
    "UserType": "Internal",
    "InternalRoles": ["PlatformOwner", "PlatformSupport"]
  },
  "success": true
}
```

---

### 2. Endpoint Solo para PlatformOwner

**GET** `/api/admin/platform-owners-only`

Ejemplo de endpoint que requiere rol específico `PlatformOwner`.

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": "Acceso concedido. Solo PlatformOwner puede ver esto.",
  "success": true
}
```

**Errores**:
- `403 Forbidden`: Usuario no tiene rol PlatformOwner

---

### 3. Obtener Datos Sensibles

**GET** `/api/admin/sensitive-data`

Endpoint protegido con política `PlatformSupportOrOwner` (requiere rol PlatformSupport o PlatformOwner).

**Respuesta Exitosa (200 OK)**:
```json
{
  "data": {
    "Message": "Datos sensibles de la plataforma",
    "InternalRoles": ["PlatformOwner"],
    "SensitiveData": "Esta información solo es accesible para PlatformSupport o PlatformOwner"
  },
  "success": true
}
```

**Errores**:
- `403 Forbidden`: Usuario no tiene rol PlatformSupport ni PlatformOwner

---

## Estructura de Respuestas

Todas las respuestas siguen el formato estándar `ApiResponse<T>`:

```json
{
  "data": { ... },
  "success": true,
  "meta": { ... }
}
```

**Campos**:
- `data`: Contiene los datos de la respuesta
- `success`: Indica si la operación fue exitosa
- `meta`: Metadatos adicionales (paginación, etc.)

---

## Códigos de Estado HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| `200 OK` | Operación exitosa | GET, PUT, PATCH exitosos |
| `201 Created` | Recurso creado | POST exitoso |
| `400 Bad Request` | Solicitud inválida | Validaciones fallidas, datos incorrectos |
| `401 Unauthorized` | No autenticado | Token faltante o inválido |
| `403 Forbidden` | No autorizado | Usuario no tiene permisos (no es Internal) |
| `404 Not Found` | Recurso no encontrado | ID no existe |
| `500 Internal Server Error` | Error del servidor | Error inesperado |

---

## Notas Importantes

### Features y Limits

- **Features**: Se definen en la tabla `FeatureDefinitions` (catálogo dinámico)
- **Limits**: Se definen en código (`LimitCatalog`) - pendiente migrar a BD
- Las `FeatureKey` deben existir en `FeatureDefinitions` para ser válidas
- Los `LimitKey` deben seguir el formato `limit.{categoria}.{tipo}`

### Planes

- Solo puede haber UN plan con `IsDefault = true` a la vez
- Al crear/actualizar un plan como default, se desmarca el anterior automáticamente
- El `Code` del plan es único e inmutable (no se puede cambiar después de crear)

### Tenants y Suscripciones

- Un tenant puede tener múltiples suscripciones (historial)
- Solo UNA suscripción puede estar activa (`IsActive = true`) por tenant
- Al activar una suscripción, se desactivan automáticamente las otras del mismo tenant
- El `PlanCode` del tenant se actualiza automáticamente cuando se activa una suscripción

### Límites

- Los límites del plan son los valores por defecto
- Los límites del tenant sobrescriben los del plan (si existen)
- Si un tenant no tiene límites personalizados, usa los del plan

---

## Ejemplos de Uso

### Flujo Completo: Crear Plan y Asignarlo a Tenant

1. **Obtener catálogo de features**:
```bash
GET /api/admin/features/catalog
```

2. **Crear plan con features y límites**:
```bash
POST /api/admin/plans
{
  "Code": "enterprise",
  "Name": "Plan Enterprise",
  "Features": [...],
  "Limits": [...]
}
```

3. **Asignar plan a tenant**:
```bash
PATCH /api/admin/tenants/1/plan
{
  "PlanCode": "enterprise"
}
```

### Actualizar Features de un Plan Existente

1. **Obtener plan actual**:
```bash
GET /api/admin/plans/2
```

2. **Actualizar features**:
```bash
PUT /api/admin/plans/2/features
{
  "Features": [
    { "FeatureKey": "module.dashboard", "IsEnabled": true },
    { "FeatureKey": "network.facebook.pages", "IsEnabled": true }
  ]
}
```

---

## Versión

**Última actualización**: 2026-03-04  
**Versión del API**: 1.0
