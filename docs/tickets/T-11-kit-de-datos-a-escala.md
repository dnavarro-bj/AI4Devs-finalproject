# T-11 - Kit: datos a escala

**Área:** Frontend (UI kit)
**Historia relacionada:** [0.11](../user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md) parcialmente; el resto es soporte
**Bloque:** 0 — esqueleto de la web

## Descripción

Los listados del prototipo —inventario, especies, mezclas, etiquetas, localizaciones— repiten el mismo patrón: filtrar, ordenar, elegir columnas, seleccionar y paginar sobre cientos o miles de filas. Hoy `UiTable` cubre la selección y las acciones masivas, y la paginación está escrita a mano dentro de `pages/plants/index.vue`.

Este ticket saca ese patrón al kit **antes** de que existan cinco pantallas que lo reimplementen cada una a su manera.

## Alcance

* `UiTable` gana ordenación por columna, columnas configurables y control de densidad, sin perder la selección ni las acciones masivas que ya tiene.
* `UiPagination` como componente, extraído de `pages/plants/index.vue` sin cambiar su comportamiento.
* `UiFilterBar`: compone campos de filtro y los `UiFilterChip` de los criterios aplicados, con retirada individual y total.
* `UiStatTile`: la cifra navegable del Dashboard —«12 alertas importantes» abre el listado ya filtrado (§4.2)—, que no es un adorno sino un enlace.
* `UiTree`: la jerarquía de localizaciones con recuento por nodo (§16).
* Muestra de cada uno en `/ui-kit` y test de lo que `happy-dom` observa.

## Criterios de aceptación

* La tabla ordena por la columna elegida, permite ocultar y mostrar columnas, y conserva la selección al reordenar.
* La barra de filtros muestra los criterios aplicados y permite retirarlos uno a uno o todos.
* `pages/plants/index.vue` usa `UiPagination` y sus tests de T-05 siguen en verde sin tocar una línea.
* Ningún componente declara un color, radio, duración o tamaño literal: `test/design-tokens.spec.ts` sigue en verde.
