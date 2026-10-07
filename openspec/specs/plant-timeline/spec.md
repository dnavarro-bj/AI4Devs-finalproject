# plant-timeline Specification

## Purpose
TBD - created by archiving change cronologia-del-ejemplar. Update Purpose after archive.

## Requirements

### Requirement: Cronología unificada del ejemplar

`GET /plants/{id}/timeline` SHALL devolver, paginada con el envelope `PageResponse` (ADR-009), la historia del ejemplar como una sola lista de eventos ordenada del más reciente al más antiguo por su instante, con el identificador como desempate para que el orden sea estable. Los tipos SHALL ser `lectura`, `cambio_estado`, `movimiento`, `comentario`, `intervencion`, `floracion` y `tarea`. Cada entrada SHALL traer `id`, `type`, `occurredAt`, el `batchId` si lo tiene y **el detalle de su tipo**, en un objeto con el nombre del tipo (`reading`, `statusChange`, `movement`, `comment`, `intervention`, `bloom`, `task`) y ningún otro. Un evento `tarea` SHALL traer en `task` el `taskId`, el tipo y el título de la tarea que se completó. Las lecturas, los cambios de estado y los movimientos SHALL leerse de donde ya viven, sin copiarse ni migrarse. Una planta inexistente SHALL responder `404`.

#### Scenario: Eventos de todos los tipos en una sola lista

- **WHEN** un ejemplar tiene una lectura, un cambio de estado, un movimiento, un comentario, una intervención, una floración y una tarea completada
- **THEN** `GET /plants/{id}/timeline` devuelve las siete entradas, de la más reciente a la más antigua

#### Scenario: Cada entrada trae el detalle de su tipo

- **WHEN** se consulta la cronología
- **THEN** una entrada `lectura` trae `reading` con sus medidas, una `comentario` trae `comment` con su texto, una `tarea` trae `task` con su tarea, y ninguna trae el detalle de otro tipo

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

### Requirement: Una tarea completada aparece en la cronología de cada planta incluida

Completar una tarea SHALL dejar **un evento `tarea` en la cronología de cada planta incluida** y ninguno en las excluidas ni en las plantas ajenas a la tarea. El evento SHALL ocurrir en el instante de la finalización, SHALL NOT poder editarse ni borrarse desde la cronología, y SHALL poder filtrarse con `?type=tarea`. Omitir o cancelar una tarea SHALL NOT dejar ningún evento.

#### Scenario: Aparece en cada planta incluida

- **WHEN** una tarea de grupo se completa con 4 plantas incluidas
- **THEN** la cronología de cada una de las 4 trae un evento `tarea` con el título de la tarea

#### Scenario: Las excluidas no lo tienen

- **WHEN** una planta se excluyó al completar
- **THEN** su cronología no trae ningún evento `tarea` de esa tarea

#### Scenario: Filtro por tipo

- **WHEN** se pide `?type=tarea`
- **THEN** solo vienen eventos de tarea y `totalElements` los cuenta todos

#### Scenario: Omitida o cancelada no dejan rastro

- **WHEN** una tarea se omite o se cancela
- **THEN** ninguna cronología trae un evento de esa tarea

#### Scenario: No se edita desde la cronología

- **WHEN** se intenta editar o borrar un evento `tarea` por los endpoints de comentarios, intervenciones o floraciones
- **THEN** responde `404`

### Requirement: Las alertas del ejemplar en su cronología

`GET /plants/{id}/timeline` SHALL incluir el tipo **`alerta`**: **una entrada por transición** de cada alerta de ese ejemplar —su **apertura**, su revisión, su resolución y su descarte—, en el instante de la transición, con un detalle `alert` que lleve el identificador de la alerta, su categoría, su severidad, su motivo, el estado anterior (ausente en la apertura), el nuevo y el comentario si lo hay. Las entradas SHALL leerse de donde ya viven, **sin copiarse** a la espina de eventos, y SHALL obedecer al resto del contrato de la cronología: orden descendente con desempate estable, paginación y filtro `?type=alerta` aplicado antes de paginar. Las **ocurrencias** posteriores de una alerta NO SHALL generar entradas: la alerta acumula y la cronología no se inunda. Las alertas de una **localización** NO SHALL aparecer en la cronología de sus ejemplares.

#### Scenario: Apertura y resolución en la cronología

- **WHEN** una alerta de un ejemplar se abre, se revisa y se resuelve
- **THEN** la cronología trae tres entradas `alerta`, con su instante y su estado, y la primera no tiene estado anterior

#### Scenario: Filtrar por alertas

- **WHEN** se pide `?type=alerta`
- **THEN** solo vienen transiciones de alertas, `totalElements` las cuenta todas y el orden es el de la cronología completa

#### Scenario: Las ocurrencias no son eventos

- **WHEN** una alerta abierta recibe cinco lecturas más fuera de rango
- **THEN** la cronología no gana ninguna entrada de alerta

#### Scenario: Alerta de una localización

- **WHEN** una localización tiene una alerta propia
- **THEN** no aparece en la cronología de las plantas que alberga

#### Scenario: Una alerta manual

- **WHEN** se anota una alerta manual sobre un ejemplar
- **THEN** su apertura figura en la cronología con el motivo
