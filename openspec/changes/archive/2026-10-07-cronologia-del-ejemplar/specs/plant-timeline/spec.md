## ADDED Requirements

### Requirement: Cronología unificada del ejemplar

`GET /plants/{id}/timeline` SHALL devolver, paginada con el envelope `PageResponse` (ADR-009), la historia del ejemplar como una sola lista de eventos ordenada del más reciente al más antiguo por su instante, con el identificador como desempate para que el orden sea estable. Los tipos SHALL ser `lectura`, `cambio_estado`, `movimiento`, `comentario`, `intervencion` y `floracion`. Cada entrada SHALL traer `id`, `type`, `occurredAt`, el `batchId` si lo tiene y **el detalle de su tipo**, en un objeto con el nombre del tipo (`reading`, `statusChange`, `movement`, `comment`, `intervention`, `bloom`) y ningún otro. Las lecturas, los cambios de estado y los movimientos SHALL leerse de donde ya viven, sin copiarse ni migrarse. Una planta inexistente SHALL responder `404`.

#### Scenario: Eventos de todos los tipos en una sola lista

- **WHEN** un ejemplar tiene una lectura, un cambio de estado, un movimiento, un comentario, una intervención y una floración
- **THEN** `GET /plants/{id}/timeline` devuelve las seis entradas, de la más reciente a la más antigua

#### Scenario: Cada entrada trae el detalle de su tipo

- **WHEN** se consulta la cronología
- **THEN** una entrada `lectura` trae `reading` con sus medidas, una `comentario` trae `comment` con su texto, y ninguna trae el detalle de otro tipo

#### Scenario: Una lectura aparece inmediatamente

- **WHEN** se registra una lectura de cultivo y se consulta la cronología
- **THEN** la lectura es la primera entrada, sin ninguna otra operación

#### Scenario: Un cambio de estado y un movimiento aparecen en su instante

- **WHEN** el ejemplar cambia de estado y de localización
- **THEN** ambos figuran en la cronología con su instante, el estado anterior y el nuevo, y las dos localizaciones

#### Scenario: Orden estable con el mismo instante

- **WHEN** dos eventos comparten instante
- **THEN** su orden relativo es siempre el mismo entre una consulta y la siguiente

#### Scenario: Una planta sin historia

- **WHEN** se consulta la cronología de un ejemplar sin eventos
- **THEN** la respuesta es `200 OK` con una página vacía

#### Scenario: Planta inexistente

- **WHEN** se consulta la cronología de una planta que no existe
- **THEN** la respuesta es `404`

#### Scenario: Los eventos de otra planta no aparecen

- **WHEN** dos ejemplares tienen eventos
- **THEN** la cronología de cada uno solo trae los suyos

### Requirement: Paginación de la cronología

La cronología SHALL paginarse con los parámetros `page` y `size` y devolver `totalElements`, `totalPages`, `pageNumber` y `pageSize`. Recorrer todas las páginas SHALL devolver cada evento **exactamente una vez** y en el mismo orden que una sola consulta sin límite. No SHALL existir la consulta sin límite.

#### Scenario: Recorrer las páginas no pierde ni repite eventos

- **WHEN** un ejemplar tiene 30 eventos de varios tipos y se piden páginas de 10
- **THEN** las tres páginas suman 30 entradas distintas, en orden descendente continuo

#### Scenario: El total refleja lo que hay

- **WHEN** se consulta la primera página
- **THEN** `totalElements` es el número total de eventos del ejemplar, no el de la página

### Requirement: Filtro de la cronología por tipo

`?type=` SHALL poder repetirse para pedir uno o varios tipos. El filtro SHALL aplicarse **antes de paginar**: el total y las páginas son los del filtro, el orden es el mismo que sin filtrar y ningún evento del tipo pedido queda fuera. Un tipo desconocido SHALL rechazarse con `400` y mensaje que lista los válidos.

#### Scenario: Filtrar por un tipo

- **WHEN** se pide `?type=floracion`
- **THEN** solo vienen floraciones y `totalElements` las cuenta todas

#### Scenario: Filtrar por varios tipos

- **WHEN** se piden `?type=comentario&type=intervencion`
- **THEN** vienen comentarios e intervenciones, mezclados en orden cronológico

#### Scenario: El filtro conserva el orden relativo

- **WHEN** se filtra por un tipo
- **THEN** sus eventos aparecen en el mismo orden relativo que tenían en la cronología completa

#### Scenario: El filtro se aplica antes de paginar

- **WHEN** un ejemplar tiene 3 floraciones entre 40 eventos y se pide `?type=floracion&size=10`
- **THEN** la primera página trae las 3 floraciones y `totalPages` es `1`

#### Scenario: Tipo desconocido

- **WHEN** se pide `?type=alerta`
- **THEN** la respuesta es `400` indicando los tipos válidos

### Requirement: Los eventos de un lote conservan su operación

Un evento SHALL poder llevar un `batchId` que identifica la operación única que lo originó cuando se aplicó a varias plantas. La cronología SHALL devolverlo cuando exista y omitirlo cuando no. Este change NO SHALL ofrecer ninguna operación que lo asigne.

#### Scenario: Evento con lote

- **WHEN** un evento de la planta A y otro de la planta B comparten `batchId`
- **THEN** cada uno aparece en la cronología de su planta con el mismo `batchId`

#### Scenario: Evento sin lote

- **WHEN** un evento se registra individualmente
- **THEN** su entrada no trae `batchId`
