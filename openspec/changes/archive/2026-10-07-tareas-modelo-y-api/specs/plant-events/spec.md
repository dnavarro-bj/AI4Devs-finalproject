## ADDED Requirements

### Requirement: Una intervención puede enlazarse a la tarea que la originó

Una intervención SHALL poder llevar un `taskId` opcional que la enlace a la tarea completada con la que se registró; su detalle en la cronología SHALL traerlo cuando lo tenga. El alta directa de una intervención SHALL NOT aceptar `taskId`: solo lo establece completar una tarea.

#### Scenario: Una intervención enlazada

- **WHEN** se completa una tarea de cambio de maceta con un trasplante
- **THEN** la intervención de cada planta trae el `taskId` de esa tarea en su detalle de la cronología

#### Scenario: Una intervención directa

- **WHEN** se registra una intervención con `POST /plants/{id}/interventions`
- **THEN** no trae `taskId`

#### Scenario: El alta directa no enlaza

- **WHEN** el cuerpo del alta directa incluye `taskId`
- **THEN** se ignora
