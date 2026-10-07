# T-20 - Cronología unificada del ejemplar

**Área:** Backend + Frontend
**Historia relacionada:** [0.5](../user-stories/0.5-consultar-historial-de-cuidados.md)
**Bloque:** 1 — gestión de plantas

## Descripción

Convertir el historial de una planta en una cronología única de eventos heterogéneos, y añadir los tipos que hoy no existen: comentarios fechados, floraciones observadas e intervenciones (trasplante, cambio de sustrato, tratamiento, poda).

Sustituye a **T-06**, que se retira: su alcance queda repartido entre este ticket y el de alertas.

## Alcance

* Espina de eventos con tipo y fecha, y satélites tipados por cada clase de evento.
* Comentarios cronológicos, distintos de la descripción estable del ejemplar.
* Floraciones reales con inicio, fin, estado y número aproximado de flores.
* Intervenciones: lo de §13.2 que **no** es una medida. `CareRecord` no se toca y el riego se queda dentro.
* Cronología descendente, filtrable por tipo y paginada.
* Las lecturas de sensor **no** entran evento a evento: la telemetría inundaría el historial.

## Criterios de aceptación

* La ficha muestra en una sola cronología eventos de todos los tipos, del más reciente al más antiguo.
* Filtrar por tipo no altera el orden ni pierde eventos.
* Una acción aplicada a varias plantas aparece en el historial de cada una y el sistema conserva que fue una sola operación.
* Registrar una lectura la hace aparecer inmediatamente sin recargar la página.

## Resuelto

* **La fertilización es una intervención**, con producto y notas, no un insumo dosificado en `CareRecord`.
* **Los comentarios se editan y se borran**, marcando «editado» (§24.8); sin historial de versiones.
* El lote entra solo como columna (`batchId`); el registro por lote es de T-24.

**Cerrado** por `cronologia-del-ejemplar` (7 oct 2026): espina `V13`, `GET /plants/{id}/timeline`, comentarios, intervenciones y floraciones, y la ficha con la cronología real.
