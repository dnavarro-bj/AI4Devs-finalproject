# Proposal: armazon-navegacion

**Ticket:** [T-10](../../../docs/tickets/T-10-armazon-y-navegacion-de-la-aplicacion.md) — bloque 0 del backlog
**Historias:** ninguna directa; es un ticket estructural. Sirve parcialmente a [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md) con el buscador global, que se completa en T-21.

## Why

El frontend tiene tres pantallas y una navegación de una sola entrada, dimensionada para el MVP de T-05. El [wireframe de administración](../../../docs/wireframes/cactify-admin/index.html) define quince pantallas repartidas en cuatro grupos, y el [documento de producto](../../../docs/producto/definicion-funcional-y-ux.md) da por supuesta una orientación que hoy no existe: buscador global en toda pantalla y una arquitectura de información estable.

Se hace **antes que cualquier trabajo de backend** porque construir las pantallas es lo que revela lo que al kit le falta. Adivinar los componentes sin usarlos sale peor, y descubrirlos con el backend ya hecho obliga a rehacer pantallas que funcionaban.

## What Changes

* La navegación lateral pasa de una lista plana a **cuatro grupos** —Colección, Trabajo diario, Catálogos y Administración—, cuyos encabezados agrupan y no navegan.
* Aparece un **buscador global** en la barra superior que devuelve resultados agrupados por tipo (planta, especie, localización, etiqueta) y abre la ficha correspondiente. Resuelve contra datos de ejemplo del propio frontend: no hay endpoint de búsqueda todavía.
* Aparece una **cabecera de página común** —título, contexto y acciones— que hoy cada pantalla resuelve por su cuenta.
* Se declaran las **quince rutas** del prototipo. Las doce que aún no tienen pantalla muestran un estado vacío que dice que están por construir; ninguna termina en error.
* Tres componentes nuevos del kit: `UiNavGroup`, `UiGlobalSearch` y `UiPageHeader`, cada uno con su test y su muestra en `/ui-kit`.
* **BREAKING**: la ruta `/plants/nueva` pasa a `/plants/new`. Se unifica el idioma de las URLs en inglés, coherente con la regla del proyecto —documentación en español, código e identificadores en inglés—. Es una URL de una aplicación sin usuarios ni enlaces externos; renombrarla ahora es barato y después no.

## Capabilities

### New Capabilities

- `app-navigation`: la arquitectura de información de la aplicación —qué secciones existen, cómo se llega a ellas, cómo se busca desde cualquier pantalla y cómo se comporta una sección todavía no construida.

### Modified Capabilities

- `design-system`: el requisito «Armazón de la aplicación» pasa a exigir navegación agrupada y a alojar el buscador global en la barra superior; se añaden el componente de búsqueda global y el de cabecera de página al catálogo del kit.

## Non-goals

* **Ninguna pantalla de producto se construye aquí.** Las doce rutas nuevas quedan en estado vacío; las de gestión son T-13 y las de trabajo, T-14.
* **Ningún endpoint.** El buscador no llama al API; su implementación real es T-21.
* **Ningún cambio en las tres pantallas de T-05** más allá del renombrado de la ruta de alta: siguen pidiendo sus datos al API y sus tests siguen en verde sin tocarse.
* **Ni tablas a escala ni cronología ni calendario**: son T-11 y T-12.
* Sin autenticación ni perfil de usuario, aunque la barra superior del prototipo los prevea.

## Impact

* `frontend/app/layouts/default.vue` — el armazón, que pasa de navegación plana a agrupada y aloja el buscador.
* `frontend/app/components/ui/` — tres componentes nuevos.
* `frontend/app/pages/` — doce rutas nuevas y el renombrado de `nueva.vue` a `new.vue`.
* `frontend/app/pages/ui-kit.vue` — muestras de los tres componentes.
* `frontend/test/` — tests nuevos; los ocho de T-05 no se tocan.
* Sin cambios en backend, esquema ni infraestructura.
