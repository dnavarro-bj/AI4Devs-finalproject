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

## Resolución

**Cerrado** con el change `especie-ampliada` (migración `V10`). Dos decisiones resolvieron lo que estaba pendiente:

* **«Soleado» frente a «pleno sol» (§24.6):** sin umbral. Se mantienen los cuatro valores y la interfaz muestra la definición funcional de cada uno; un umbral de horas acoplaría exposición y luz.
* **«Estacional» (§9.3):** no. El entorno tiene tres valores (interior, exterior, ambos); la estacionalidad la dicen los periodos del calendario.

Dos correcciones al alcance original, por el [borrador de gestión](../diagramas/borrador-modelo-datos-gestion.md): el tipo de periodo **`transicion` no existe** (nadie lo pide) y el calendario es **una sola tabla** con `crecimiento`, `reposo`, `floracion` y `riego` —este último con intensidad—. La floración esperada, por tanto, son columnas descriptivas más sus periodos.

Fuera, anotado: las «notas de cultivo» del editor del prototipo (sin campo en el modelo) y el «Estacional» que el wireframe dibuja.
