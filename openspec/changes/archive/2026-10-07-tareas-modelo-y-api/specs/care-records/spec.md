## ADDED Requirements

### Requirement: Una lectura puede enlazarse a la tarea que la originó

Una lectura de cultivo SHALL poder llevar un `taskId` opcional que la enlace a la tarea completada con la que se registró. La respuesta de la lectura SHALL traer `taskId` cuando lo tenga y omitirlo cuando no. Una lectura registrada directamente SHALL NOT necesitar ninguna tarea, y su alta directa SHALL NOT aceptar `taskId`: el enlace solo lo establece completar una tarea.

#### Scenario: Una lectura enlazada

- **WHEN** se completa una tarea de riego con una lectura
- **THEN** la lectura de cada planta trae el `taskId` de esa tarea

#### Scenario: Una lectura directa

- **WHEN** se registra una lectura con `POST /plants/{id}/care-records`
- **THEN** la respuesta no trae `taskId`

#### Scenario: El alta directa no enlaza

- **WHEN** el cuerpo del alta directa incluye `taskId`
- **THEN** se ignora y la lectura queda sin enlace
