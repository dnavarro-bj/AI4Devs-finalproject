## ADDED Requirements

### Requirement: Una lectura puede pertenecer a un lote

Una lectura de cultivo SHALL poder llevar un `batchId` que la enlace a la operación por lote con la que se registró. La respuesta de la lectura SHALL traerlo cuando lo tenga y omitirlo cuando no. El alta directa de una lectura SHALL NOT aceptarlo: solo lo establece un lote.

#### Scenario: Una lectura de lote

- **WHEN** se registra una lectura por lote
- **THEN** la lectura de cada planta trae el `batchId` de la operación

#### Scenario: Una lectura directa

- **WHEN** se registra una lectura con `POST /plants/{id}/care-records`
- **THEN** la respuesta no trae `batchId`

#### Scenario: El alta directa no asigna lote

- **WHEN** el cuerpo del alta directa incluye `batchId`
- **THEN** se ignora y la lectura queda sin lote
