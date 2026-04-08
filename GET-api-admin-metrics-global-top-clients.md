# GET `/api/admin/metrics/global/top-clients` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementado el **ranking global de clientes por uso** para dashboard administrativo.

Cubre en UI: bloque **Top Clientes por Uso**.

El endpoint devuelve:

- `name`
- `plan`
- `posts`
- `pages`

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/admin/metrics/global/top-clients` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `AdminMetricsController` → acción `GetTopClients` |
| **Servicio** | `IAdminMetricsService` → `AdminMetricsService.GetGlobalTopClientsAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **Sí:** `Authorization: Bearer <JWT>` válido |
| **Autorización** | Política **`InternalOnly`** (`userType` = Internal). Sin el claim adecuado → **403**. |
| **Cuerpo** | Ninguno |
| **Entrada** | Query string (`from`, `to`, `limit`; opcionales). |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data` = `AdminGlobalTopClientsResult` |
| **Errores típicos** | `401` (no autenticado / token inválido), `403` (no Internal) |

Ruta: `[Route("api/admin/metrics/global")]` + `[HttpGet("top-clients")]` → `/api/admin/metrics/global/top-clients`.

Swagger/OpenAPI: etiqueta **Admin - Metrics**.

---

## 2. Flujo de capas

1. El pipeline de ASP.NET Core valida JWT y aplica `[Authorize(Policy = "InternalOnly")]`.
2. `GetTopClients` recibe parámetros `[FromQuery]` y construye `AdminGlobalTopClientsFilter`.
3. `AdminMetricsService.GetGlobalTopClientsAsync`:
   - Resuelve periodo efectivo (`from`/`to`) con defaults.
   - Calcula `posts` por tenant en el periodo.
   - Calcula `pages` activas por tenant.
   - Construye ranking por uso.
4. El controlador responde `Ok(new ApiResponse<object>(result))`.

---

## 3. Contrato de entrada (query)

Todos los parámetros son opcionales.

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `from` | `DateTime?` | `to - 30 días` | Inicio del periodo (UTC). |
| `to` | `DateTime?` | `DateTime.UtcNow` | Fin del periodo (UTC). |
| `limit` | `int` | `10` | Máximo de clientes a devolver. El servicio limita entre `1` y `100`. |

Reglas:

- Si `from > to`, el servicio intercambia ambos.
- Si no se envían fechas, se usa una ventana de 30 días.

Ejemplo:

`GET /api/admin/metrics/global/top-clients?from=2026-03-01T00:00:00Z&to=2026-03-31T23:59:59Z&limit=10`

---

## 4. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en **camelCase**).

El objeto en `data` corresponde a **`AdminGlobalTopClientsResult`** (`DataColor.Core/DTOs/AdminMetricsDtos.cs`).

### 4.1 Ejemplo de cuerpo

```json
{
  "data": {
    "items": [
      { "name": "Tenant A", "plan": "pro", "posts": 140, "pages": 9 },
      { "name": "Tenant B", "plan": "enterprise", "posts": 126, "pages": 11 },
      { "name": "Tenant C", "plan": "free", "posts": 88, "pages": 4 }
    ],
    "count": 3,
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
| `items` | `array` | Elementos `AdminTopClientItemDto`. |
| `count` | `number` | Cantidad de filas devueltas en `items`. |
| `period` | `object` | Periodo efectivo utilizado para el cálculo. |

### 4.3 Cada elemento de `items` (`AdminTopClientItemDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `name` | `string` | Nombre del cliente (tenant). |
| `plan` | `string` | Plan actual del tenant (`Tenant.PlanCode`). |
| `posts` | `number` | Cantidad de posts del tenant en el periodo. |
| `pages` | `number` | Cantidad de páginas activas asociadas al tenant. |

---

## 5. Orden del ranking

El ranking se ordena en servidor por:

1. `posts` descendente
2. `pages` descendente
3. `name` ascendente

Luego se aplica `limit`.

---

## 6. Códigos HTTP y errores

| Código | Cuándo |
|--------|--------|
| **200** | Ranking calculado correctamente (puede venir vacío: `items: []`). |
| **401** | Sin autenticación o JWT inválido / expirado (pipeline estándar). |
| **403** | Usuario autenticado pero **no** cumple `InternalOnly`. |

No hay `404` en este endpoint porque no recibe ids por ruta.

---

## 7. Origen de datos

El cálculo usa:

- `Tenant` (name, plan).
- `UserTenant` (vinculación usuario-tenant).
- `PostPlan` + `PostTarget` (posts por tenant en periodo).
- `FacebookPage` (páginas activas por tenant).

Solo lectura; no modifica datos.

---

## 8. Referencias en código

- Controlador: `DataColor.Api/Controllers/AdminMetricsController.cs` → `GetTopClients`.
- Servicio: `DataColor.Infrastructure/Services/AdminMetricsService.cs` → `GetGlobalTopClientsAsync`.
- Interfaz: `DataColor.Core/Interfaces/IAdminMetricsService.cs`.
- DTOs: `DataColor.Core/DTOs/AdminMetricsDtos.cs`.
- Política Internal: `Program.cs` → `AddAuthorization` → política `"InternalOnly"` (`userType` = Internal).
