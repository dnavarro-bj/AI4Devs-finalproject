# Tasks: kit-datos-a-escala

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)): cada bloque empieza por los tests de sus escenarios en rojo y sigue con la implementación que los pone en verde. Cada componente termina con su muestra en `/ui-kit` y `test/design-tokens.spec.ts` en verde.

## 1. `UiPagination`

- [x] 1.1 Escribir `test/ui-pagination.nuxt.spec.ts` con los cuatro escenarios de la requirement: no se muestra con una sola página, indica posición y total contando desde uno, deshabilita retroceder en la primera y avanzar en la última, y deshabilita ambas mientras carga. En rojo
- [x] 1.2 Implementar `app/components/ui/UiPagination.vue` conservando los `data-test` `previous-page`, `next-page` y `page-indicator` y el texto «Página N de M», hasta que 1.1 pase
- [x] 1.3 Sustituir la paginación escrita a mano de `app/pages/plants/index.vue` por el componente, y verificar con `git diff` que `test/plants-list.nuxt.spec.ts` **no cambia ni una línea**: es la prueba de que la extracción no movió el comportamiento
- [x] 1.4 Muestra en la galería en sus tres posiciones —primera, intermedia y última— y suite en verde

## 2. `UiTable`: ordenación

- [x] 2.1 Ampliar `test/ui-table.nuxt.spec.ts` con «Ordenar por una columna», «Invertir el sentido» y «Columna no ordenable»: el encabezado ordenable es activable y expone el sentido, el no ordenable no lo es, y la tabla **no reordena las filas por su cuenta**. En rojo
- [x] 2.2 Implementar la ordenación emitiendo el criterio, sin tocar el orden de `rows`, hasta que 2.1 pase
- [x] 2.3 Comprobar que la selección en curso sobrevive a un cambio de orden

## 3. `UiTable`: columnas y densidad

- [x] 3.1 Ampliar el test con «Ocultar una columna» y «La columna identificativa no se puede ocultar», más que ocultar una columna conserva la selección. En rojo
- [x] 3.2 Implementar `v-model:visibleColumns` —con gestión interna cuando no se pasa— y la prop de densidad, hasta que 3.1 pase
- [x] 3.3 Verificar que los escenarios de selección y acciones masivas de T-09 siguen pasando **sin modificarse**
- [x] 3.4 Ampliar la muestra de la galería con una tabla ordenable, con selector de columnas y en densidad compacta

## 4. `UiFilterBar`

- [x] 4.1 Escribir `test/ui-filter-bar.nuxt.spec.ts` con los tres escenarios: los criterios aplicados se ven como filtros retirables, retirar uno comunica cuál y conserva los demás, y sin criterios no se ofrece limpiar. En rojo
- [x] 4.2 Implementar `app/components/ui/UiFilterBar.vue` componiendo `UiFilterChip`, hasta que 4.1 pase
- [x] 4.3 Muestra en la galería con criterios aplicados y sin ellos

## 5. `UiStatTile`

- [x] 5.1 Escribir `test/ui-stat-tile.nuxt.spec.ts` con «La cifra lleva a su conjunto», «Métrica sin destino» y «Métrica en cero»: con destino es un enlace, sin destino no es activable, y el cero se muestra. En rojo
- [x] 5.2 Implementar `app/components/ui/UiStatTile.vue`, con la severidad comunicada por texto o forma además de por color, hasta que 5.1 pase
- [x] 5.3 Muestra en la galería: con destino, sin destino, en cero y con severidad

## 6. `UiTree`

- [x] 6.1 Escribir `test/ui-tree.nuxt.spec.ts` con los cuatro escenarios: el nodo con descendientes pliega y expone su estado, la hoja no ofrece plegado, el recuento acompaña al nombre distinguiéndose de él, y activar un nodo comunica cuál. En rojo
- [x] 6.2 Implementar `app/components/ui/UiTree.vue` con nodo recursivo, recorrible con el teclado, hasta que 6.1 pase
- [x] 6.3 Muestra en la galería con una jerarquía de cuatro niveles, como la del producto

## 7. Cierre

- [x] 7.1 `yarn test` con toda la suite en verde, incluido `test/architecture.spec.ts`: ningún componente nuevo depende de una feature
- [x] 7.2 `git diff` de los tests de T-05 y de T-09 mostrando que ninguno cambia
- [x] 7.3 Recorrer `/ui-kit` con el frontend levantado y revisar a ojo lo que `happy-dom` no observa: foco visible en encabezados y nodos, contraste de la columna ordenada y comportamiento en ancho estrecho
- [x] 7.4 `openspec validate kit-datos-a-escala --strict` en verde y `CLAUDE.md` al día con los componentes nuevos del kit
