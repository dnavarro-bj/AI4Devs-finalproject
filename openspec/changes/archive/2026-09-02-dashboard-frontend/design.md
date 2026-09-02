## Context

Ver [proposal.md](proposal.md) — *Why*. Lo que condiciona el diseño es el estado real de las dos mitades:

* **El backend del MVP está terminado y su contrato es intocable aquí.** T-01 a T-04 y T-08 están archivados. Existen `GET/POST /plants`, `GET /plants/{id}`, `PUT /plants/{id}/tags`, `GET/POST /locations`, `GET/POST /tags`, `POST/GET /species`, `GET/PUT/DELETE /species/{id}`, `POST/GET /plants/{id}/care-records` y `POST/GET /plants/{id}/care-records/{careRecordId}/recommendation`. Los listados vienen en el envelope `PageResponse` (`content`, `totalElements`, `totalPages`, `pageNumber`, `pageSize`) con `page` y `size`, 25 por defecto y 500 como máximo recortado en silencio ([ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md)). Los errores traen `{status, error, message, path}` desde `ApiExceptionHandler`, que cubre 400, 404, 409 y 502; **no hay manejador de último recurso**, así que lo imprevisto sale con el cuerpo por defecto de Spring, sin `message`. Los identificadores viajan como cadena decimal ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)).
* **`PlantSummaryResponse` no trae rangos ni tags**: solo `id`, `nickname`, `createdAt`, `location` y `species` reducida (`SpeciesSummaryResponse`). Los rangos y los tags solo están en `GET /plants/{id}` (`PlantDetailResponse` → `SpeciesCareResponse`).
* **El catálogo de especies sigue el mismo patrón que el inventario**: `GET /species` devuelve `PageResponse<SpeciesSummaryResponse>` —`id`, `scientificName` y `commonName`, **sin rangos**—, y los seis límites más `wateringGuideline` están únicamente en `GET /species/{id}` (`SpeciesCareResponse`, el mismo DTO que ya viaja dentro de `GET /plants/{id}`). T-08 lo decidió así a propósito, para no cargar seis rangos por cada fila de una página de 25.
* **El frontend está en blanco.** `frontend/app` tiene un único `app.vue` con `<NuxtWelcome />`; `package.json` no tiene `devDependencies` ni script `test`. `nuxt.config.ts` ya declara `runtimeConfig.public.apiBaseUrl` y ya carga `@pinia/nuxt`: se reutilizan.
* **El `Dockerfile` instala con `yarn install --frozen-lockfile`**: cualquier dependencia nueva obliga a regenerar `yarn.lock` en el mismo commit o la imagen deja de construirse.
* **`docker-compose.yml` fija `NUXT_PUBLIC_API_BASE_URL: http://localhost:8080`.** Es cierto en el navegador del anfitrión y falso dentro del contenedor del frontend, donde el backend es `http://backend:8080`.

## Goals / Non-Goals

**Goals:**

* Poner en pie el andamiaje del frontend (enrutado, acceso al API tipado, estado, runner de tests) de forma que T-06 y T-07 lo extiendan sin rehacerlo.
* Consumir el contrato publicado tal cual está, sin redefinirlo ni tocar el backend más allá del CORS.
* Que el flujo alta → lectura → recomendación se complete sin recarga manual y con estados de carga y error en todas sus llamadas.

**Non-Goals (de diseño; el alcance funcional está en el proposal):**

* Un sistema de diseño, tokens visuales o librería de componentes.
* Renderizado en servidor de los datos del API (ver decisión 2).
* Caché, revalidación o sincronización optimista más allá de refrescar lo que la acción acaba de cambiar.
* Tests end-to-end con navegador real.

## Decisions

### Decisión 1 — El catálogo de especies ya está publicado, y los rangos se piden al seleccionar

El selector de especie del alta necesita nombre y rangos. Cuando se escribió este change no había `SpeciesController` ni `GET /species`: T-02 lo había dejado como Non-goal apoyándose en las tres especies de `V2__seed.sql`, y la decisión original fue resolverlo en un change previo aparte en lugar de absorber backend aquí.

**Ese change previo existe y está archivado**: `api-especies` (T-08) publicó el catálogo completo —`POST/GET /species` y `GET/PUT/DELETE /species/{id}`—, cerrando las historias 0.3 y 0.6. Este change lo consume como contrato ya publicado y **no toca backend por este motivo**.

**Decisión**: el selector se puebla con `GET /species` —que trae solo `id`, `scientificName` y `commonName`— y, al seleccionarse una especie, se piden sus rangos con `GET /species/{id}`, que devuelve `SpeciesCareResponse`. Son **dos llamadas**, no una: la ficha de la especie no viaja en el listado.

Es la contrapartida buscada del diseño de T-08, no un descuido suyo: su decisión 2 rechazó devolver los rangos en el listado porque el formulario solo necesita los de la especie **seleccionada**, no los de las 25 de la página, y meterlos habría inflado cada página y atado el contrato del listado a todos los campos de cuidado. El coste es una llamada corta por cambio de selección, contra seis rangos por fila en cada página.

*Alternativas descartadas en su momento, que siguen descartadas*: **absorber `GET /species` aquí** —mezclaba backend y frontend en un change que ya es grande y difuminaba de qué ticket deriva; lo resolvió T-08—; **embeber las semillas en el frontend** —duplica el dato, se rompe en cuanto alguien añada una especie y contradice la historia 0.3, que exige que los rangos vengan del catálogo—.

*Alternativa descartada ahora*: **pedir la ficha de todas las especies al abrir el formulario**, para tener los rangos en memoria y que el cambio de selección sea instantáneo. Serían N llamadas por adelantado para usar una; el `GET /species/{id}` bajo demanda se cachea en el composable y basta.

**La administración de especies —alta, edición y borrado— tiene API desde T-08 pero no tendrá pantalla aquí**: no está en los criterios de aceptación de T-05, y el proposal la mantiene como Non-goal.

### Decisión 2 — El navegador llega al backend por CORS abierto, y los datos se piden desde el cliente

No hay ninguna configuración de CORS en `backend/src` ni en `application.yml`, así que hoy el navegador no puede consumir el API desde `:3000`.

**Decisión**: se habilita **CORS para cualquier origen** en el backend, con un `WebMvcConfigurer` en `infrastructure` (es configuración del transporte, no una regla de negocio: `domain` y `application` no se enteran, conforme a [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md)), aplicado a todas las rutas, con los métodos y cabeceras que el API usa y **sin credenciales** —el MVP no tiene autenticación ni cookies, y `allowCredentials` es incompatible con el comodín de origen—.

Como consecuencia directa, **las llamadas al API se hacen desde el cliente, no en SSR**: `NUXT_PUBLIC_API_BASE_URL` es `http://localhost:8080`, que dentro del contenedor del frontend no resuelve al backend. Se usa una única URL, válida en el navegador, y las páginas piden sus datos ya montadas. El CORS resuelve el acceso; el renderizado en servidor de datos remotos queda fuera.

*Alternativas descartadas*: **proxy de Nitro** (`/api/*` reenviado a la URL interna) — resolvería navegador y SSR con una sola URL y sin tocar el backend, pero el usuario lo descarta explícitamente; **desdoblar `runtimeConfig`** en URL pública e interna — mantiene el SSR pero duplica variables por entorno y sigue necesitando CORS; **CORS restringido a una lista de orígenes por variable** — más correcto para producción, pero añade configuración por entorno que el MVP no necesita y que el propio ADR deja como evolución.

**Esta decisión es transversal**: afecta a cómo cualquier cliente alcanza el API y a cómo se piden datos en todo el frontend. Se promociona a **[ADR-013] Acceso del navegador al API** (ADR-010 ya está ocupado por fechas y auditoría; el primer número libre es el 013), y se añade su resumen a `openspec/config.yaml`.

### Decisión 3 — Runner de tests: Vitest con `@nuxt/test-utils`, y ADR-005 se enmienda

[ADR-005](../../../docs/adr/ADR-005-tdd.md) impone TDD pero no distingue frontend de backend, y en el frontend no hay hoy ni runner ni script `test`. Sin runner, los escenarios WHEN/THEN de la spec no pueden escribirse antes que el código y el change entero se saltaría el ADR.

**Decisión**: **Vitest** con `@nuxt/test-utils`, `@vue/test-utils` y un entorno DOM (`happy-dom`), como `devDependencies`, con script `test` y `test:watch` en `package.json`. Es el runner que Nuxt 4 documenta y soporta de serie, comparte configuración con el build y arranca lo bastante rápido para un ciclo rojo-verde. Los tests montan componentes y páginas con el cliente HTTP doblado; **no** se levanta el backend.

**Esto no abre un ADR nuevo**: se registra como **enmienda a ADR-005** —"en el frontend, los tests de los escenarios se escriben con Vitest y `@nuxt/test-utils`"—, siguiendo el precedente de T-02, que enmendó ADR-006 en lugar de duplicarlo. Un ADR-014 sólo para nombrar un runner no aportaría una decisión de arquitectura.

*Alternativas descartadas*: **Jest** — fuera del ecosistema de Vite que Nuxt usa, obliga a un pipeline de transformación paralelo; **sólo tests end-to-end (Playwright/Cypress)** — no permiten el ciclo rojo-verde fino que pide ADR-005 y necesitan la pila entera levantada; **no poner runner y validar a mano** — incumple ADR-005 directamente.

Es el **primer bloque de `tasks.md`**: sin runner instalado no hay forma de escribir el primer test en rojo.

### Decisión 4 — Ficha mínima en `/plants/[id]`, con el flujo completo dentro

T-06 (historial y alertas) presupone una ficha de detalle que todavía no existe, y los criterios de aceptación de T-05 —rangos visibles antes de guardar la lectura, y recomendación de esa lectura— piden un sitio donde vivan juntos.

**Decisión**: se construye `/plants/[id]` con cabecera (nickname, localización, tags), bloque de rangos de la especie, formulario de nueva lectura y bloque de recomendación. **Sin historial y sin alertas**: son T-06, que amplía esta misma página. La navegación queda `/` → redirección a `/plants` (listado + alta) → `/plants/[id]`.

*Alternativas descartadas*: **reservar ya el hueco de historial y alertas** con componentes vacíos — trabajo por adelantado para un ticket cuyo diseño aún no está cerrado; **hacerlo todo en modales sobre el listado** — evitaría solapar con T-06, pero los rangos y los tags sólo están en `GET /plants/{id}`, así que habría que pedir el detalle igualmente, y la navegación se reharía entera en T-06.

### Decisión 5 — Una capa de acceso al API tipada, con el contrato en un solo sitio

**Decisión**: un módulo `app/types/api.ts` con los tipos del contrato publicado (`PageResponse<T>`, `PlantSummary`, `PlantDetail`, `SpeciesCare`, `Location`, `Tag`, `CareRecord`, `Recommendation`, `ApiError`) y un composable `useApi()` que envuelve `$fetch` con `apiBaseUrl` de `runtimeConfig.public` y traduce el fallo a un error propio con el `message` del cuerpo uniforme cuando lo haya, y a un mensaje genérico cuando no —el caso de lo que escapa a `ApiExceptionHandler` y sale con el cuerpo por defecto de Spring, sin `message`—. Encima, un composable por recurso (`usePlants`, `useCareRecords`, `useRecommendation`, `useCatalogs`).

**Todos los identificadores se tipan `string`.** Son TSID por encima de `2^53`; tipados como `number` se corromperían en silencio, y el tipo es la única barrera que lo impide ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)). Ningún punto del cliente hace `Number(id)` ni aritmética sobre un identificador.

**Los listados se consumen siempre como `PageResponse`, nunca como array plano**, y la paginación se envía como `page` y `size`. El cliente **no fija `size`**: deja el valor por defecto del servidor (25) en lugar de duplicar una configuración que vive en `application.yml`.

*Alternativas descartadas*: **`useFetch`/`useAsyncData` directamente en cada página** — repite el manejo de errores en cada llamada y ata el componente a la forma del transporte; **un cliente generado desde OpenAPI** — no hay especificación OpenAPI publicada y generarla es otro ticket; **tipos `any`** — anula justo la garantía que hace falta con los identificadores.

### Decisión 6 — Estado: un store de Pinia para el inventario, estado local para los formularios

**Decisión**: `@pinia/nuxt` ya está cargado, así que se usa. Un store `plants` guarda la página actual del inventario y la planta abierta, para que volver del detalle al listado no vuelva a pedirlo todo y para que el alta pueda insertar la planta creada sin recargar. Los formularios (alta, lectura) y el estado de la recomendación —cargando, error, resultado— viven en el componente: son efímeros y no los comparte nadie.

*Alternativas descartadas*: **todo en Pinia** — mete estado efímero de formulario en un store global sin ganar nada; **nada en Pinia, sólo estado de página** — obliga a repedir el inventario en cada navegación y complica el "sin recarga manual" que pide el criterio de aceptación 1.

### Decisión 7 — La recomendación se consume tal cual la publica el API

Conviene dejarlo escrito porque la premisa contraria circulaba: los cuatro campos **sí están persistidos**. `V5__ai_recommendation_constraints.sql` añadió `recommended_action` y `priority` a `ai_recommendation`, y `RecommendationResponse` expone `id`, `careRecordId`, `riskLevel`, `explanation`, `recommendedAction`, `priority` y `createdAt`.

**Decisión**: el frontend consume esos campos directamente, con `riskLevel` y `priority` tipados como uniones de literales (`'low' | 'medium' | 'high'` y `'immediate' | 'soon' | 'routine'`), que es lo que garantizan los `CHECK` de la migración.

*Alternativa descartada*: **aislar la recomendación tras un tipo propio defensivo**, por si algún campo no estuviera persistido — no hay tal hueco; la indirección sería complejidad sin motivo.

### Decisión 8 — Estilos: CSS propio mínimo, y los badges de riesgo se dejan para T-06

**Decisión**: CSS con ámbito de componente y unas pocas variables en un layout único. **Ninguna dependencia de estilos nueva**: cada una obliga a regenerar `yarn.lock` y a mantenerla. El nivel de riesgo y la prioridad se muestran como texto legible en un elemento con su clase (`risk--low` / `risk--medium` / `risk--high`), de modo que T-06 convierta esa clase en un badge de color sin tocar el marcado.

*Alternativas descartadas*: **Tailwind o un kit de componentes** — dependencia nueva, lockfile y curva, para una interfaz que el proposal declara sobria; **estilos globales sin ámbito** — chocarán con lo que añada T-06.

## Risks / Trade-offs

* **CORS abierto a cualquier origen** → El API queda accesible desde cualquier página web. En el MVP no hay autenticación, ni datos personales, ni cookies de sesión, así que no hay nada que un origen ajeno pueda hacer que no pudiera hacer con `curl`. **Mitigación**: ADR-013 recoge explícitamente que, en cuanto entre autenticación o el despliegue salga de local, la lista de orígenes pasa a configurarse por variable de entorno.
* **Sin renderizado en servidor de los datos** → La primera pintura no trae contenido y hay un parpadeo de carga. **Mitigación**: estados de carga explícitos, que la spec exige de todos modos; si más adelante el SSR importa, el proxy de Nitro descartado en la decisión 2 sigue siendo la salida y sólo afecta a `useApi()`.
* **El selector de especie necesita una segunda llamada por selección** (`GET /species/{id}`), porque el listado no trae los rangos → un salto al API cada vez que el usuario cambia de especie en el alta. **Mitigación**: el composable del catálogo cachea por `id` las fichas ya pedidas, de modo que volver a una especie ya vista no repite la llamada; el volumen del MVP hace irrelevante el resto.
* **`yarn.lock` y `--frozen-lockfile`** → Añadir el runner de tests y no regenerar el lockfile rompe la imagen del frontend, y el fallo aparece en `docker compose up --build`, lejos de donde se causó. **Mitigación**: la regeneración del lockfile va en la misma tarea que la instalación de dependencias, y una tarea final verifica que la imagen construye.
* **Las páginas necesitan dos llamadas** (listado + detalle) porque `PlantSummaryResponse` no trae rangos ni tags → Más viajes al API. **Mitigación**: es el contrato publicado y no se toca; el volumen del MVP lo hace irrelevante.
* **Solape con T-06** → La ficha crece en T-06 con historial y alertas. **Mitigación**: la decisión 4 delimita qué se construye ahora, y la 8 deja preparada la clase del nivel de riesgo.

## Migration Plan

No hay migración de datos: **el esquema no cambia** y la última aplicada es `V6__species_constraints.sql`, que llegó con T-08. El despliegue local sigue siendo `docker compose up --build` desde `iac/local/`; el cambio de CORS entra con la imagen del backend y el frontend con la suya. Revertir es revertir el commit: nada queda persistido.

## Open Questions

Ninguna que afecte a las specs, al enfoque o al desglose de tareas. La forma de `GET /species` ya la cerró `api-especies` (T-08) y está recogida en la decisión 1.
