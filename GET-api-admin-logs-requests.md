# GET `/api/admin/logs/requests` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementado el **listado paginado de logs de peticiones HTTP** (`ApiRequestLog`) para usuarios de backoffice, con filtros opcionales por tenant, usuario, método, ruta, código de estado, fechas, duración, éxito/fracaso, correlación y **sorting 100% server-side**.

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/admin/logs/requests` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `AdminLogsController` → acción `GetRequests` |
| **Servicio** | `IAdminLogsService` → `AdminLogsService.ListRequestLogsAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **Sí:** `Authorization: Bearer <JWT>` válido |
| **Autorización** | Política **`InternalOnly`** (`userType` = Internal). Sin el claim adecuado → **403**. |
| **Cuerpo** | Ninguno |
| **Entrada** | Query string (todos opcionales salvo uso de valores por defecto de paginación; ver §3). |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data` = `AdminRequestLogsPagedResult` |
| **Errores típicos** | `401` (no autenticado / token inválido), `403` (no Internal) |

Ruta: `[Route("api/admin/logs")]` + `[HttpGet("requests")]` → `/api/admin/logs/requests`.

Swagger/OpenAPI: etiqueta **Admin - Logs**; la acción declara **200**, **401**, **403**.

---

## 2. Flujo de capas

1. El pipeline de ASP.NET Core valida JWT y aplica `[Authorize(Policy = "InternalOnly")]`.
2. `GetRequests` recibe parámetros `[FromQuery]` y construye un `AdminRequestLogsFilter`.
3. `AdminLogsService.ListRequestLogsAsync`:
   - Parte de `DbSet<ApiRequestLog>` con `Include` de `User` y `Tenant` (el listado proyecta principalmente datos del log; `TenantName` sale de `Tenant.Name`).
   - Aplica filtros opcionales (§3.1).
   - Cuenta el total antes de paginar.
   - Normaliza **`page`** ≥ 1 y **`pageSize`** en rango **1–100** (valores fuera de rango se recortan).
   - Aplica **sorting server-side** por columna permitida (`sortBy`) y dirección (`sortDir`).
   - Devuelve `AdminRequestLogsPagedResult` con la página actual y metadatos de paginación.
4. El controlador envuelve el resultado en `Ok(new ApiResponse<object>(result))`.

---

## 3. Contrato de entrada (query)

Todos los parámetros van en la query string. Ninguno es obligatorio; si se omiten, solo aplican los valores por defecto de `page` y `pageSize`.

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `tenantId` | `int?` | — | Filtra por `TenantId` del log. |
| `userId` | `int?` | — | Filtra por `UserId` del log. |
| `method` | `string?` | — | Filtro por método HTTP exacto, normalizado a mayúsculas (`GET`, `POST`, etc.). |
| `methods` | `string?` | — | Lista CSV de métodos HTTP (ej. `GET,POST`). |
| `path` | `string?` | — | Coincidencia por subcadena en ruta (`Contains`). |
| `exactPath` | `bool?` | — | Si es `true`, exige coincidencia exacta de `path`. |
| `statusCode` | `int?` | — | Código de respuesta HTTP registrado. |
| `statusCodeFrom` | `int?` | — | Rango mínimo de status code (`>=`). |
| `statusCodeTo` | `int?` | — | Rango máximo de status code (`<=`). |
| `fromDate` | `DateTime?` | — | `OccurredAt >= fromDate`. |
| `toDate` | `DateTime?` | — | `OccurredAt <= toDate`. |
| `createdFromDate` | `DateTime?` | — | `CreatedAt >= createdFromDate`. |
| `createdToDate` | `DateTime?` | — | `CreatedAt <= createdToDate`. |
| `minElapsedMs` | `long?` | — | Duración mínima en ms (`ElapsedMs >= minElapsedMs`). |
| `maxElapsedMs` | `long?` | — | Duración máxima en ms (`ElapsedMs <= maxElapsedMs`). |
| `onlyFailed` | `bool?` | — | Si es **`true`**, solo filas con `IsSuccess == false`. |
| `isSuccess` | `bool?` | — | Filtro explícito por éxito/fracaso (`true` o `false`). |
| `correlationId` | `Guid?` | — | Coincidencia exacta con `CorrelationId`. |
| `ipAddress` | `string?` | — | Subcadena sobre IP almacenada. |
| `userAgent` | `string?` | — | Subcadena sobre User-Agent. |
| `browserFamily` | `string?` | — | Filtro exacto por familia normalizada (`Edge`, `Chrome`, `Firefox`, `Safari`, `Opera`, `Other`). |
| `query` | `string?` | — | Búsqueda global (ruta, querystring, IP, User-Agent). |
| `sortBy` | `string?` | `occurredAt` | Orden server-side. Permitidos: `occurredAt`, `createdAt`, `statusCode`, `elapsedMs`, `id`, `httpMethod`, `path`, `tenantId`, `userId`, `browserFamily`. |
| `sortDir` | `string?` | `desc` | Dirección de orden: `asc` o `desc`. |
| `page` | `int` | `1` | Número de página (el servicio fuerza mínimo 1). |
| `pageSize` | `int` | `20` | Tamaño de página (el servicio limita entre **1 y 100**). |

Ejemplo:

`GET /api/admin/logs/requests?methods=GET,POST&path=/api/token&statusCodeFrom=400&onlyFailed=true&sortBy=elapsedMs&sortDir=desc&page=1&pageSize=50`

---

## 4. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en **camelCase**).

El objeto en `data` corresponde a **`AdminRequestLogsPagedResult`** (`DataColor.Core/DTOs/AdminLogsDtos.cs`).

### 4.1 Ejemplo de cuerpo

```json
{
  "data": {
    "requests": [
      {
        "id": 1001,
        "userId": 42,
        "tenantId": 7,
        "tenantName": "Mi workspace",
        "httpMethod": "GET",
        "path": "/api/tenants/7/users",
        "queryString": null,
        "statusCode": 200,
        "elapsedMs": 45,
        "ipAddress": "192.168.1.1",
        "isSuccess": true,
        "occurredAt": "2026-04-06T12:00:00Z",
        "createdAt": "2026-04-06T12:00:00.010Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  },
  "requiresReauth": false,
  "meta": null
}
```

### 4.2 Campos de `data` (paginación)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `requests` | `array` | Elementos `AdminRequestLogListItemDto`. |
| `total` | `number` | Total de registros que cumplen el filtro (antes de paginar). |
| `page` | `number` | Página efectiva (≥ 1). |
| `pageSize` | `number` | Tamaño efectivo (1–100). |
| `totalPages` | `number` | `ceil(total / pageSize)`; puede ser `0` si `total` es 0. |

### 4.3 Cada elemento de `requests` (`AdminRequestLogListItemDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `id` | `number` | Identificador del registro (`ApiRequestLog.Id`). |
| `userId` | `number` \| `null` | Usuario autenticado si se resolvió en el middleware. |
| `tenantId` | `number` \| `null` | Tenant en contexto si aplica. |
| `tenantName` | `string` \| `null` | Nombre del tenant relacionado. |
| `httpMethod` | `string` | Método HTTP. |
| `path` | `string` | Ruta solicitada. |
| `queryString` | `string` \| `null` | Query sin `?` inicial si se guardó. |
| `statusCode` | `number` | Código de estado HTTP de la respuesta. |
| `elapsedMs` | `number` | Tiempo de ejecución en milisegundos. |
| `browserFamily` | `string` \| `null` | Familia derivada del User-Agent (`Edge`, `Chrome`, `Firefox`, etc.). |
| `ipAddress` | `string` \| `null` | IP del cliente (o derivada). |
| `isSuccess` | `boolean` | `true` si el status está en 2xx. |
| `occurredAt` | `string` (ISO 8601) | Momento lógico del evento. |
| `createdAt` | `string` (ISO 8601) | Persistencia del registro. |

---

## 5. Códigos HTTP y errores

| Código | Cuándo |
|--------|--------|
| **200** | Listado generado correctamente (la lista puede estar vacía: `requests: []`, `total: 0`). |
| **401** | Sin autenticación o JWT inválido / expirado (pipeline estándar). |
| **403** | Usuario autenticado pero **no** cumple `InternalOnly`. |

No hay **404** en este endpoint: no se busca un recurso por id de ruta (el detalle por id es otro endpoint: `GET /api/admin/logs/requests/{requestId}`).

---

## 6. Origen de los datos

Los registros los inserta el middleware de logging de requests de la API (p. ej. `RequestLoggingMiddleware`) contra la tabla **`ApiRequestLog`**. Este GET solo **consulta**; no modifica datos.

---

## 7. Referencias en código

- Controlador: `DataColor.Api/Controllers/AdminLogsController.cs` → `GetRequests`.
- Servicio: `DataColor.Infrastructure/Services/AdminLogsService.cs` → `ListRequestLogsAsync`.
- DTOs: `DataColor.Core/DTOs/AdminLogsDtos.cs` → `AdminRequestLogsFilter`, `AdminRequestLogsPagedResult`, `AdminRequestLogListItemDto`.
- Política Internal: `Program.cs` → `AddAuthorization` → política `"InternalOnly"` (`userType` = Internal).
