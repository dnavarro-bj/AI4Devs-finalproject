## MODIFIED Requirements

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

## ADDED Requirements

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
