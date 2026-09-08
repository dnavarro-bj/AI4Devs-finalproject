## ADDED Requirements

### Requirement: Consulta de una etiqueta con su uso

El sistema SHALL exponer la consulta de una etiqueta por su identificador, incluyendo **cuántas plantas la tienen asignada**. Una etiqueta inexistente SHALL responder `404`.

#### Scenario: Consulta de una etiqueta

- **WHEN** se consulta una etiqueta existente por su identificador
- **THEN** la respuesta incluye su nombre y el número de plantas que la tienen

#### Scenario: Etiqueta sin uso

- **WHEN** se consulta una etiqueta que ninguna planta tiene asignada
- **THEN** la respuesta indica cero plantas, no la omite

#### Scenario: Etiqueta inexistente

- **WHEN** se consulta un identificador que no corresponde a ninguna etiqueta
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

### Requirement: Renombrado de una etiqueta

El sistema SHALL permitir cambiar el nombre de una etiqueta existente, **conservando sus asignaciones**: las plantas que la tenían la siguen teniendo. El nombre nuevo SHALL respetar la unicidad normalizada del catálogo.

#### Scenario: Etiqueta renombrada

- **WHEN** se renombra una etiqueta a un nombre libre
- **THEN** la respuesta refleja el nombre nuevo y las plantas que la tenían la conservan

#### Scenario: Renombrado a un nombre ya usado

- **WHEN** se renombra una etiqueta a un nombre que ya existe en el catálogo, aunque difiera en mayúsculas o espacios
- **THEN** la respuesta es `409 Conflict` y la etiqueta conserva su nombre

#### Scenario: Renombrado al mismo nombre

- **WHEN** se renombra una etiqueta al nombre que ya tenía
- **THEN** la operación se acepta y no se considera un conflicto consigo misma

#### Scenario: Nombre en blanco

- **WHEN** se renombra una etiqueta a un nombre vacío
- **THEN** la respuesta es `400 Bad Request` y la etiqueta conserva su nombre

### Requirement: Combinación de etiquetas duplicadas

El sistema SHALL permitir combinar dos etiquetas: las plantas que tienen la etiqueta **de origen** pasan a tener la de **destino**, y la de origen se retira del catálogo. Una planta que ya tuviera ambas SHALL conservar la de destino **una sola vez**, sin duplicarse. La operación SHALL informar de cuántas plantas se han visto afectadas.

#### Scenario: Combinación de dos etiquetas

- **WHEN** se combina una etiqueta de origen en una de destino
- **THEN** las plantas de la de origen pasan a tener la de destino, la de origen desaparece del catálogo, y la respuesta indica cuántas plantas se vieron afectadas

#### Scenario: Planta que ya tenía ambas

- **WHEN** una planta tiene tanto la etiqueta de origen como la de destino y se combinan
- **THEN** esa planta conserva la de destino una sola vez y la operación no falla

#### Scenario: Combinar una etiqueta consigo misma

- **WHEN** el origen y el destino son la misma etiqueta
- **THEN** la respuesta es `400 Bad Request` y no se retira nada

#### Scenario: Combinación con una etiqueta inexistente

- **WHEN** el origen o el destino no corresponden a ninguna etiqueta
- **THEN** la respuesta es `404 Not Found` y no se retira nada

### Requirement: Retirada de una etiqueta en uso

El sistema SHALL permitir retirar una etiqueta del catálogo **salvo que alguna planta la tenga asignada**. En ese caso SHALL responder `409 Conflict` explicando la causa, y la etiqueta SHALL permanecer.

#### Scenario: Retirada de una etiqueta sin uso

- **WHEN** se retira una etiqueta que ninguna planta tiene
- **THEN** la respuesta es `204 No Content` y deja de aparecer en el catálogo

#### Scenario: Retirada de una etiqueta en uso

- **WHEN** se retira una etiqueta que alguna planta tiene asignada
- **THEN** la respuesta es `409 Conflict` explicando que está en uso, y la etiqueta permanece

## MODIFIED Requirements

### Requirement: Listado de tags

El sistema SHALL exponer el catálogo de tags registrados, de forma que puedan asignarse a una planta, y SHALL incluir en cada fila **cuántas plantas la tienen**.

El recuento SHALL resolverse en **una sola consulta** para toda la página, no con una consulta por fila: el catálogo existe para decidir qué etiquetas sobran y cuáles se combinan, y esa decisión se toma comparando usos.

#### Scenario: Catálogo con tags

- **WHEN** existen tags registrados y se consulta el catálogo
- **THEN** la respuesta es `200 OK` y contiene cada tag con su identificador, su nombre y su número de plantas

#### Scenario: Tag sin uso en el listado

- **WHEN** un tag no lo tiene ninguna planta
- **THEN** aparece igualmente en el listado, con cero plantas

#### Scenario: El recuento no multiplica las consultas

- **WHEN** se consulta una página del catálogo con varios tags
- **THEN** los recuentos se obtienen en una sola consulta, sea cual sea el número de filas de la página
