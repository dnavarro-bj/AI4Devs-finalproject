# Design: trabajo-por-lote

## Contexto

`plant_event.batch_id` existe desde T-20 (`V13`), mapeado de solo lectura (`insertable = false`) y con índice parcial, pero **sin clave foránea**: nadie lo escribe y el test lo fija por SQL. Las lecturas (`care_record`) no tienen columna de lote y la cronología las lee con una rama propia del `UNION`. Las tres acciones tienen sus factorías de dominio con reloj inyectado —`CareRecord.record`, `PlantIntervention.record`, `PlantComment`— y `PlantEventService.addIntervention` / `addComment` las orquestan. T-22 resolvió ya el patrón «una operación que escribe en N plantas»: **calcular el alcance con el mismo código que se previsualiza, validar el registro antes de escribir y hacerlo todo en una transacción** (`TaskService.complete`). Este change generaliza ese patrón y lo desacopla de la tarea.

**Dependencia:** `alertas-con-ciclo-de-vida` usa `V16`; este change toma `V17`. Si se aplicara antes, se toma el siguiente número libre.

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Prototipo `plants` | Barra de selección con «Crear tarea», «Mover», «Etiquetar», «Más acciones» | Se añaden las tres acciones de lote. «Mover» y «Etiquetar» siguen marcados; «Más acciones» no se construye. |
| Ticket | «A plantas seleccionadas, a todas las de una localización o al resultado de un filtro guardado» | Los tres alcances. «Filtro guardado» se cubre con la consulta del inventario, que es lo que **es** una vista guardada (T-21); no hace falta que la vista exista. |
| Ticket | «El número exacto de plantas afectadas se muestra antes de guardar» | `POST /batches/preview`: el número lo da el servidor, con la misma consulta que luego escribe. |
| Ticket | «Cada planta afectada recibe su evento, conservando que fue una sola operación» | Un registro por planta y el `batch_id` común; la operación es una fila de `batch`. |
| F.2 | «Registrar un cuidado (riego) sobre todos los cactus de una ubicación» | La lectura de lote lleva las mismas medidas que la individual, el riego incluido. |
| Prototipo `location-detail` | No tiene acción de lote | Se añade «Registrar en toda la localización» (F.2 la pone como ejemplo canónico); apartarse del prototipo por falta de pieza. |

## Decisiones

**1. El alcance es un valor con tres formas y un solo resolutor.** `BatchScope` (`Plants`, `Location`, `Query`) se resuelve en una única función a un conjunto ordenado de ids de **plantas en curso**, que usan `preview` y `apply`. Es la garantía de que el número declarado es el número escrito. `Query` se interpreta con `PlantCriteria.fromQuery` —la misma validación que el listado y las vistas guardadas— y reutiliza `PlantService.specification`, de modo que «todas las del filtro» no recorre una página ni se transcribe a ids en el cliente: **con 486 resultados viaja una cadena, no 486 identificadores**. Una `Location` se resuelve con `LocationHierarchy.subtreeIds` y `byLocations`, como el alcance de una tarea.

**2. La operación es una fila.** `batch(id, action, scope_kind, plant_count, occurred_at, created_at/updated_at)`, con `action` ∈ `lectura|intervencion|comentario` y `scope_kind` ∈ `plantas|localizacion|consulta`. Se persiste **solo lo que no se puede deducir**: el tipo de alcance y el número real. **No se guardan los ids de las plantas**: están en los eventos, por `batch_id`. `plant_count` se escribe en la misma transacción que los eventos y por eso es exacto; es lo que permite el `batchSize` de la cronología y colapsar el lote en la actividad reciente (`dashboard-operativo`) sin recontar.

**3. `batch_id` gana clave foránea y deja de ser de solo lectura.** En `plant_event` se quita `insertable = false` (lo anunciaba su comentario) y la migración añade la FK. `care_record` gana la columna con su FK e índice parcial. **Solo `BatchService` la asigna**: las altas directas y las de una tarea no aceptan `batchId`, igual que `taskId` solo lo pone completar. La FK es sin cascada: borrar una lectura, un comentario o una intervención de un lote **no** toca la operación (su `plant_count` es lo que se hizo, no lo que sobrevive).

**4. Se reutilizan las factorías, no se duplica ninguna regla.** `apply` valida construyendo el registro de la **primera planta** antes de escribir —lo que hizo `complete` de tareas— y falla con `400` sin haber tocado nada; después escribe en bloques de 100 con `save` por planta. Una lectura sin medidas, una intervención con un dato ajeno o un comentario en blanco se rechazan **por las mismas reglas** que en el alta individual. El instante común es `occurredAt` (por defecto, el del `Clock`), con la misma holgura de «no futuro».

**5. Acotado y sin truncar, como la exportación.** `BATCH_MAX_PLANTS` (2.000 por defecto: el techo de la colección) responde `422` con el número y el máximo, tanto en la previsualización como al aplicar. Es la misma lectura del límite que `EXPORT_MAX_ROWS` (ADR-017): nunca se aplica «a las primeras N» en silencio. Un lote de 2.000 son 2.000 inserciones en una transacción: del orden de segundos, sin bloquear el inventario; si fuese un problema, la salida es `INSERT … SELECT`, y no se anticipa.

**6. `batchSize` va en la entrada de la cronología, sin consulta por fila.** Los registros se cargan por tipo ya con su `batch` relacionado (`@BatchSize`, como `task`), y `toEntry()` lo traduce a `batchId` y `batchSize`. Es lo que permite la leyenda «En un lote de 31 plantas» sin una petición por entrada.

**7. La selección ampliada es un modo, no una lista.** El inventario guarda `selected: string[]` (la página) y una marca `allResults`. Con la marca, el alcance enviado es `{ kind: 'query', query }` construida con `plantsDraft(...)` —la misma función que ya produce la consulta de las vistas guardadas y de la exportación— y el recuento es el de la previsualización. **Cambiar cualquier filtro vacía la selección y la marca**: una selección «de todo el resultado» no puede sobrevivir a un resultado que ya no es el mismo. `UiSelectionBanner` es la pieza visual (ADR-014), y la usará cualquier tabla con selección ampliable.

**8. Un diálogo, tres acciones, los campos de su alta.** `BatchDialog` compone los campos de `CareRecordForm`, del diálogo de intervención y del de comentario, **extrayendo su cuerpo** a componentes sin diálogo ni planta (`…Fields`) si hoy no existen, para que alta individual y lote compartan campos y validación, y no puedan divergir. El número y las exclusiones salen del composable del diálogo (`useBatch`), que llama a la previsualización al abrir y al cambiar las exclusiones. Con un alcance que es una consulta no hay lista que excluir: se explica en el diálogo («para dejar plantas fuera, selecciona una a una»).

## Riesgos / compromisos

* **El mismo registro para todas.** Visible en el diálogo y en el spec; la salida es excluir y registrar aparte.
* **No hay «deshacer el lote».** Equivocarse es borrar registros uno a uno desde sus fichas. Un lote de 31 equivocado es incómodo; se mitiga con el número declarado antes de guardar y la confirmación, que es lo que pide el ticket. Si resultase doloroso, deshacer es un caso de uso nuevo sobre `batch_id`, no un cambio del modelo.
* **La consulta como alcance puede cambiar entre el diálogo y la confirmación.** Entre abrir y guardar alguien puede mover plantas; `apply` recalcula y devuelve el `plantCount` real, que el aviso final muestra. Es el mismo margen aceptado en completar tareas.
* **La FK de `plant_event.batch_id` sobre datos previos.** No hay ninguna fila con `batch_id` (nadie lo escribía), y la migración lo verifica antes de añadirla.
* **Cuerpos de formulario compartidos.** Extraerlos toca el alta individual; los tests de las tres altas existentes son la red.
