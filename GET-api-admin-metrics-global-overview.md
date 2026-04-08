# GET `/api/admin/metrics/global/overview` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementado el **overview global de KPIs** para dashboard administrativo, con comparación contra un periodo anterior.

Incluye métricas agregadas y tendencia por métrica:

- Total usuarios activos
- Total páginas conectadas
- Total posts programados
- Uso promedio
- Churn
- ARPU

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/admin/metrics/global/overview` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `AdminMetricsController` → acción `GetOverview` |
| **Servicio** | `IAdminMetricsService` → `AdminMetricsService.GetGlobalOverviewAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **Sí:** `Authorization: Bearer <JWT>` válido |
| **Autorización** | Política **`InternalOnly`** (`userType` = Internal). Sin el claim adecuado → **403**. |
| **Cuerpo** | Ninguno |
| **Entrada** | Query string (todos opcionales; ver §3). |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data` = `AdminGlobalMetricsOverviewResult` |
| **Errores típicos** | `401` (no autenticado / token inválido), `403` (no Internal) |

Ruta: `[Route("api/admin/metrics/global")]` + `[HttpGet("overview")]` → `/api/admin/metrics/global/overview`.

Swagger/OpenAPI: etiqueta **Admin - Metrics**.

---

## 2. Flujo de capas

1. El pipeline de ASP.NET Core valida JWT y aplica `[Authorize(Policy = "InternalOnly")]`.
2. `GetOverview` recibe parámetros `[FromQuery]` y construye `AdminGlobalMetricsOverviewFilter`.
3. `AdminMetricsService.GetGlobalOverviewAsync`:
   - Resuelve periodo actual (`from`/`to`) y comparativo (`compareFrom`/`compareTo`).
   - Si no se envía comparativo, usa la ventana inmediatamente anterior con el mismo tamaño.
   - Calcula métricas del periodo actual.
   - Calcula métricas del periodo comparativo.
   - Construye tendencias por métrica (`change`, `changePercent`, `isPositive`).
4. El controlador envuelve el resultado en `Ok(new ApiResponse<object>(result))`.

---

## 3. Contrato de entrada (query)

Todos los parámetros van en query string. Ninguno es obligatorio.

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `from` | `DateTime?` | `to - 30 días` | Inicio del periodo actual (UTC). |
| `to` | `DateTime?` | `DateTime.UtcNow` | Fin del periodo actual (UTC). |
| `compareFrom` | `DateTime?` | automático | Inicio del periodo comparativo. |
| `compareTo` | `DateTime?` | automático | Fin del periodo comparativo. |

Reglas:

- Si `from > to`, el servicio intercambia ambos valores.
- Si solo falta uno de los campos comparativos, se ignoran ambos y se calcula automáticamente la ventana anterior.
- Si `compareFrom > compareTo`, el servicio intercambia ambos valores.

Ejemplo:

`GET /api/admin/metrics/global/overview?from=2026-03-01T00:00:00Z&to=2026-03-31T23:59:59Z`

---

## 4. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en **camelCase**).

El objeto en `data` corresponde a **`AdminGlobalMetricsOverviewResult`** (`DataColor.Core/DTOs/AdminMetricsDtos.cs`).

### 4.1 Ejemplo de cuerpo

```json
{
  "data": {
    "metrics": {
      "totalActiveUsers": 128,
      "totalPages": 342,
      "totalScheduledPosts": 91,
      "averageUsage": 24.5,
      "churn": 3.1,
      "arpu": 19.9
    },
    "trends": {
      "totalActiveUsers": { "change": 12, "changePercent": 10.34, "isPositive": true },
      "totalPages": { "change": 7, "changePercent": 2.09, "isPositive": true },
      "totalScheduledPosts": { "change": -5, "changePercent": -5.21, "isPositive": false },
      "averageUsage": { "change": 1.2, "changePercent": 5.15, "isPositive": true },
      "churn": { "change": -0.8, "changePercent": -20.51, "isPositive": true },
      "arpu": { "change": 0.9, "changePercent": 4.74, "isPositive": true }
    },
    "period": {
      "from": "2026-03-01T00:00:00Z",
      "to": "2026-03-31T23:59:59Z",
      "compareFrom": "2026-01-29T00:00:01Z",
      "compareTo": "2026-03-01T00:00:00Z"
    }
  },
  "requiresReauth": false,
  "meta": null
}
```

### 4.2 Campos de `data`

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `metrics` | `object` | Valores agregados del periodo actual. |
| `trends` | `object` | Variación de cada métrica vs periodo comparativo. |
| `period` | `object` | Periodos efectivos utilizados por el servicio. |

### 4.3 `metrics` (`AdminOverviewMetricsDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `totalActiveUsers` | `number` | Usuarios distintos con requests exitosos en el periodo. |
| `totalPages` | `number` | Páginas conectadas activas (`FacebookPage.IsActive = true`). |
| `totalScheduledPosts` | `number` | Targets de publicación pendientes en la ventana (`PostTargetStatus.Pending`). |
| `averageUsage` | `number` | Promedio de requests por usuario activo (`requests / usuariosActivos`). |
| `churn` | `number` | Porcentaje de churn del periodo (`cancelaciones / baseActivaInicio * 100`). |
| `arpu` | `number` | Ingreso promedio por suscripción activa (proxy por precio de plan). |

### 4.4 `trends` (`AdminOverviewTrendsDto`)

Cada propiedad contiene `AdminMetricTrendDto`.

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `change` | `number` | Diferencia absoluta: `actual - comparativo`. |
| `changePercent` | `number` \| `null` | `(change / comparativo) * 100`; `null` cuando comparativo = 0. |
| `isPositive` | `boolean` | Si la variación es favorable para UI (en `churn`, bajar cuenta como positivo). |

### 4.5 `period` (`AdminOverviewPeriodDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `from` | `string` (ISO 8601) | Inicio del periodo actual. |
| `to` | `string` (ISO 8601) | Fin del periodo actual. |
| `compareFrom` | `string` (ISO 8601) | Inicio del periodo comparativo. |
| `compareTo` | `string` (ISO 8601) | Fin del periodo comparativo. |

---

## 5. Códigos HTTP y errores

| Código | Cuándo |
|--------|--------|
| **200** | Cálculo de métricas correcto. |
| **401** | Sin autenticación o JWT inválido / expirado (pipeline estándar). |
| **403** | Usuario autenticado pero **no** cumple `InternalOnly`. |

No hay `404` en este endpoint porque no recibe ids en ruta.

---

## 6. Origen de datos de negocio

El cálculo usa consultas agregadas sobre:

- `ApiRequestLog` (actividad para usuarios activos y uso promedio)
- `FacebookPage` (páginas conectadas)
- `PostTarget` (posts programados)
- `Subscription` y `Plan` (churn y ARPU)

Este endpoint solo **consulta**; no modifica datos.

---

## 7. Referencias en código

- Controlador: `DataColor.Api/Controllers/AdminMetricsController.cs` → `GetOverview`.
- Servicio: `DataColor.Infrastructure/Services/AdminMetricsService.cs` → `GetGlobalOverviewAsync`.
- Interfaz: `DataColor.Core/Interfaces/IAdminMetricsService.cs`.
- DTOs: `DataColor.Core/DTOs/AdminMetricsDtos.cs`.
- Registro DI: `DataColor.Api/Program.cs`.
- Política Internal: `Program.cs` → `AddAuthorization` → política `"InternalOnly"` (`userType` = Internal).
