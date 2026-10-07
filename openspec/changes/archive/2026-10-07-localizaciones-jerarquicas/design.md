# Design: localizaciones-jerarquicas

## Contexto

`Location` es hoy `id` + `name`. `GET /locations` ya devuelve el recuento de ejemplares por fila con una consulta agregada, `PUT /plants/{id}` cambia la localización sobrescribiéndola y no deja rastro, y las tres pantallas del prototipo (`locations`, `location-detail`, `location-editor`) están construidas con la jerarquía, el código, las características y los movimientos **marcados con T-18**. Motivación y decisiones de partida del usuario: ver [proposal.md](proposal.md).

## Contraste con el borrador, el wireframe y el ticket

| Fuente | Dice | Este change |
|---|---|---|
| Ticket | «Pendiente: quién mantiene coherente la ruta materializada» | **No hay ruta materializada**: se calcula (decisión 1). El pendiente se disuelve y el ticket se corrige al cerrar. |
| Borrador | `LOCATION.path` materializada; `PLANT_MOVEMENT` colgada de `PLANT_EVENT` | Sin `path`. `plant_movement` es tabla **propia** con su instante; T-20 la enlazará a `PLANT_EVENT` (decisión 5). |
| Borrador | `code`, `locationType`, `capacity`, `operationalNotes`, `environment`, `sunExposure` «propuestos por el frontend» | **Todos entran**; `locationType` con los seis valores del select del prototipo. Cierra pendientes 16 y 17. |
| Wireframe `location-detail` | Portada, métricas (plantas, sublocalizaciones, tareas, alertas), «Dentro de», plantas, características con ocupación, próximo trabajo, últimos movimientos | **Se reproduce.** Tareas, próximo trabajo, alertas y «Crear tarea aquí» siguen marcados (T-22, T-23). |
| Wireframe `locations` | Mapa en árbol + tarjetas de zona | Se reproduce con el árbol real; la marca de T-18 del mapa se retira. |
| Wireframe `location-editor` | Posición, identificación, características, lateral | Se reproduce. Entorno de **tres** valores como en el prototipo (`interior`, `cubierto`, `exterior`). |
| Historia 1.9 | El movimiento aparece en la cronología del ejemplar | **Aplazado a T-20** (no existe cronología); se marca en la ficha. Lo demás entra. |

## Decisiones

**1. La jerarquía es `parent_id`; ruta y recuentos se calculan.** Una sola columna autorreferenciada y consultas `WITH RECURSIVE`. Mover una localización con contenido es un `UPDATE` de una fila y toda ruta y recuento posterior es correcto por construcción: no hay copia que mantener. *Alternativas:* ruta materializada mantenida por el servicio (reescribe todo el subárbol y depende de que nadie olvide pasar por él) o por trigger (lógica de dominio en SQL, contra ADR-006/011). La colección tiene decenas o cientos de localizaciones, no millones: la recursión es barata, y si dejara de serlo, materializar después es aditivo.

**2. Dos consultas por página, no una por fila.** `GET /locations` calcula, para los ids de la página, (a) la ruta subiendo por `parent_id` y (b) los ejemplares totales bajando por `parent_id` y agrupando, más los directos que ya existen. Son consultas nativas en el puerto `LocationRepository`, con una proyección por fila, igual que `countPlantsByLocation` hoy. Un test cuenta las sentencias y exige que no crezcan con las filas (ADR-004, Testcontainers). La consulta recursiva lleva un tope de profundidad como defensa: un ciclo no debería existir, pero si existiera no debe colgar la base.

**3. `Location` es dueña de lo que puede saber; el árbol, no.** Los campos opcionales y el código se validan en `Location` con `require` en `init` y sus métodos (`update`, ADR-011): nombre y código no vacíos, capacidad positiva, `parent` distinto de sí misma. Que el padre **no sea un descendiente** consulta otras filas, así que va en `LocationService` (ADR-011: «las reglas que consultan otras filas siguen en `application`»): sube por los ancestros del padre candidato con la misma consulta recursiva y rechaza si encuentra a la localización editada. `Location.parent` es un `LocationId?` (no una asociación `@ManyToOne` a la propia entidad) para que cargar una localización no arrastre su cadena entera; el dominio no navega el árbol.

**2b. Los tipos.** `LocationType`, `LocationEnvironment` y `LocationExposure` son enums con `value` explícito, `invoke()` y `AttributeConverter` (ADR-007). `LocationExposure` repite los cuatro valores de la exposición de la especie pero **son tipos distintos**: una describe lo que ofrece el sitio, otra lo que tolera la planta; el [borrador](../../../docs/diagramas/borrador-modelo-datos-gestion.md) ya decidió mantenerlos separados (pendiente 10). `LocationEnvironment` tiene `cubierto`, que el entorno de especie no.

**4. El ciclo es `409`, el padre inexistente `400`.** Un padre que no existe es una referencia errónea del cuerpo (`400`, como la especie inexistente en `PUT /plants`). Un ciclo es un cuerpo bien formado que choca con el estado de la jerarquía: `409`, como retirar una localización en uso. El selector del frontend ya excluye ser-descendiente, así que el `409` es red de seguridad. Dos ediciones simultáneas podrían crear un ciclo entre ellas sin que ninguna lo vea por separado: **toda edición que cambie el padre toma `pg_advisory_xact_lock` sobre una clave fija** de jerarquía antes de comprobar. Es una colección de un solo propietario y las ediciones de jerarquía son raras, así que serializarlas no cuesta nada.

**5. `plant_movement` propia, enlazable después.** `(id, plant_id, from_location_id, to_location_id, moved_at)`, `CHECK (from <> to)`, FK a las tres. El instante sale del `Clock` único (ADR-010). Es una entidad de dominio inmutable con una factoría; T-20 le añadirá su `event_id` o la absorberá como satélite de `PLANT_EVENT`, y eso es una migración aditiva. **No se registra al crear una planta** (nace, no llega) y **la migración no inventa historia**.

**6. Un solo camino para cambiar de sitio.** `Plant.moveTo(location)` devuelve el origen o nada si no cambia, y lo usan **tanto el lote como `PUT /plants/{id}`**; quien lo llama crea el `PlantMovement` en la misma transacción. Así no hay dos reglas de «qué es un movimiento». El detalle de planta (`PlantService`) ya valida la localización destino (`400` si no existe): no cambia.

**7. El lote: atómico, con tope.** `POST /locations/{id}/movements` recibe `{plantIds: [...]}`. Carga las plantas con **una** consulta `IN` (el tamaño de la petición está acotado: más de 2000 ids es `400`, el producto no maneja más), exige que **existan todas** (`400` si falta alguna, deshaciendo todo) y que no haya repetidas, mueve las que no están ya en el destino y devuelve `{moved, unchanged}`. Una excepción dentro de la transacción deshace el lote entero: no hay estado intermedio. El destino inexistente es `404` (es el recurso de la URL). Dónde vive: `PlantMovementService` en `application`, que **devuelve DTOs**; el controller del destino lo invoca.

**8. Historiales paginados, más reciente primero.** `GET /plants/{id}/movements` y `GET /locations/{id}/movements`, ambos `PageResponse` con `@SortDefault` por instante descendente (ADR-009). El de una localización incluye los que la tienen como origen **o** destino, **no** los de sus descendientes: para ver lo de las bandejas se abre la bandeja. La respuesta lleva los **nombres** de origen y destino junto a los ids, resueltos en una consulta con `JOIN`, no uno a uno.

**9. El filtro con descendientes se resuelve a ids de localización.** `GET /plants?location=X&includeDescendants=true` resuelve primero los ids del subárbol con la consulta recursiva y filtra `plant.location_id IN (...)`. La `Specification` ya admite `byLocation`; gana una variante con conjunto. Es una consulta recursiva más, no un recorrido de plantas, y el total de la página coincide con el `plantCountTotal` de la localización (hay un test que lo cruza).

**10. Retirar es más estricto.** Tres bloqueos con mensaje propio: ejemplares directos, sublocalizaciones, movimientos que la referencian. Se comprueban **antes** de borrar, como hoy, para que la FK no convierta un caso previsible en `500`. Que un movimiento bloquee es el precio de que el historial no quede con un origen huérfano; la alternativa —borrado lógico o `ON DELETE SET NULL`— hace opcional un dato que el modelo quiere obligatorio. La salida para el usuario es la de siempre: vaciar y, si fuera preciso, dejarla.

**11. Códigos: backfill en la migración.** `V12` añade `code` nulable, lo **rellena** con `LOC-` más las iniciales del nombre en mayúsculas sin acentos, desambiguando con un sufijo numérico cuando dos coinciden (`row_number()` por código base), y entonces lo deja `NOT NULL` con `UNIQUE INDEX ON lower(trim(code))` y un `CHECK` de no vacío. Todo en el mismo fichero y transacción (ADR-001): nunca existe una versión de la tabla con códigos nulos visibles al código de aplicación. La propuesta del formulario es **solo de frontend** (función pura, como la de especie): el servidor no genera códigos.

**12. Frontend: el feature `locations` se separa de `catalogs`.** Como `species` y `soil-mixes`, la localización deja de ser un caso de `catalogs` y gana `src/features/locations/` con su service completo, tipos, mappers y composables (ADR-015). `catalogs` conserva las etiquetas. El selector de localización del alta y la edición de planta pasa a leerlo del nuevo service.

**13. El árbol se monta en cliente a partir de páginas.** El API pagina (ADR-009) y no hay endpoint de árbol sin límite. El mapa necesita todas las localizaciones, así que el composable **recorre las páginas** al tamaño máximo hasta agotarlas y un **mapper** (`buildLocationTree`, función pura) construye el árbol con ruta y recuentos de lo que llega ya calculado. Con decenas o cientos de localizaciones son una o pocas peticiones. La ficha no necesita el árbol: pide la localización y sus hijas. El selector de padre y el de destino reutilizan ese mismo árbol cargado una vez.

**14. Qué sale al kit.** El prototipo repite tres patrones; se comprueba cuáles ya existen antes de crear nada: `UiTree`/`UiTreeNode` (árbol del mapa), `UiEntityPicker` (selector de padre y de destino, con exclusiones), `UiTable` con `selectable` (selección de ejemplares), `UiDialog` (confirmación del lote), `UiMetricStrip`, `UiEntityHero`, `UiProportionBar` (ocupación) y `UiBreadcrumbs`. **Si alguno no admite lo que se necesita** (por ejemplo `UiEntityPicker` con nodos excluidos, `UiTree` con búsqueda y plegado), se amplía en el kit con su test y su muestra en `/ui-kit` en lugar de resolverlo en la pantalla (ADR-014).

**15. Composición de las tres pantallas.** Se reproduce la de cada `data-screen`:

* `locations`: cabecera con recuento y «Añadir localización» → dos columnas: **mapa del vivero** (encabezado de colección, buscador, árbol plegable) y **vista general** (tarjetas de zona de primer nivel con proporción ocupada si hay capacidad).
* `location-detail`: portada (marca, código, ruta, acciones Mover/Editar; «Crear tarea aquí» marcado T-22) → fila de métricas (plantas totales con las directas como matiz, sublocalizaciones, **tareas y alertas marcadas**) → columna principal («Dentro de», «Plantas en esta ubicación» con selección) → lateral (características del espacio con ocupación, **próximo trabajo marcado T-22**, últimos movimientos con «Ver historial completo»).
* `location-editor`: posición en el vivero → identificación → características del espacio → lateral informativo; con `UiEditorNav` como las demás editoras.

Se **aparta** del prototipo solo en que «Ver historial completo» abre un panel/ruta con el historial paginado (el prototipo no dibuja esa pantalla).

## Contraste con el prototipo (frontend, tarea 5.9)

| Pantalla | Se reproduce | Marcado con su ticket | Apartado del prototipo |
|---|---|---|---|
| `locations` | Cabecera con recuento y alta; mapa del vivero con árbol real plegable, buscador y total de la colección; vista general con tarjetas de zona (proporción solo con capacidad, «Sin capacidad definida» si no); métricas operativas | Tareas pendientes y alertas abiertas de la fila de métricas y el bloque «Requieren atención» (T-22, T-23) | Seleccionar un nodo lleva la vista general a esa zona (el prototipo lo insinúa); se retiran el menú «•••» del mapa, que no hacía nada, y la nota de jerarquía pendiente. Las raíces suman el total de la colección en lugar de pedir el inventario |
| `location-detail` | Portada (marca por tipo, código, ruta con ancestros navegables, descripción, acciones); fila de métricas; «Dentro de» con «Añadir dentro»; ejemplares con ubicación exacta, selección y paginación; características con ocupación; últimos movimientos con sentido | «Crear tarea aquí», métricas de tareas y alertas, y «Próximo trabajo» (T-22, T-23) | «Mover» es la acción masiva de la tabla de ejemplares y no un botón de la portada; el historial completo es una ruta propia (`/locations/{id}/movements`) que el prototipo no dibuja |
| `location-editor` | Posición en el vivero con ruta resultante y selector de padre, identificación con código propuesto, características del espacio, lateral informativo | Nada | El selector de padre es un panel plegable con `UiEntityPicker`, no un diálogo; entorno y exposición se pueden dejar «sin definir» |
| Ficha del ejemplar | Historial de movimientos real junto al de estado | Cronología unificada (T-20) | — |

## Riesgos

* **Recursión con una jerarquía profunda o corrupta** → tope de profundidad en las consultas y `CHECK (parent_id <> id)`; los ciclos largos se evitan con el bloqueo de la decisión 4.
* **El mapa carga todas las localizaciones** → asumible a esta escala; si crece, pagina por nodo (`parentId=`), que el listado ya admite.
* **Códigos autogenerados en la migración poco bonitos** (`LOC-I1`, `LOC-BN-2`) → son editables siempre; solo garantizan unicidad desde el primer día.
* **Un movimiento bloquea retirar una localización** → es una decisión consciente (decisión 10); si molesta, se revisa con borrado lógico en otro change.
* **`PUT /plants/{id}` cambia de efecto**: ahora puede escribir un movimiento → documentado en README; el frontend ya manda la localización completa, no hay cliente que se rompa.

## Plan de migración

`V12` es aditiva salvo `code NOT NULL`, que se alcanza tras el relleno en la misma migración. No hay rollback automático (ADR-001): si falla, la transacción de Flyway la deshace entera. Las localizaciones existentes quedan como raíces con código nuevo; las plantas conservan su localización y no tienen movimientos.

## Siguiente

T-20 enlaza `plant_movement` a la cronología del ejemplar. T-22 hace efectivo «Crear tarea aquí» y la pregunta 15 de §24 (¿plantas al crear o al completar?). T-24 reutiliza la selección múltiple y el selector de destino para acciones por lote distintas del movimiento.
