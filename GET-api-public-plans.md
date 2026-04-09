# GET `/api/public/plans` — Construcción técnica

Documento de referencia para desarrollo: cómo está implementado el endpoint público para mostrar el **catálogo de planes disponibles** a potenciales clientes.

---

## 1. Resumen

| Aspecto | Detalle |
|--------|---------|
| **Método y ruta** | `GET /api/public/plans` |
| **Proyecto API** | `DataColor.Api` |
| **Controlador** | `PublicPlansController` → acción `GetAvailablePlans` |
| **Servicio** | `IPublicPlanService` → `PublicPlanService.ListAvailablePlansAsync` (`DataColor.Infrastructure`) |
| **Autenticación previa** | **No** (endpoint público) |
| **Autorización** | `[AllowAnonymous]` |
| **Cuerpo** | Ninguno |
| **Entrada** | Sin query params |
| **Respuesta exitosa** | `200 OK` con `ApiResponse<object>` y `data = { plans, count }` |
| **Errores típicos** | No define errores de validación propios; ante fallas internas aplica manejo global de errores |

Ruta: `[Route("api/public/plans")]` + `[HttpGet]` → `/api/public/plans`.

Swagger/OpenAPI: etiqueta **Public - Plans**.

---

## 2. Flujo de capas

1. El cliente invoca `GET /api/public/plans` sin JWT.
2. `PublicPlansController.GetAvailablePlans` llama al servicio `IPublicPlanService`.
3. `PublicPlanService.ListAvailablePlansAsync` consulta tabla `Plans` en modo solo lectura:
   - filtra solo `IsActive = true`;
   - ordena por plan default primero y luego por nombre;
   - proyecta al DTO público.
4. El controlador responde `Ok(new ApiResponse<object>(new { Plans, Count }))`.

---

## 3. Contrato de salida (`200 OK`)

Envoltorio: `ApiResponse<object>` (serialización JSON en camelCase).

`data` contiene:

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `plans` | `array` | Lista de planes activos disponibles públicamente |
| `count` | `number` | Total de planes en `plans` |

### 3.1 Estructura actual de cada plan (`PublicPlanDto`)

| Propiedad (JSON) | Tipo | Descripción |
|------------------|------|-------------|
| `code` | `string` | Código único del plan |
| `name` | `string` | Nombre comercial |
| `description` | `string` | Descripción del plan |
| `isDefault` | `boolean` | Indica si es el plan por defecto |
| `isPaid` | `boolean` | Indica si es de pago |
| `price` | `number` \| `null` | Precio del plan (`null` para plan gratuito o no definido) |

Nota: `isActive` no se expone en la salida porque el endpoint ya filtra internamente solo planes activos.

Con este contrato actual alcanzan cards simples de pricing, pero no alcanza para secciones de "límites + features" de una landing comercial.

### 3.2 Contrato recomendado (extensión para frontend de planes)

Para el contexto de DataColor se recomienda agregar estos campos opcionales:

- `displayOrder` para controlar orden desde backend.
- `currency` y `billingPeriod` para soportar precio/cadencia.
- `limits` estructurado por plan.
- `features` como `string[]` listo para renderizar, o como estructura para formateo en frontend.

#### 3.2.1 Ejemplo recomendado de plan completo

```json
{
  "code": "pro",
  "name": "Plan Pro",
  "description": "Plan para equipos en crecimiento",
  "isDefault": false,
  "isPaid": true,
  "price": 29.99,
  "currency": "USD",
  "billingPeriod": "month",
  "displayOrder": 2,
  "limits": {
    "pages": 5,
    "users": 3,
    "scheduledPosts": 100,
    "apiCalls": 10000
  },
  "features": [
    "5 Páginas",
    "3 Usuarios",
    "100 Posts programados",
    "10,000 llamadas API/mes"
  ]
}
```

#### 3.2.2 Alternativa recomendada (features estructuradas)

```json
{
  "features": [
    { "key": "pages", "label": "Páginas", "value": 5, "unit": "pages" },
    { "key": "users", "label": "Usuarios", "value": 3, "unit": "users" },
    { "key": "scheduledPosts", "label": "Posts programados", "value": 100, "unit": "posts" },
    { "key": "apiCalls", "label": "Llamadas API/mes", "value": 10000, "unit": "calls" }
  ]
}
```

Sugerencia para compatibilidad: mantener el contrato actual y versionar por ampliación (campos nuevos opcionales), sin breaking changes.

### 3.3 Ejemplo de respuesta actual (implementación vigente)

```json
{
  "data": {
    "plans": [
      {
        "code": "free",
        "name": "Plan Gratuito",
        "description": "Plan básico para iniciar",
        "isDefault": true,
        "isPaid": false,
        "price": null
      },
      {
        "code": "pro",
        "name": "Plan Pro",
        "description": "Plan para equipos en crecimiento",
        "isDefault": false,
        "isPaid": true,
        "price": 29.99
      }
    ],
    "count": 2
  },
  "requiresReauth": false,
  "meta": null
}
```

---

## 4. Criterios de selección y orden

Consulta aplicada sobre `Plans`:

- Solo registros con `IsActive = true`.
- Orden:
  1. `IsDefault` primero.
  2. `Name` ascendente.

Esto permite mostrar primero el plan recomendado/default y luego el resto en orden alfabético.

---

## 5. Códigos HTTP

| Código | Cuándo |
|--------|--------|
| **200** | Respuesta correcta (incluye casos sin datos: `plans: []`, `count: 0`) |
| **500** | Error interno no controlado por el endpoint (manejo global) |

---

## 6. Archivos clave

| Archivo | Rol |
|---------|-----|
| `DataColor.Api/Controllers/PublicPlansController.cs` | Endpoint HTTP público |
| `DataColor.Core/Interfaces/IPublicPlanService.cs` | Contrato de servicio |
| `DataColor.Infrastructure/Services/PublicPlanService.cs` | Consulta y proyección de planes públicos |
| `DataColor.Core/DTOs/PublicPlanDtos.cs` | DTOs de salida |
| `DataColor.Api/Program.cs` | Registro DI de `IPublicPlanService` |

---

*Documento alineado con la implementación actual del repositorio.*
