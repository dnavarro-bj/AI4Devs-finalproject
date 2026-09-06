# T-12 - Kit: cronología, calendario y multimedia

**Área:** Frontend (UI kit)
**Historia relacionada:** [0.5](../user-stories/0.5-consultar-historial-de-cuidados.md), [F.3](../user-stories/F.3-consultar-cuidados-pendientes.md) parcialmente
**Bloque:** 0 — esqueleto de la web

## Descripción

El segundo grupo de patrones del prototipo: contar lo que ha pasado y editar formularios largos. La ficha de planta necesita una cronología de eventos heterogéneos, el módulo de tareas necesita agenda y calendario, y los formularios de alta de especie y de planta son largos y por secciones.

Igual que T-11, sale al kit antes de que exista la pantalla que lo usaría.

## Alcance

* `UiTimeline` y su entrada: cronología descendente de eventos de distinta densidad —una foto, un comentario breve y una alerta no se pintan igual pero comparten orden— con filtro por tipo (§7.3).
* `UiAgendaList`: agrupación operativa en vencidas, hoy, próximos días y posteriores (§14.5).
* `UiCalendarMonth`: planificación mensual, legible cuando una celda acumula varias entradas.
* `UiMediaGallery` y `UiUploadArea`: galería con ampliación y zona de subida (§8).
* `UiFormSection`: bloques con significado para el usuario, no según la estructura de la base de datos (§2.1).
* `UiMonthRange`: pauta anual por meses, para épocas de crecimiento y de floración (§9.4).
* `UiProportionBar`: proporciones con validación visual, para la composición de las mezclas de sustrato.
* Muestra de cada uno en `/ui-kit` y test de lo observable.

## Criterios de aceptación

* La cronología ordena del evento más reciente al más antiguo y permite filtrar por tipo sin perder el orden.
* La agenda agrupa por vencimiento y el calendario sigue siendo legible con varias entradas en un día.
* La galería abre las imágenes a mayor tamaño y la zona de subida acepta varios archivos.
* El rango de meses admite un periodo que cruza el fin de año (noviembre–febrero).
* La barra de proporciones señala visualmente cuando la suma no cuadra.
