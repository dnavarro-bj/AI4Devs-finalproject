## MODIFIED Requirements

### Requirement: Los eventos de un lote conservan su operación

Un evento SHALL poder llevar un `batchId` que identifica la operación única que lo originó cuando se aplicó a varias plantas, y las **lecturas de cultivo** también. La cronología SHALL devolverlo cuando exista y omitirlo cuando no, y SHALL traer además **`batchSize`**, el número de plantas de esa operación. Solo un lote (`POST /batches`) SHALL asignarlo: los registros individuales y los de una tarea no lo llevan.

#### Scenario: Evento con lote

- **WHEN** un evento de la planta A y otro de la planta B comparten `batchId`
- **THEN** cada uno aparece en la cronología de su planta con el mismo `batchId`

#### Scenario: Evento sin lote

- **WHEN** un evento se registra individualmente
- **THEN** su entrada no trae `batchId` ni `batchSize`

#### Scenario: El tamaño del lote

- **WHEN** un lote se aplicó a 31 plantas
- **THEN** la entrada de cada una trae `batchSize` 31

#### Scenario: Una lectura de lote

- **WHEN** una lectura se registró por lote
- **THEN** su entrada trae `batchId` y `batchSize`

#### Scenario: Una lectura individual

- **WHEN** una lectura se registra directamente o al completar una tarea
- **THEN** su entrada no trae `batchId`
