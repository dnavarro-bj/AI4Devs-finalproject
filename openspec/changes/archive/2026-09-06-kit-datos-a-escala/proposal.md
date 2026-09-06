# Proposal: kit-datos-a-escala

**Ticket:** [T-11](../../../docs/tickets/T-11-kit-de-datos-a-escala.md) — bloque 0
**Historias:** [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md) parcialmente; el resto es soporte, y [1.17](../../../docs/user-stories/1.17-vistas-guardadas-del-inventario.md) lo consumirá en T-21.

## Why

El [wireframe](../../../docs/wireframes/cactify-admin/index.html) define cinco listados —inventario, especies, mezclas de sustrato, etiquetas y localizaciones— y los cinco repiten el mismo patrón: filtrar, ordenar, elegir columnas, seleccionar y paginar sobre cientos o miles de filas.

Hoy el kit cubre solo la mitad: `UiTable` tiene selección y acciones masivas, pero no ordena ni deja elegir columnas, y **la paginación está escrita a mano dentro de `pages/plants/index.vue`**. Si T-13 construye las otras cuatro pantallas antes de sacar esto al kit, acabaremos con cinco paginaciones distintas y cuatro maneras de ordenar.

Se hace antes que las pantallas por el mismo motivo por el que el bloque 0 va antes que el backend: es más barato tener la pieza que reconciliar cinco copias.

## What Changes

* **`UiTable`** gana ordenación por columna, columnas configurables y control de densidad, **sin perder** la selección ni las acciones masivas que ya tiene.
* **`UiPagination`** nace como componente, extraído de `pages/plants/index.vue` sin cambiar su comportamiento ni su marcado observable.
* **`UiFilterBar`** compone los campos de filtro con los `UiFilterChip` de los criterios aplicados, y permite retirarlos uno a uno o todos.
* **`UiStatTile`** es la cifra navegable del Dashboard: «12 alertas importantes» abre ese listado ya filtrado. No es un adorno, es un enlace.
* **`UiTree`** presenta la jerarquía de localizaciones con el recuento de cada nodo.

Cada uno con su test de lo que `happy-dom` observa —marcado, ARIA y foco— y su muestra en `/ui-kit`, según [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `design-system`: la requirement «Tabla de datos con selección y acciones masivas» pasa a exigir ordenación por columna y columnas configurables; se añaden al catálogo la paginación, la barra de filtros, la métrica navegable y el árbol jerárquico.

## Non-goals

* **No se construye ninguna pantalla.** Las cinco que usarán esto son T-13 y T-14.
* **No se persiste la elección de columnas ni de filtros**: las vistas guardadas son [1.17](../../../docs/user-stories/1.17-vistas-guardadas-del-inventario.md), en T-21. Aquí la elección vive mientras dura la pantalla.
* **No se ordena ni se filtra en el cliente.** Los componentes emiten el criterio; quien pide los datos ordenados es la pantalla, contra el API.
* No se toca el backend, ni se añade ningún endpoint ni parámetro.
* No entran la cronología, la agenda ni el calendario: son T-12.

## Impact

* `frontend/app/components/ui/` — `UiTable` ampliada y cuatro componentes nuevos.
* `frontend/app/pages/plants/index.vue` — pasa a usar `UiPagination`.
* `frontend/app/pages/ui-kit.vue` — las muestras.
* `frontend/test/` — tests nuevos; los de T-05 no se reescriben.
* Sin cambios en backend, esquema ni infraestructura.
