# Proposal: alertas-con-ciclo-de-vida

**Ticket:** [T-23](../../../docs/tickets/T-23-alertas.md) — completo. Recoge la mitad de T-06 que quedó pendiente.
**Historias:** [1.15](../../../docs/user-stories/1.15-gestionar-alertas.md); consume [1.10](../../../docs/user-stories/1.10-crear-y-programar-una-tarea.md) y [1.13](../../../docs/user-stories/1.13-completar-una-tarea.md) (tarea desde alerta y completar)
**Pantalla del prototipo:** `alerts` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html); además el bloque de alertas del Dashboard (`dashboard`), la ficha de la localización (`location-detail`) y el aviso de la ficha del ejemplar (`plant-detail`)
**Producto:** §17 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md); resuelve §24.10

## Why

La alerta es hoy una maqueta: `alerts.mock.ts` con un modelo marcado **provisional**, tarjetas cuyos botones «Revisar», «Descartar» y «Crear tarea» no cambian nada, un filtro «Origen» deshabilitado y cinco sitios más de la aplicación (Dashboard, ficha del ejemplar, inventario, mapa y ficha de la localización) que dicen «dato de ejemplo hasta T-23». Una colección de cientos de plantas necesita que la incidencia **exista**: que se detecte sola cuando una lectura sale de su rango, que se pueda revisar, resolver o descartar dejando constancia, y que no se pierda entre avisos repetidos.

El invariante que organiza el change es el de §17 y de la historia 1.15: **alerta ≠ tarea ≠ cuidado**. Una alerta señala un riesgo; la tarea es la acción planificada para atenderlo; el cuidado es lo que ocurrió. Crear una tarea desde una alerta **no** la resuelve, y completar esa tarea **propone** resolverla sin hacerlo por su cuenta. Descartar no es resolver.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change (§24.10):

* **Los cinco orígenes entran**: medición fuera de rango, incidencia manual, recomendación de IA, planta sin revisar y cuidado vencido.
* **La detección de lecturas e IA es síncrona**, al escribir la lectura (`POST /care-records`) y al generarse la recomendación; sin infraestructura nueva para esos dos orígenes.
* **Sin duplicados**: mientras haya una alerta abierta de la misma condición, una nueva detección **no abre otra**: actualiza la fecha de última detección, suma una ocurrencia y la **severidad escala** con ellas.
* **El enlace con las tareas entra completo**, apoyándose en `tareas-modelo-y-api` y `tareas-agenda-y-pantallas` como ya aplicadas (la migración `V15` existe) aunque sin archivar.

**Supuesto a confirmar.** «Planta sin revisar» y «cuidado vencido» son condiciones **de tiempo**: nadie escribe nada cuando ocurren, así que **no se pueden detectar al escribir una lectura**. Este change las evalúa con **un proceso programado diario** (`@Scheduled`), idempotente por la misma regla anti-duplicados. Es la única pieza de infraestructura nueva y se puede apagar por configuración. Si se prefiere no introducir un *scheduler* ahora, esos dos orígenes se recortan y quedan marcados; el resto del change no cambia.

## What Changes

**Esquema** — migración `V16` (tras `V15__tasks`): `alert` y `alert_transition`; `origin_alert_id` nulable en `task` y el origen `alerta` en su `CHECK`.

**Backend**

* **`GET /alerts`**, paginado (ADR-009) y con filtros combinables (ADR-016): estado y severidad repetibles, origen, categoría, planta, localización (con `includeDescendants`) y orden por claves públicas. **`GET /alerts/{id}`** trae su historial de transiciones y las tareas que nacieron de ella.
* **Alerta manual**: `POST /alerts` sobre **una planta o una localización**, con categoría, severidad, motivo y acción recomendada.
* **Ciclo de vida**: `POST /alerts/{id}/review`, `/resolve` y `/dismiss`, con comentario opcional. `nueva → revisada`, `nueva|revisada → resuelta | descartada`; resuelta y descartada son finales y una transición no admitida es `409`. **Cada transición queda registrada** con su instante, y **la apertura es la primera**.
* **Detección de medición**: al registrar una lectura, cada medida con rango se compara con el **rango efectivo del ejemplar** (con sus cuidados propios). Fuera de rango abre o actualiza una alerta de temperatura, humedad o luz; la severidad parte de cuánto se aleja del rango.
* **Recomendación de IA**: una recomendación de riesgo `high` o `medium` **enriquece** la alerta abierta de la lectura —su motivo y su acción recomendada— o, si no hay ninguna, abre una de origen `recomendacion_ia`. La IA nunca es el único mecanismo.
* **Sin duplicados con escalada**: una alerta abierta por ejemplar (o localización), origen y categoría —lo defiende un índice único parcial—; cada nueva detección **acumula ocurrencias** y sube la severidad por umbrales de configuración.
* **Proceso programado**: `sin_revisar` (ejemplar en curso sin ninguna observación en N días) y `cuidado_vencido` (tarea pendiente vencida desde hace N días). Una detección por alerta y día.
* **Tarea desde una alerta**: `POST /tasks` admite `originAlertId`; la tarea queda enlazada (`origin = alerta`) y la alerta **no cambia de estado**. Completar esa tarea devuelve **qué alerta se propone resolver**; resolverla es una llamada aparte.
* **Cronología**: `GET /plants/{id}/timeline` gana el tipo **`alerta`** —apertura, revisión, resolución y descarte, una entrada por transición— leído de `alert_transition`, sin copiarlo.
* **Lo que se sirve para sustituir la maqueta**: el recuento de alertas abiertas y su mayor severidad por **localización** y la **atención** de cada fila del inventario.

**Frontend**

* **`/alerts`** deja de ser maqueta: tarjetas reales con sus acciones —«Revisar», «Resolver», «Descartar» con comentario, «Crear tarea»—, filtros de estado, severidad, **localización y origen** (el origen se habilita), paginación y «ocurrencias» visibles.
* **Dashboard**: las alertas y su cifra salen del API; desaparece el aviso de maqueta.
* **Ficha del ejemplar**: el aviso de revisión pendiente es su alerta abierta más grave, con enlace a la bandeja; las alertas aparecen en la cronología.
* **Inventario**: la columna de atención es real. **Mapa y ficha de la localización**: el recuento y el bloque de alertas son reales.
* **Completar una tarea con alerta de origen** ofrece resolverla, nunca la resuelve sola.
* **Crear tarea desde una alerta** abre el formulario de tareas con tipo, título, destino y prioridad precompletados.

## Capabilities

### New Capabilities

- `alerts`: la alerta con su ciclo de vida, su detección, su escalada y su bandeja.

### Modified Capabilities

- `care-records`: registrar una lectura dispara la detección de medición.
- `ai-recommendations`: una recomendación de riesgo alto o medio enriquece u origina una alerta.
- `plant-timeline`: el tipo `alerta`.
- `tasks`: el origen `alerta` y el enlace con ella.
- `plant-dashboard`: Dashboard, ficha y bandeja con alertas reales.
- `catalogs`: recuento de alertas por localización.
- `plant-inventory`: la atención de cada ejemplar en el listado.

## Non-goals

* **Resolver sola una alerta** cuando una lectura vuelve al rango o una tarea se completa: la condición pudo no resolverse (§17 y 1.15). La alerta se cierra siempre por una persona.
* **Reabrir** una alerta resuelta o descartada: si la condición reaparece, nace una alerta nueva con su propio historial.
* **Notificaciones** (correo, push) y **responsable** de la alerta: no hay usuarios (F.14).
* **Umbrales configurables desde la interfaz** o en una tabla de ajustes: viven en configuración de la aplicación; la pantalla de configuración es de T-29.
* **Alertas de telemetría continua** (sensores): la detección se hace con lecturas manuales y se pensará con F.4.
* **Alertas sobre varias plantas a la vez** o por cuidados vencidos de tareas de **varias** plantas expresas: una tarea así ya se ve vencida en la agenda y el Dashboard; solo se alerta de tareas de una planta o de una localización.
* **Detección de acidez (pH) y de riego** por rango: la especie no tiene rango de pH ni de cantidad de agua.
* **Filtro y orden de «atención» en el inventario**: se sirve y se muestra el dato; filtrar y ordenar por él queda marcado.
* **Acciones por lote sobre alertas** y el trabajo por lote: T-24.

## Impact

* `backend/src/main/resources/db/migration/V16__alerts.sql`; `domain/` (`Alert`, `AlertTransition`, enums, reglas de severidad y escalada), `application/` (servicios de alertas y de detección, el proceso programado, DTOs; ajustes en `CareRecordService`, `RecommendationService`, `TaskService`, `PlantTimelineService`), `infrastructure/persistence/` (consultas de alertas, la rama de la unión de la cronología), controllers y configuración (`cactify.alerts.*`). Tests con Testcontainers.
* `frontend/` — `src/features/alerts/` (service real, composable, mapper, diálogos), `app/pages/alerts/index.vue`, `app/pages/index.vue`, `app/pages/plants/[id]/index.vue`, `app/pages/plants/index.vue`, `app/pages/locations/index.vue` y `[id]/index.vue`, la cronología y el formulario de tareas; se borran `alerts.mock.ts` y `MOCK_NOTICE`.
* `docs/diagramas/modelo-datos-actual.md` y el borrador de tareas y alertas, `README.md`, el ticket T-23 y la historia 1.15; §24.10 en el documento de producto.
* **Orden de aplicación:** `tareas-modelo-y-api` y `tareas-agenda-y-pantallas` se archivan **antes** que este change, porque sus deltas sobre `tasks` y `plant-dashboard` se apoyan en lo que ellos crean.
