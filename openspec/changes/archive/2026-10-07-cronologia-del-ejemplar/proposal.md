# Proposal: cronologia-del-ejemplar

**Ticket:** [T-20](../../../docs/tickets/T-20-cronologia-unificada.md) — completo. Sustituye a T-06.
**Historias:** [0.5](../../../docs/user-stories/0.5-consultar-historial-de-cuidados.md), [1.4](../../../docs/user-stories/1.4-comentarios-cronologicos.md), [1.5](../../../docs/user-stories/1.5-registrar-floraciones-reales.md), [1.6](../../../docs/user-stories/1.6-registrar-intervenciones.md); consume el movimiento de [1.9](../../../docs/user-stories/1.9-mover-plantas-entre-localizaciones.md)
**Pantalla del prototipo:** `plant-detail` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html) (secciones «Historial completo» y «Floración»)
**Producto:** §7.3, §10, §12 y §13.2 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

La ficha del ejemplar enseña hoy una cronología **híbrida**: las lecturas son reales, pero comentarios, floraciones y movimientos salen de una maqueta marcada con T-20, y los cambios de estado viven aparte, en «Datos». Para una colección de cientos de plantas la historia de cada una es lo que se consulta —qué se le hizo, cuándo floreció, dónde estuvo, qué se observó—, y hoy solo se puede anotar una cosa: una medida. No hay dónde escribir «pequeña marca en el lado oeste», ni un trasplante, ni una floración.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **La fertilización es una intervención**, con producto y notas, no un insumo dosificado en `CareRecord`. Cierra el pendiente del ticket. `CareRecord` no se toca y el riego se queda dentro (decisión vigente).
* **Los comentarios se pueden editar y borrar**, marcando «editado» (§24.8). Sin historial de versiones.
* **El lote entra solo como columna**: el evento lleva un `batchId` opcional y la cronología lo muestra, pero **no hay endpoint masivo**; el registro por lote lo estrena T-24, donde nace la selección múltiple.
* **Un solo change** para todo el ticket.

## What Changes

**Esquema** — migración `V13` (V12 es de `localizaciones-jerarquicas`, de la que este change **depende**, porque la cronología incluye sus movimientos): `plant_event` —la espina: planta, tipo, instante y `batch_id` opcional— y tres satélites, `plant_comment`, `plant_intervention` y `plant_bloom`, cada uno con sus restricciones en la base.

**Backend**

* **`GET /plants/{id}/timeline`**: la cronología unificada, **paginada** (ADR-009), del más reciente al más antiguo, con filtro repetible `?type=`. Mezcla seis tipos —`lectura`, `cambio_estado`, `movimiento`, `comentario`, `intervencion` y `floracion`— y cada entrada trae el detalle de su tipo. Las lecturas, los cambios de estado y los movimientos **no se migran ni se duplican**: la cronología los lee donde ya viven.
* **Comentarios**: `POST /plants/{id}/comments`, `PUT` y `DELETE` sobre uno. Texto obligatorio, fecha opcional (por defecto, ahora) y nunca futura. Editar marca «editado».
* **Intervenciones**: `POST`, `PUT` y `DELETE`. Tipos `trasplante`, `sustrato`, `tratamiento`, `fertilizacion`, `poda` y `revision`, y **cada tipo admite solo sus datos**: la maceta en un trasplante, la mezcla en un cambio de sustrato, el producto en un tratamiento o una fertilización.
* **Floraciones**: `POST`, `PUT` y `DELETE`. Un intervalo con inicio, fin opcional, estado (`boton`, `en_flor`, `finalizada`), número aproximado de flores y notas. **Puede seguir abierta**; el estado `finalizada` exige fin y solo ella lo admite.
* Registrar o corregir devuelve la entrada de la cronología ya montada, para que el cliente la pinte sin otra petición.

**Frontend**

* La ficha pinta la cronología real, con el filtro por tipo **en el servidor** y «Cargar registros anteriores»; desaparecen los eventos de maqueta. Los eventos nuevos entran sin recargar: lecturas, cambios de estado y los tres que se crean aquí.
* «＋ Añadir» ofrece comentario, intervención y floración, cada uno con su formulario; cada tarjeta permite corregir y retirar lo que es del usuario, y el comentario editado lo dice.
* La pestaña **Floración** lista las floraciones observadas, con su recuento, y permite abrirlas y cerrarlas. «Última floración» de «de un vistazo» deja de ser maqueta.
* El kit: `UiTimeline` admite **filtro controlado desde fuera**, porque con paginación un filtro local solo vería lo cargado.

## Capabilities

### New Capabilities

- `plant-timeline`: la cronología unificada del ejemplar, su paginación, orden y filtros.
- `plant-events`: comentarios, intervenciones y floraciones observadas.

### Modified Capabilities

- `data-model`: la espina de eventos y los tres satélites.
- `plant-dashboard`: la cronología real, los formularios y la pestaña Floración.
- `design-system`: el filtro controlado de la cronología.

## Non-goals

* **Sin endpoint masivo ni selección múltiple** (T-24). `batch_id` queda en el esquema y en la respuesta, sin nadie que lo escriba todavía.
* **Fotografías colgando de un evento**: son de [T-19](../../../docs/tickets/T-19-fotografias.md), que añadirá `plant_media.event_id` sobre esta espina sin migrarla.
* **Alertas y tareas completadas en la cronología**: T-23 y T-22.
* **La telemetría no entra evento a evento**: las lecturas de sensor inundarían el historial. Hoy solo hay lecturas manuales y entran todas.
* **La recomendación de IA no es un evento propio**: sigue pegada a su lectura, como en el prototipo.
* **Sin comparar la floración observada con la esperada de la especie** en pantalla: la ficha de planta no recibe el calendario de la especie, y mezclarlas es justo lo que la historia 1.5 prohíbe. Quedan separadas.
* **Sin historial de ediciones** de un comentario, y sin quién lo hizo (multiusuario, F.14).
* **Sin «cambio relevante de datos» ni «alta en la colección»** como eventos: el alta ya es la fecha de la planta, y auditar cambios de campos es otro asunto.

## Impact

* `backend/src/main/resources/db/migration/V13__plant_timeline.sql`; `domain/` (`PlantEvent` y sus tres satélites, enums), `application/` (servicios de eventos y de cronología, DTOs), `infrastructure/persistence/` (la consulta unificada), controllers. Tests con Testcontainers.
* `frontend/` — nueva feature `src/features/timeline/` (service, composable, mapper, componentes y diálogos), `app/pages/plants/[id]/index.vue`, `UiTimeline` y la galería, `mocks/plantDetail.mock.ts`.
* `docs/diagramas/modelo-datos-actual.md`, el borrador de gestión, `README.md` y el ticket T-20.
