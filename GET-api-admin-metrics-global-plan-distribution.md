# GET `/api/admin/metrics/global/plan-distribution` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementada la **distribución global por plan** para dashboard administrativo, usando filtros temporales opcionales por query string.

Cubre el bloque de UI: **Distribución por Plan**.

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/admin/metrics/global/plan-distribution` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `AdminMetricsController` → acción `GetPlanDistribution` |
| **Servicio** | `IAdminMetricsService` → `AdminMetricsService.GetGlobalPlanDistributionAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **Sí:** `Authorization: Bearer <JWT>` válido |
| **Autorización** | Política **`InternalOnly`** (`userType` = Internal). Sin el claim adecuado → **403**. |
| **Cuerpo** | Ninguno |
| **Entrada** | Query string (`from`, `to`; ambos opcionales). |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data` = `AdminGlobalPlanDistributionResult` |
| **Errores típicos** | `401` (no autenticado / token inválido), `403` (no Internal) |

Ruta: `[Route("api/admin/metrics/global")]` + `[HttpGet("plan-distribution")]` → `/api/admin/metrics/global/plan-distribution`.

Swagger/OpenAPI: etiqueta **Admin - Metrics**.

---

## 2. Flujo de capas

1. El pipeline de ASP.NET Core valida JWT y aplica `[Authorize(Policy = "InternalOnly")]`.
2. `GetPlanDistribution` recibe parámetros `[FromQuery]` y construye `AdminGlobalPlanDistributionFilter`.
3. `AdminMetricsService.GetGlobalPlanDistributionAsync`:
   - Resuelve ventana temporal (`from`/`to`) con defaults.
   - Selecciona suscripciones vigentes en la ventana.
   - Agrupa por plan.
   - Calcula `count` y `percentage` por plan.
4. El controlador responde `Ok(new ApiResponse<object>(result))`.

---

## 3. Contrato de entrada (query)

Todos los parámetros son opcionales.

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `from` | `DateTime?` | `to - 30 días` | Inicio del periodo (UTC). |
| `to` | `DateTime?` | `DateTime.UtcNow` | Fin del periodo (UTC). |

Reglas:

- Si `from > to`, el servicio intercambia ambos valores.
- Si no se envían, se toma una ventana de 30 días hacia atrás.

Ejemplo:

`GET /api/admin/metrics/global/plan-distribution?from=2026-03-01T00:00:00Z&to=2026-03-31T23:59:59Z`

---

## 4. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en **camelCase**).

El objeto en `data` corresponde a **`AdminGlobalPlanDistributionResult`** (`DataColor.Core/DTOs/AdminMetricsDtos.cs`).

### 4.1 Ejemplo de cuerpo

```json
{
  "data": {
    "plans": [
      { "plan": "free", "count": 120, "percentage": 48.0 },
      { "plan": "pro", "count": 95, "percentage": 38.0 },
      { "plan": "enterprise", "count": 35, "percentage": 14.0 }
    ],
    "total": 250,
    "period": {
      "from": "2026-03-01T00:00:00Z",
      "to": "2026-03-31T23:59:59Z"
    }
  },
  "requiresReauth": false,
  "meta": null
}
```

### 4.2 Campos de `data`

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `plans` | `array` | Elementos `AdminPlanDistributionItemDto`. |
| `total` | `number` | Total de suscripciones consideradas en la distribución. |
| `period` | `object` | Ventana temporal efectiva usada por el cálculo. |

### 4.3 Cada elemento de `plans` (`AdminPlanDistributionItemDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `plan` | `string` | Código de plan normalizado (`PlanCode` en minúsculas). Si no hay valor, se devuelve `unknown`. |
| `count` | `number` | Cantidad de suscripciones del plan dentro de la ventana. |
| `percentage` | `number` | Porcentaje del plan sobre `total`, redondeado a 2 decimales. |

### 4.4 `period` (`AdminPlanDistributionPeriodDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `from` | `string` (ISO 8601) | Inicio efectivo del periodo. |
| `to` | `string` (ISO 8601) | Fin efectivo del periodo. |

---

## 5. Códigos HTTP y errores

| Código | Cuándo |
|--------|--------|
| **200** | Cálculo correcto. Si no hay datos: `plans: []`, `total: 0`. |
| **401** | Sin autenticación o JWT inválido / expirado (pipeline estándar). |
| **403** | Usuario autenticado pero **no** cumple `InternalOnly`. |

No hay `404` en este endpoint porque no recibe ids por ruta.

---

## 6. Regla de cálculo usada

La distribución considera suscripciones **vigentes en la ventana**:

- `StartDate <= to`
- `EndDate` nulo **o** `EndDate >= from`

Luego:

- Se agrupa por `PlanCode` normalizado.
- `count` = cantidad de suscripciones por grupo.
- `percentage` = `count / total * 100`.

---

## 7. Origen de datos

Este endpoint consulta:

- `Subscription` (plan y vigencia temporal).

Solo lectura; no modifica datos.

---

## 8. Referencias en código

- Controlador: `DataColor.Api/Controllers/AdminMetricsController.cs` → `GetPlanDistribution`.
- Servicio: `DataColor.Infrastructure/Services/AdminMetricsService.cs` → `GetGlobalPlanDistributionAsync`.
- Interfaz: `DataColor.Core/Interfaces/IAdminMetricsService.cs`.
- DTOs: `DataColor.Core/DTOs/AdminMetricsDtos.cs`.
- Política Internal: `Program.cs` → `AddAuthorization` → política `"InternalOnly"` (`userType` = Internal).
