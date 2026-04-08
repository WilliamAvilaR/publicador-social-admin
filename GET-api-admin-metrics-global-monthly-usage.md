# GET `/api/admin/metrics/global/monthly-usage` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementada la **evolución mensual de uso** para dashboard administrativo.

Cubre en UI: tabla **Evolución Mensual (Últimos 6 Meses)**.

El endpoint devuelve una serie temporal mensual con:

- `month`
- `users`
- `posts`

Ordenada cronológicamente de más antiguo a más reciente.

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/admin/metrics/global/monthly-usage` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `AdminMetricsController` → acción `GetMonthlyUsage` |
| **Servicio** | `IAdminMetricsService` → `AdminMetricsService.GetGlobalMonthlyUsageAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **Sí:** `Authorization: Bearer <JWT>` válido |
| **Autorización** | Política **`InternalOnly`** (`userType` = Internal). Sin el claim adecuado → **403**. |
| **Cuerpo** | Ninguno |
| **Entrada** | Query string (`from`, `to`, `months`; opcionales). |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data` = `AdminGlobalMonthlyUsageResult` |
| **Errores típicos** | `401` (no autenticado / token inválido), `403` (no Internal) |

Ruta: `[Route("api/admin/metrics/global")]` + `[HttpGet("monthly-usage")]` → `/api/admin/metrics/global/monthly-usage`.

Swagger/OpenAPI: etiqueta **Admin - Metrics**.

---

## 2. Flujo de capas

1. El pipeline de ASP.NET Core valida JWT y aplica `[Authorize(Policy = "InternalOnly")]`.
2. `GetMonthlyUsage` recibe `[FromQuery]` y construye `AdminGlobalMonthlyUsageFilter`.
3. `AdminMetricsService.GetGlobalMonthlyUsageAsync`:
   - Resuelve periodo mensual efectivo.
   - Obtiene actividad de requests exitosos por usuario.
   - Obtiene posts programados.
   - Construye buckets por mes.
   - Calcula `users` (únicos) y `posts` por bucket.
   - Devuelve `items[]` ordenado cronológicamente.
4. El controlador responde `Ok(new ApiResponse<object>(result))`.

---

## 3. Contrato de entrada (query)

Todos los parámetros son opcionales.

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `from` | `DateTime?` | Calculado por `months` | Inicio del periodo (UTC). Se ajusta al primer día de mes. |
| `to` | `DateTime?` | `DateTime.UtcNow` | Fin del periodo (UTC). Se ajusta al último instante del mes (`23:59:59.9999999`). |
| `months` | `int` | `6` | Cantidad de meses a devolver cuando no se envía `from`. El servicio limita entre `1` y `24`. |

Reglas:

- Si `from > to`, el servicio intercambia ambos.
- Si no llega `from`, se toma una ventana de `months` meses hacia atrás (incluyendo el mes de `to`).
- El periodo se normaliza a límites de mes para construir la serie.

Ejemplo:

`GET /api/admin/metrics/global/monthly-usage?months=6`

---

## 4. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en **camelCase**).

El objeto en `data` corresponde a **`AdminGlobalMonthlyUsageResult`** (`DataColor.Core/DTOs/AdminMetricsDtos.cs`).

### 4.1 Ejemplo de cuerpo

```json
{
  "data": {
    "items": [
      { "month": "2025-11", "users": 34, "posts": 120 },
      { "month": "2025-12", "users": 37, "posts": 128 },
      { "month": "2026-01", "users": 40, "posts": 133 },
      { "month": "2026-02", "users": 42, "posts": 127 },
      { "month": "2026-03", "users": 45, "posts": 141 },
      { "month": "2026-04", "users": 43, "posts": 118 }
    ],
    "count": 6,
    "period": {
      "from": "2025-11-01T00:00:00Z",
      "to": "2026-04-30T23:59:59.9999999Z"
    }
  },
  "requiresReauth": false,
  "meta": null
}
```

### 4.2 Campos de `data`

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `items` | `array` | Elementos mensuales `AdminMonthlyUsageItemDto`, orden cronológico ascendente. |
| `count` | `number` | Total de filas devueltas en `items`. |
| `period` | `object` | Periodo efectivo usado para construir la serie. |

### 4.3 Cada elemento de `items` (`AdminMonthlyUsageItemDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `month` | `string` | Mes en formato `yyyy-MM`. |
| `users` | `number` | Usuarios únicos con requests exitosos en ese mes. |
| `posts` | `number` | Cantidad de posts programados en ese mes. |

---

## 5. Códigos HTTP y errores

| Código | Cuándo |
|--------|--------|
| **200** | Serie temporal calculada correctamente (puede devolver meses con `0`). |
| **401** | Sin autenticación o JWT inválido / expirado (pipeline estándar). |
| **403** | Usuario autenticado pero **no** cumple `InternalOnly`. |

No hay `404` en este endpoint porque no recibe ids de ruta.

---

## 6. Regla de cálculo usada

Para cada mes del rango:

- `users`: usuarios distintos (`UserId`) con request exitoso (`IsSuccess = true`) en `ApiRequestLog`.
- `posts`: cantidad de registros `PostTarget` por `ScheduledAt` en el mes.

La serie se devuelve siempre ordenada cronológicamente (mes ascendente).

---

## 7. Origen de datos

Este endpoint consulta:

- `ApiRequestLog` (actividad de usuarios por mes).
- `PostTarget` (posts programados por mes).

Solo lectura; no modifica datos.

---

## 8. Referencias en código

- Controlador: `DataColor.Api/Controllers/AdminMetricsController.cs` → `GetMonthlyUsage`.
- Servicio: `DataColor.Infrastructure/Services/AdminMetricsService.cs` → `GetGlobalMonthlyUsageAsync`.
- Interfaz: `DataColor.Core/Interfaces/IAdminMetricsService.cs`.
- DTOs: `DataColor.Core/DTOs/AdminMetricsDtos.cs`.
- Política Internal: `Program.cs` → `AddAuthorization` → política `"InternalOnly"` (`userType` = Internal).
