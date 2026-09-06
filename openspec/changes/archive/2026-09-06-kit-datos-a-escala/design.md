# Design: kit-datos-a-escala

## Context

Ver [proposal.md](proposal.md) para la motivación y [specs/](specs/design-system/spec.md) para el contrato.

De lo que se parte:

* `UiTable` ya resuelve selección, acciones masivas, columna identificativa dominante y desplazamiento horizontal. Declara columnas con `columns` y su contenido con slots `cell-<key>`.
* La paginación vive escrita a mano en `pages/plants/index.vue`, con los `data-test` `previous-page`, `next-page` y `page-indicator`, que los tests de T-05 comprueban.
* `UiFilterChip` ya existe y resuelve el filtro retirable individual.
* Reglas de [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md): un solo elemento raíz, cero valores literales, muestra en `/ui-kit`, accesibilidad como contrato.
* Reglas de [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md): un componente del kit no accede a datos ni depende de una feature.

## Goals / Non-Goals

**Goals:**

* Que T-13 componga los cinco listados sin escribir CSS de tabla ni lógica de paginación.
* Que el contrato aguante la conexión al API real de T-21 sin rediseñarse.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se introduce ninguna dependencia nueva ni ningún estado global.

## Decisions

### La tabla emite el criterio de ordenación; no ordena

`UiTable` marca la columna ordenada y emite `update:sort`; los datos llegan ya ordenados desde fuera.

**Por qué**: [ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md) obliga a paginar todo listado, así que la tabla solo tiene delante **una página**. Ordenar esa página en el cliente daría un resultado plausible y equivocado: reordenaría veinte filas de dos mil y el usuario creería estar viendo el máximo. La ordenación es del servidor por definición.

**Descartado**: una prop `clientSort` para casos pequeños. Sería la que alguien usaría por descuido en el inventario.

### Las columnas visibles son estado del componente, con `v-model`

`UiTable` acepta `v-model:visibleColumns`. Sin él, gestiona la elección internamente.

**Por qué**: en T-11 la elección vive mientras dura la pantalla, pero T-21 tiene que poder guardarla en una vista. Con `v-model` esa evolución es pasar la prop, sin tocar el componente.

**La columna identificativa —la primera— no es ocultable.** Sin ella una fila deja de poder reconocerse, y una tabla de filas anónimas es peor que una tabla ancha.

### `UiPagination` conserva los `data-test` de T-05

El componente extraído mantiene `previous-page`, `next-page` y `page-indicator`, y el mismo texto «Página N de M».

**Por qué**: es lo que permite que `plants-list.nuxt.spec.ts` pase sin reescribirse, y por tanto lo que demuestra que la extracción no cambió el comportamiento. Si hubiera que retocar el test, ya no probaría eso.

### `UiStatTile` sin destino no es un control

Con `to` renderiza un enlace; sin él, un elemento no activable.

**Por qué**: el §4.2 del documento de producto exige que toda cifra agregada lleve a su conjunto. Un tile que parece pulsable y no hace nada es peor que uno que no lo parece. Y una métrica en cero **se muestra**: el cero es información, no ausencia.

### `UiTree` recibe el árbol ya construido

El componente acepta nodos con sus hijos anidados; no aplana ni reconstruye jerarquías desde una lista con `parentId`.

**Por qué**: construir el árbol es trabajo de la feature de localizaciones, que conoce el modelo. El kit pinta.

**Recursividad**: el nodo se pinta con un componente recursivo interno. Es lo único que permite una profundidad arbitraria, y la jerarquía del producto —vivero, invernadero, bancada, bandeja— ya tiene cuatro niveles.

### Densidad como prop, no como control del componente

`UiTable` acepta `density`; el control que la cambia lo pone la pantalla.

**Por qué**: la densidad es una preferencia del usuario sobre la pantalla, no de la tabla sobre sí misma. Meter el control dentro obligaría a cada tabla a llevarlo aunque la pantalla no lo quiera.

## Risks / Trade-offs

* **`UiTable` acumula responsabilidades** —selección, acciones masivas, orden, columnas, densidad— y puede volverse el componente que nadie quiere tocar → se acepta porque todas son la misma pregunta, «cómo se mira una tabla larga», y separarlas obligaría a coordinar cuatro componentes por listado. Se revisa si T-13 encuentra una pantalla que solo quiere la mitad.
* **Ordenar y ocultar columnas no está cubierto por ningún test de pantalla todavía** —no hay pantalla que lo use hasta T-13— → los tests del componente son la única red hasta entonces, así que cubren también los bordes: columna no ordenable, selección conservada al reordenar.
* **`happy-dom` no mide foco visual ni lectura real de un lector de pantalla** → se verifica marcado, ARIA y movimiento del foco con test, y lo visual a ojo en la galería.
* **El árbol recursivo puede desbordar la pila con un ciclo** en los datos → el kit no valida la jerarquía; quien construya el árbol es responsable de que sea un árbol. T-18 tiene el rechazo de ciclos entre sus criterios de aceptación.
