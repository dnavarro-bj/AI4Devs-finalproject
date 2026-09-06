# T-17 - Especie ampliada: exposición, entorno, crecimiento y floración

**Área:** Backend + Frontend
**Historia relacionada:** [0.3](../user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.6](../user-stories/0.6-registrar-especie-y-cuidados-recomendados.md)
**Bloque:** 1 — gestión de plantas

## Descripción

Completar el catálogo de especies con las características de cultivo que el producto necesita para agrupar y recomendar: exposición solar, entorno, épocas de crecimiento y floración esperada.

## Alcance

* Exposición solar como enum con vocabulario propio, distinta de las horas de luz: una describe intensidad y la otra duración.
* Entorno: interior, exterior o ambos.
* Épocas de crecimiento por meses, con tipo (crecimiento, reposo, transición) y notas, admitiendo un periodo que cruza el fin de año.
* Floración esperada de la especie, separada de las floraciones realmente observadas en cada ejemplar.
* Descripción de la especie.

## Criterios de aceptación

* Un periodo de noviembre a febrero se guarda y se muestra correctamente.
* La exposición y las horas de luz son campos independientes y ninguno deriva del otro.
* La ficha de especie muestra la pauta anual y el número de ejemplares asociados.

## Pendiente antes de empezar

Cómo se distingue objetivamente «soleado» de «pleno sol» (§24.6), y si hace falta el valor «estacional» en el entorno (§9.3).
