# Proposal: trabajo-por-lote

**Ticket:** [T-24](../../../docs/tickets/T-24-dashboard-operativo-y-trabajo-por-lote.md) — **1 de 2**: el trabajo por lote. Lo sigue `dashboard-operativo`.
**Historias:** [F.2](../../../docs/user-stories/F.2-registrar-cuidados-por-lote.md); sirve a [1.16](../../../docs/user-stories/1.16-consultar-el-dashboard-operativo.md) (acción rápida «registrar un cuidado por lote»)
**Pantallas del prototipo:** `plants` (la barra de selección `#selection-bar`), `location-detail` y `dashboard` (acciones rápidas) en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §5.1 y §4.2 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

Con 500–2000 ejemplares registrar planta a planta deja de ser viable: regar una bandeja de 31 es 31 formularios. F.2 lo llama «la funcionalidad más representativa del problema real» y la dejó fuera del MVP. Hoy la selección múltiple del inventario solo sabe **crear una tarea** (T-22) y «Mover», «Etiquetar» y todo lo demás está marcado como T-24. Además `plant_event.batch_id` existe desde T-20 **sin que nadie lo escriba**, justamente para este change.

El invariante es el del ticket: cada planta afectada recibe **su evento**, y queda constancia de que **fue una sola operación**.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **Acciones que entran:** **registrar una lectura** (el riego y las demás medidas), **registrar una intervención** y **añadir un comentario**. Mover y etiquetar quedan fuera.
* **La operación se persiste** como una entidad mínima, `batch`: su tipo, el número de plantas y el instante. Los eventos llevan su `batch_id` con clave foránea.
* **Los alcances del ticket entran los tres:** plantas seleccionadas, todas las de una localización y el resultado de un filtro.

## What Changes

**Esquema** — migración `V17` (la siguiente libre tras `V16` de `alertas-con-ciclo-de-vida`): tabla `batch`; `plant_event.batch_id` gana su FK a `batch`; `care_record` gana `batch_id` con la suya.

**Backend**

* **`POST /batches/preview`** devuelve **cuántas plantas afectaría** un alcance, sin escribir nada. El alcance es **una lista de plantas**, **una localización** (con sus sublocalizaciones, si se pide) o **una consulta de inventario** —la misma *query string* canónica del listado, validada con los mismos criterios—. Solo cuentan las plantas **en curso**.
* **`POST /batches`** aplica una acción —`reading`, `intervention` o `comment`— a ese alcance, con `excludedPlantIds` opcional, **en una transacción**: un registro por planta incluida, todos con el mismo `batch_id` y el mismo instante, y una fila en `batch`. Si algo falla, no queda nada. Las reglas de cada registro son las de su alta individual. Un alcance mayor que `BATCH_MAX_PLANTS` (2.000 por defecto) responde `422`, nunca se trunca.
* **`GET /batches/{id}`** devuelve la operación.
* **Cronología**: las lecturas pasan a poder llevar `batchId`, y toda entrada de lote trae además **`batchSize`**, el número de plantas de su operación.

**Frontend**

* **Barra de selección del inventario**: «Registrar lectura», «Registrar intervención» y «Añadir comentario» sobre lo seleccionado, junto a «Crear tarea».
* **Seleccionar todo el resultado**: con la página entera marcada y más resultados que filas, un aviso ofrece «Seleccionar los N resultados». El alcance pasa a ser **la consulta**, no una lista de ids.
* **Diálogo de lote**: dice el alcance antes de guardar —«Se registrará en **31 plantas**»— con el número que devuelve el servidor, permite excluir excepciones cuando el alcance es una lista, pide los datos de la acción con los mismos campos que el alta individual, y al terminar avisa de a cuántas se aplicó.
* **Ficha de la localización**: «Registrar en toda la localización», con el alcance en su descendencia a elección.
* **Fichas de planta**: las entradas de la cronología que vienen de un lote lo dicen («En un lote de 31 plantas»).
* **Kit**: `UiSelectionBanner`, el aviso «seleccionadas las N de esta página — seleccionar las M del resultado».

## Non-goals

* **Mover y etiquetar por lote**: el movimiento por lote atómico ya existe por localización; conectarlo a la selección y escribir un `batch_id` en `plant_movement` no se pidió. **Etiquetar** no genera evento en la cronología, y el ticket exige un evento por planta. Siguen marcados.
* **«Completar varias» tareas**: acción por lote sobre tareas; siguen marcadas.
* **Editar o deshacer un lote**: cada registro se corrige o se borra como cualquier otro; no hay «deshacer el lote».
* **Un registro distinto por planta**: el mismo registro va a todas las incluidas; si una necesita otro, se excluye y se registra aparte.
* **Cambiar el estado de varias plantas**, **floraciones** por lote y **lotes recurrentes**.
* **Una pantalla de lotes**: la operación se ve en las cronologías y, después, en la actividad reciente del Dashboard.
* **Las plantas archivadas**: no entran nunca en un lote.
