# Proposal: localizaciones-jerarquicas

**Ticket:** [T-18](../../../docs/tickets/T-18-localizaciones-jerarquicas.md) — completo.
**Historias:** [F.1](../../../docs/user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md) (absorbe [0.9](../../../docs/user-stories/0.9-registrar-localizacion.md)), [1.9](../../../docs/user-stories/1.9-mover-plantas-entre-localizaciones.md)
**Pantallas del prototipo:** `locations`, `location-detail` y `location-editor` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §3.3 y §16 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

Para 500–2000 ejemplares, un catálogo plano de sitios no sirve: nadie recorre el vivero por una lista de 18 nombres sueltos, sino de la zona a la bancada y de la bancada a la bandeja. La jerarquía es además prerrequisito del trabajo por lote (T-24) y de las tareas dirigidas a una zona (T-22). Y hoy mover una planta es sobrescribir su localización: se pierde dónde estuvo. Las tres pantallas de localización ya reservan su sitio para todo esto, **marcado con T-18**.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **Sin ruta materializada.** Solo `parent_id` en la base; la ruta completa y el recuento de descendientes se calculan con consulta recursiva. Mover una localización con contenido es un `UPDATE` de una fila y no hay nada que desincronizar. Esto **cierra el pendiente del ticket** («quién mantiene coherente la ruta») por eliminación: nadie la mantiene porque no existe, y retira `LOCATION.path` del [borrador de gestión](../../../docs/diagramas/borrador-modelo-datos-gestion.md) (pendiente 9).
* **Todos los campos que el prototipo pide**, no solo la jerarquía: código `LOC-···`, tipo, capacidad, descripción, notas operativas, entorno y exposición. Cierra los pendientes 16 y 17 del borrador.
  * **Código**: lo escribe el usuario, único sin distinguir mayúsculas, obligatorio y **editable siempre**; el formulario lo **propone** desde el nombre, como en la especie. A diferencia del de especie no se restringe su edición: no hay ejemplares ni etiquetas impresas que lo lleven.
  * **Tipo**: `bancada`, `bandeja`, `invernadero`, `zona_exterior`, `estanteria`, `otro`.
  * **Entorno**: `interior`, `cubierto`, `exterior`. **Exposición**: `sombra`, `semisombra`, `soleado`, `pleno_sol`.
* **Movimientos en tabla propia** `plant_movement` (planta, origen, destino, instante), como `plant_status_change`. T-20 la enlazará a la cronología; no se espera a ella.
* **El movimiento por lote entra en este change**, atómico, y la pantalla declara cuántos ejemplares se moverán **antes** de confirmar.

## What Changes

**Esquema** — migración `V11` (V10 es de `especie-ampliada`): `location` gana `parent_id` (FK a sí misma, nulo en la raíz), `code`, `description`, `location_type`, `capacity`, `operational_notes`, `environment` y `sun_exposure`; todos nulables salvo `code`, que **se rellena en la propia migración** para lo existente y queda `NOT NULL` con índice único sobre `lower(code)`. `CHECK` de enums y de capacidad > 0, y de que una localización no sea su propio padre. Nueva tabla `plant_movement`.

**Backend**

* `POST` y `PUT /locations` aceptan los campos nuevos y `parentId`. **`PUT` es reemplazo completo**, como el resto de catálogos.
* **Un ciclo se rechaza**: hacer a una localización hija de sí misma o de cualquiera de sus descendientes responde `409 Conflict` sin cambiar nada (una referencia inexistente como padre es `400`, como en la edición de planta).
* `GET /locations/{id}` devuelve los campos, la **ruta completa**, las sublocalizaciones directas, `plantCount` (directas) y `plantCountTotal` (con descendientes). `GET /locations` trae el recuento directo y total por fila en **una sola consulta**, más `parentId` y la ruta, para que el frontend monte el árbol.
* `GET /plants?location=` pasa a incluir, con `includeDescendants=true`, las plantas de los descendientes.
* **Retirar** una localización con sublocalizaciones o con ejemplares responde `409`.
* `POST /locations/{id}/movements` mueve una lista de ejemplares al destino, **atómicamente**, registrando origen, destino e instante de cada uno. `GET /locations/{id}/movements` lista el historial de esa localización (como origen o destino), paginado, del más reciente al más antiguo. `GET /plants/{id}/movements` el del ejemplar.
* `PUT /plants/{id}` que **cambia** la localización registra también un movimiento; si no cambia, no.

**Frontend**

* El catálogo pinta el árbol real con sus niveles, y la vista general con tarjetas de zona; desaparecen las marcas de T-18 del mapa.
* La ficha gana ruta y breadcrumbs reales, sublocalizaciones («Dentro de …»), recuento directo y total, características del espacio, últimos movimientos y el historial completo. **Tareas y alertas siguen marcadas** (T-22, T-23).
* El formulario gana selector de padre con la ruta resultante, tipo, capacidad, entorno, exposición y notas, y propone el código desde el nombre.
* **Mover**: desde la ficha de la localización de destino o del inventario con varios ejemplares, con el recuento declarado antes de confirmar.
* Los breadcrumbs de la ficha reflejan la ruta real (§3.3).

## Capabilities

### Modified Capabilities

- `catalogs`: alta, listado, consulta, edición y retirada de localizaciones con jerarquía, campos nuevos y recuentos.
- `data-model`: columnas nuevas de `location`, tabla `plant_movement` y sus restricciones.
- `plant-inventory`: filtro por localización con descendientes; la edición que cambia de localización registra movimiento.
- `plant-dashboard`: las tres pantallas de localización.

### New Capabilities

- `plant-movements`: movimiento de ejemplares entre localizaciones, por lote, y su historial.

## Non-goals

* **Sin enlace a la cronología unificada**: el movimiento aparece en la ficha de la localización y en su propio endpoint; que salga en la cronología del ejemplar (criterio de 1.9) llega con T-20, donde `plant_movement` se engancha a `plant_event`. Se marca en la ficha del ejemplar.
* **Tareas y alertas de la localización** siguen siendo maqueta marcada (T-22, T-23); la ocupación (%) solo se calcula si hay capacidad y, sin ella, se dice «sin capacidad definida».
* **Sin geolocalización ni mapas** (§ fuera de alcance) y sin límite de profundidad: el producto recomienda pocos niveles, pero no se impone.
* **Acciones por lote distintas del movimiento** (cuidados, etiquetas) son T-24; aquí solo se mueve.
* **Mover una localización con contenido no mueve plantas**: las plantas siguen en su localización; solo cambia la ruta, que se calcula.
* **La pregunta 15 de §24** (tarea sobre una localización: ¿plantas al crearla o al completarla?) es de T-22.

## Impact

* `backend/src/main/resources/db/migration/V11__location_hierarchy.sql`; `domain/` (`Location`, `LocationType`, `PlantMovement`, enums de entorno y exposición de espacio), `LocationService`, nuevo `PlantMovementService`, `PlantService` (edición), repos y specs, DTOs y controllers. Tests con Testcontainers.
* `frontend/` — `src/features/catalogs` (o nueva `locations`), tipos, service, mapper árbol/ruta, `LocationForm`, las tres pantallas, el selector de localización del alta y la edición de planta.
* `docs/diagramas/modelo-datos-actual.md`, el borrador de gestión (pendientes 9, 16 y 17), `README.md`, ticket T-18 y historias F.1/1.9.
