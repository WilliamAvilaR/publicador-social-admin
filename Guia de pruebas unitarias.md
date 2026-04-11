# Plan y guía de pruebas — publicador-social-admin

## Normativa del proyecto (obligatoria)

En este proyecto, la **línea base oficial** para pruebas unitarias e integración interna en Angular es **exclusivamente**:

- **Vitest** como runner (API de pruebas: `describe`, `it` / `test`, `expect`, `vi.fn()`, etc.).
- **Angular `TestBed`** como entorno de pruebas del framework.
- **`HttpTestingController`** para pruebas de servicios que usan `HttpClient`.

**No** se deben introducir en este proyecto nuevas pruebas unitarias o de integración interna escritas o ejecutadas con herramientas distintas de esa línea (otros runners del front, u otras APIs de aserción o spies en `.spec.ts` que no sean las de Vitest). El repositorio está configurado para **una sola** forma de ejecutar y escribir estos tests; el detalle de dependencias y target `test` está en `package.json` y `angular.json`.

---

Documento de referencia para el equipo: consolida criterios de calidad, organización y prioridades, alineado con **Vitest** como runner, **Angular `TestBed`** como entorno de pruebas del framework y **`HttpTestingController`** para HTTP simulado.

---

## 1. Línea base técnica

| Pieza | Rol |
|--------|-----|
| **Vitest** | Ejecuta los tests, reporta resultados y ofrece API moderna (`describe`, `it`/`test`, `expect`, `vi.fn()` para mocks). No sustituye las APIs de Angular: se integra con ellas. |
| **`TestBed`** (`@angular/core/testing`) | Crea el entorno Angular: inyección de dependencias, compilación de componentes, overrides y lifecycle de pruebas. Es la base para servicios y componentes. |
| **`HttpTestingController`** (`@angular/common/http/testing`) | Intercepta y responde peticiones HTTP sin red real; valida método, URL, cabeceras y cuerpo. Imprescindible para servicios que usan `HttpClient`. |

Convención de imports en cada `.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
```

Para tests que solo usan lógica pura (utilidades sin Angular), puede omitirse `TestBed` y usar solo Vitest.

**Entorno:** en proyectos Angular recientes, las pruebas sin navegador suelen ejecutarse en **Node con jsdom**, lo que favorece velocidad en el ciclo diario. El modo navegador de **Vitest** queda como opción cuando haga falta un entorno más cercano al browser.

---

## 2. Principio de organización

- Los archivos de prueba **viven junto al código** que ejercitan: mismo directorio, mismo nombre base y sufijo **`.spec.ts`** (convención Angular).
- La estructura del proyecto se orienta al **dominio** (`core`, `features`, `shared`), no a “carpeta de tests”; las pruebas son una capa transversal pegada a cada pieza.

En este repositorio, eso implica por ejemplo:

- `src/app/core/services/auth.service.ts` → `auth.service.spec.ts`
- `src/app/core/guards/auth.guard.ts` → `auth.guard.spec.ts`
- Componentes bajo `features/.../components/...` → `.spec.ts` al lado de cada `.component.ts`

---

## 3. Mapa del proyecto (qué conviene probar)

Estructura relevante actual:

- **`src/app/core`**: autenticación (`auth.service`, `auth.guard`, `auth.interceptor`), OAuth Facebook, ajustes de usuario, tema, traducción.
- **`src/app/features/auth`**: login.
- **`src/app/features/dashboard`**: shell del dashboard y overview.
- **`src/app/features/admin`**: clientes (`tenants.service`, listas y detalle), planes (`plans.service`, listas y formulario), soporte (`support.service`), métricas (`metrics.service`), administración general (`admin.service`), catálogo de features (`features.service`).
- **`src/app/shared/utils`**: utilidades de formulario, errores y validación.

**`app.config.ts`** concentra `provideHttpClient`, interceptores, `ngx-translate` y ECharts; los tests deben **proveer solo lo necesario** en `TestBed` (o sustituir dependencias según §13), no replicar toda la app salvo en tests de integración acotados.

**Rutas** (`app.routes.ts`): rutas lazy, `authGuard` en `/dashboard` y hijos (clientes, planes, soporte, métricas). Los guards y la navegación merecen pruebas con `RouterTestingModule` / `provideRouter` y stubs según el caso.

---

## 4. Plan de pruebas por prioridad (sugerido)

Orden recomendado para ir cubriendo valor con esfuerzo razonable:

1. **Servicios HTTP (alto impacto)**  
   `AuthService`, `TenantsService`, `PlansService`, `SupportService`, `MetricsService`, `AdminService`, `FeaturesService`, y demás que llamen a API.  
   Patrón: `TestBed.configureTestingModule` con `provideHttpClient()` + `provideHttpClientTesting()`, inyectar `HttpTestingController`, hacer `expectOne` / `match` y verificar cuerpos y errores.

2. **Interceptor y guard**  
   - `auth.interceptor`: que añada cabeceras o maneje errores según reglas del código.  
   - `auth.guard`: acceso permitido/denegado según token o estado simulado.

3. **Utilidades puras**  
   `form.utils.ts`, `error.utils.ts`, `validation.utils.ts`: tests directos con Vitest, sin DOM ni HTTP.

4. **Componentes con lógica o formularios**  
   Login, formularios de planes, listas con filtros, etc.: `TestBed` + `ComponentFixture`, detección de cambios, eventos de plantilla, estados de carga/error.

5. **Integración interna acotada** (ver §5): flujos donde varias piezas Angular colaboran **sin backend real**; no sustituye E2E ni debe convertirse en un test end-to-end mal planteado.

---

## 5. Niveles de alcance (misma base de tests, distinto radio)

**Integración interna (definición operativa):** prueba en la que **varias piezas del propio Angular** (servicios, guards, interceptores, router, componentes) **interactúan entre sí** usando **dobles de prueba** (HTTP fake, servicios sustituidos, router de pruebas), **sin** levantar el API real ni el navegador como producto final. No es “solo unit test” de una función suelta, ni es E2E: es el punto medio para validar cableado y reglas compartidas.

| Nivel | Qué es | Ejemplo en este proyecto |
|--------|--------|---------------------------|
| **Unitario (lógica)** | Una pieza con dependencias mínimas o puras | `validation.utils`, funciones sin DOM |
| **Componente** | Plantilla + clase: inputs/outputs, formularios, clicks | `LoginComponent`, `PlanFormComponent` |
| **Integración interna** | Varias piezas Angular juntas, sin backend real | Mismo `TestBed` con **servicio + `auth.interceptor`** y `HttpTestingController`; guard con **`RouterTestingHarness`** o `provideRouter` + estado de auth simulado |

Evitar dos extremos poco útiles: **solo** tests microscópicos que nunca combinan lo que producción combina, o **tests enormes** que duplican E2E (mejor E2E dedicado). La integración interna cubre el hueco entre ambos.

“Integración” aquí no implica otro repositorio como en backend .NET: es **integración dentro del frontend** con dependencias simuladas.

---

## 6. HTTP: reglas mínimas con `HttpTestingController`

El HTTP de red se considera **externo**: aquí el mock oficial del framework es **`HttpTestingController`** (no “inventar” `fetch` mockeado a mano salvo casos muy aislados). Detalle de otras dependencias: §13.

- Tras cada test que dispare peticiones, llamar a **`httpMock.verify()`** en `afterEach` para asegurar que no quedan requests sin manejar.
- Para cada llamada al servicio, esperar **`expectOne(url)`** o **`match()`** según corresponda y responder con `req.flush(...)`.
- Probar al menos: **éxito**, **error HTTP** (4xx/5xx) y, si aplica, **timeouts** o cancelaciones.

---

## 7. Separación: unitarios/componentes vs E2E

- **Unitarios, componente e integración interna** viven en este workspace, en `.spec.ts` junto al código.
- **E2E** (recorridos completos de usuario contra la app desplegada o entorno de integración) suelen ir en **proyecto o carpeta aparte** (p. ej. Playwright/Cypress), porque validan el producto end-to-end, no una clase aislada.

---

## 8. Política de calidad (equipo)

- **Obligatorio considerar tests** al introducir o cambiar: lógica de negocio en servicios, guards, interceptores, formularios críticos y flujos de error.
- **Cobertura global**: el porcentaje solo de proyecto no debe ser el único objetivo; importan **qué** está cubierto (ver §8.1).
- **Evitar** invertir en exceso en código puramente declarativo o presentacional sin lógica.

### 8.1 Criterios de cobertura obligatoria por tipo

Estos criterios **aterrizan** la política: definen expectativas mínimas por capa. Los umbrales numéricos concretos pueden fijarse en CI (§14); aquí la regla de negocio es **obligatoriedad relativa**, no “un solo % para todo”.

| Tipo de código | Expectativa de cobertura | Notas |
|----------------|---------------------------|--------|
| **Servicios** (sobre todo HTTP / dominio) | **Alta**: líneas y ramas relevantes (éxito, error, casos límite) | Sin cubrir solo constructores vacíos; sí contratos de API y errores. |
| **Guards e interceptors** | **Obligatoria**: comportamiento principal y al menos un caso de negación o error | Son puntos de seguridad y efectos globales; regresión costosa. |
| **Componentes críticos** (auth, formularios alta, flujos admin) | **Media–alta** en lógica y plantilla interactiva | No hace falta perseguir 100 % en HTML estático. |
| **Utils / pipes / validadores puros** | **Completa** o casi completa: poca superficie, alto valor | Fácil de mantener y detecta regresiones silenciosas. |
| **Componentes puramente presentacionales** | Según impacto; **no obligatorio** al máximo nivel | Priorizar los que concentran riesgo de bug UX o negocio. |

**Frase clave:** la cobertura de código **no sustituye** el análisis de riesgo funcional ni la revisión de requisitos: un % alto en piezas equivocadas o aserciones débiles puede dar falsa seguridad.

---

## 9. Angular CLI y ejecución

- Antes de cambiar el **target de tests** o las dependencias del runner, el equipo debe **validar la versión instalada del Angular CLI** (`npx ng version` o `package.json`) y contrastarla con la **documentación oficial de esa versión** para unit testing. No asumir nombres de builder ni flags de una versión mayor o menor.
- **Versión de referencia para este repositorio:** alineada al workspace actual — **Angular y CLI 19.2.x** (como en `package.json`). Cualquier subida de versión mayor debe revisarse de nuevo (breaking changes en el target `test`).
- La ejecución habitual es **`ng test`** (y, para CI, el comando acordado sin watch, p. ej. `npm run test:ci` si está definido en `package.json`). El detalle del builder y de `vite.config.ts` / `tsconfig.spec.json` vive en el propio repositorio.
- Mantener **`tsconfig.spec.json`** alineado con Vitest: por ejemplo tipos **`vitest/globals`** (y los que requiera el setup de tests).

---

## 10. Estado del suite en el repositorio

- La **línea base** del proyecto es **Vitest + TestBed + `HttpTestingController`**, reflejada en la configuración del workspace (`angular.json`, `package.json`, `vite.config.ts`, `src/test-setup.ts`, `tsconfig.spec.json`).
- Los **`.spec.ts`** se añaden de forma incremental según prioridades del §4 y la política del §8; no hay un segundo runner ni un segundo estilo de aserciones/spies para tests unitarios en este front.

---

## 11. Recordatorio conceptual (Vitest y Angular)

Vitest **no reemplaza** el sistema de pruebas de Angular: **Angular define** cómo probar componentes, servicios, HTTP y routing; Vitest **ejecuta** esas pruebas y ofrece una experiencia de desarrollo rápida y actual. Esa combinación es la dirección moderna recomendada en las guías recientes del ecosistema Angular.

---

## 12. Definition of Done (DoD) — testing

Un desarrollo (feature o corrección) se considera **completo** en términos de testing cuando, además del código y la revisión funcional:

1. Existen pruebas automáticas alineadas con el **tipo de cambio** (§8.1): nuevos o alterados servicios/guards/interceptors con tests; utils tocadas con casos; componentes críticos con cobertura acordada al riesgo.
2. Las dependencias externas siguen la **estrategia de mocks** (§13), sin acoplar tests a implementaciones frágiles innecesarias.
3. **`ng test`** (o el comando acordado) **pasa en local** antes de integrar.
4. No se introducen tests que dependan del **backend real** o de red no controlada en unit/integration interna (salvo tests explícitamente etiquetados y fuera del pipeline estándar, si algún día se acuerdan).
5. Si el cambio afecta contratos HTTP, hay aserciones sobre **URL, método y cuerpo** (o errores) con `HttpTestingController` donde aplique.

El DoD puede endurecerse por sprint o por módulo (p. ej. todo lo tocado en `core/auth` exige tests de guard + interceptor).

---

## 13. Estrategia de mocks (consistencia entre equipos)

Objetivo: que **todos los desarrolladores mockeen igual** en lo esencial y se evite caos de “cada uno su estilo”.

| Clase de dependencia | Enfoque recomendado | Herramientas típicas |
|----------------------|---------------------|----------------------|
| **Llamadas HTTP / API** | Mock **del canal HTTP**, no del servicio entero, salvo que se quiera aislar solo el cliente con otro enfoque explícito | `HttpTestingController` + `provideHttpClientTesting()` |
| **Servicios de aplicación inyectados** (otro `Injectable`) | Preferir **test doubles**: **stub** (implementación mínima predecible) o **spy/mock** con comportamiento fijado | `TestBed.overrideProvider(Svc, { useValue: { ... } })`, o `vi.fn()` en métodos expuestos |
| **Dependencias Angular** (router, `ActivatedRoute`, `Location`) | Usar **APIs de testing del framework** (router de prueba, valores fake) en lugar de mockear clases internas de Angular | `provideRouter`, `RouterTestingHarness`, `ActivatedRoute` con `of(...)` / snapshot fake |
| **Datos de dominio** (DTOs, respuestas JSON) | **Factories o builders** reutilizables en carpeta de test (p. ej. `*.test-data.ts` junto al feature o en `testing/`) para no duplicar literales gigantes | Funciones `buildUser()`, `buildLoginResponse(overrides?)` |

**Reglas rápidas:**

- **No** mockear el framework cuando existe un soporte oficial de testing para el mismo caso.
- **Sí** sustituir servicios que disparan efectos secundarios (navegación real, storage) por dobles **controlados**.
- Para **observables**, preferir datos deterministas (`of`, `throwError` / `throw` según RxJS) en stubs.

---

## 14. Integración con CI/CD

El desarrollo local no basta para calidad **enterprise**: el pipeline debe **repetir** las mismas reglas.

| Práctica | Recomendación |
|----------|----------------|
| **Ejecución automática** | En cada PR/push a ramas protegidas: ejecutar `npm test` / `ng test` en modo **CI** (sin watch; una pasada determinista). |
| **Bloqueo** | Un fallo en tests **bloquea merge** o build de artefacto (política del equipo: rama principal, release, etc.). |
| **Cobertura** | Generar reporte (HTML o resumen en log); opcionalmente publicar en el job (artifact o servicio de CI). |
| **Umbrales (opcional)** | Definir **thresholds** mínimos por globales o por carpeta (`core/**` más estricto) cuando el suite esté maduro; hasta entonces, priorizar **tests obligatorios por tipo** (§8.1) sobre un % único. |

Detalles concretos (YAML, runner self-hosted vs cloud) quedan fuera de este documento y se versionan en el repositorio de infraestructura o plantilla de pipeline del proyecto.

---

## 15. Estilo y APIs de Vitest en `.spec.ts`

Para mantener un solo estilo en todo el repositorio:

| Tema | Recomendación |
|------|----------------|
| **Aserciones y estructura** | Usar **`expect`**, **`describe`**, **`it`/`test`**, **`beforeEach`/`afterEach`** importados de **`vitest`** (o disponibles como globales si el proyecto las define así en `tsconfig.spec.json`). |
| **Spies y mocks** | Preferir **`vi.spyOn`**, **`vi.fn()`**, **`vi.mock()`** de Vitest en lugar de utilidades de otros runners. |
| **Coherencia por archivo** | Un solo estilo de imports y de mocks dentro de cada `.spec.ts`; reutilizar patrones del §13 para HTTP y servicios. |
| **Cambios de configuración** | Cualquier cambio en `vite.config.ts`, `src/test-setup.ts` o target `test` debe revisarse en conjunto (romper tests de muchos módulos a la vez es fácil si no se coordina). |

---

## Índice de secciones

(Lista con numeración automática en Markdown: todas las entradas usan `1.` para que el renderizado renumeré al añadir o reordenar ítems.)

1. Línea base técnica
1. Principio de organización
1. Mapa del proyecto
1. Plan por prioridad
1. Niveles de alcance e integración interna
1. HTTP (`HttpTestingController`)
1. Separación vs E2E
1. Política de calidad y **8.1** cobertura por tipo
1. Angular CLI
1. Estado del suite en el repositorio
1. Recordatorio Vitest + Angular
1. Definition of Done (testing)
1. Estrategia de mocks
1. CI/CD
1. Estilo y APIs de Vitest en `.spec.ts`
