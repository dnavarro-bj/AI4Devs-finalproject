# Proposal: sustratos-como-el-wireframe

**Ticket:** [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md), la parte de mezclas; corrige lo entregado por [`catalogo-sustratos`](../archive/2026-09-07-catalogo-sustratos/proposal.md)
**Historias:** [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md)

## Why

Las dos pantallas de mezclas funcionan y muestran los datos correctos, pero **no se parecen al prototipo**. Revisadas contra `soil-mixes` y `soil-mix-detail` del [wireframe](../../../docs/wireframes/cactify-admin/index.html), les falta lo que hace que una receta de sustrato se lea de un vistazo:

* El catálogo pinta la composición como dos cifras sueltas en una celda, cuando el prototipo la pinta como **barra bicolor** con su leyenda, y el pH con su **lectura cualitativa** —«Ligeramente ácido»— además del número.
* La ficha es dos paneles en fila. El prototipo abre con una **rueda de proporción** que es la identidad de la mezcla, y ordena el resto en una columna principal y una lateral: receta, propiedades con **escala de pH**, y especies que la recomiendan.

No es un capricho estético. Una proporción es lo que una receta *es*: verla como longitud y como color se lee más rápido que sumar dos números. Y un pH de 5,8 no dice nada a quien no sepa dónde cae en la escala.

Este change **no toca el backend ni el comportamiento**: los mismos datos, la misma validación, los mismos errores.

## What Changes

**Dos componentes nuevos del kit**, porque son patrones y no CSS de una pantalla ([ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)):

* `UiProportionWheel` — partes de un total como anillo, con la proporción dominante en el centro. La usa la portada de la ficha; sirve para cualquier reparto de dos o más partes.
* `UiScale` — un rango sobre una escala continua con sus dos extremos nombrados. La usa el pH; sirve igual para temperatura o humedad, que son el mismo problema.

**`UiProportionBar` gana dos variantes** en lugar de duplicarse: rotular las partes **dentro** de la barra, y un tamaño compacto para caber en una celda de tabla.

**Las dos pantallas se recomponen** siguiendo el prototipo, sin cambiar qué datos muestran ni de dónde salen.

## Capabilities

### Modified Capabilities

- `design-system`: dos componentes nuevos —rueda de proporción y escala con rango— y la barra de proporciones gana rotulado interior y tamaño compacto.
- `plant-dashboard`: el catálogo y la ficha de mezclas presentan la composición y el pH como el prototipo.

## Non-goals

* **No cambia el backend**, ni un endpoint ni un campo.
* **No se inventan datos.** Lo que el prototipo muestra y el API no sirve —cuántas plantas usan la mezcla, el drenaje y la retención esperados, el desglose de componentes, las notas de preparación y la fecha de actualización— va **marcado con su ticket**, no rellenado.
* No se toca el editor: su formulario ya sigue el prototipo.
* No se añade búsqueda ni filtros al catálogo de mezclas: son T-21.

## Impact

* `frontend/app/components/ui/` — `UiProportionWheel` y `UiScale` nuevos; `UiProportionBar` ampliado.
* `frontend/app/pages/soil-mixes/` — el catálogo y la ficha recompuestos.
* `frontend/src/features/soil-mixes/` — la lectura cualitativa del pH, como función pura.
* `frontend/app/pages/ui-kit.vue` — la muestra de los dos componentes nuevos.
* Sin cambios en backend, esquema ni infraestructura.
