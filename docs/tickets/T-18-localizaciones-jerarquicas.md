# T-18 - Localizaciones jerárquicas y movimientos

**Área:** Backend + Frontend
**Historia relacionada:** [0.9](../user-stories/0.9-registrar-localizacion.md), [F.1](../user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md)
**Bloque:** 1 — gestión de plantas

## Descripción

Sustituir el catálogo plano de localizaciones por una jerarquía —vivero, invernadero, bancada, bandeja— y registrar el movimiento de los ejemplares entre ellas. Es prerrequisito del trabajo por lote y de las tareas dirigidas a una zona.

## Alcance

* `Location` gana una localización padre y su ruta completa.
* Recuento de plantas directas y descendientes por nodo.
* Ficha de localización con sus sublocalizaciones, sus plantas y su historial de movimientos.
* Mover uno o varios ejemplares registrando origen, destino y fecha.
* Los breadcrumbs de una localización reflejan su ruta real.

## Criterios de aceptación

* Una localización puede contener otras y la ruta completa se muestra en la ficha y en los breadcrumbs.
* Mover un ejemplar deja constancia de dónde estaba, dónde está y cuándo cambió.
* El recuento de una localización incluye lo que cuelga de sus descendientes.
* Un ciclo en la jerarquía —hacer a una localización descendiente de sí misma— se rechaza.

## Resolución

**Cerrado** con el change `localizaciones-jerarquicas` (migración `V12`). El pendiente —quién mantiene coherente la ruta materializada— se resolvió **por eliminación**: no hay ruta materializada; la ruta y los recuentos se calculan con consultas recursivas y mover una localización con contenido es cambiar una fila.

Añadido al alcance original: código `LOC-···`, tipo, capacidad, entorno, exposición y notas de la localización (los pedía el prototipo), y el **movimiento por lote** atómico. `plant_movement` es tabla propia; que el movimiento salga en la cronología del ejemplar queda para [T-20](T-20-cronologia-unificada.md). Tareas y alertas de la localización siguen marcadas (T-22, T-23).
