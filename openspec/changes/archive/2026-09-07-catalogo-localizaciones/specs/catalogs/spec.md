## ADDED Requirements

### Requirement: Consulta de una localización con su uso

El sistema SHALL exponer la consulta de una localización por su identificador, incluyendo **cuántos ejemplares alberga**. Una localización inexistente SHALL responder `404`.

#### Scenario: Consulta de una localización

- **WHEN** se consulta una localización existente por su identificador
- **THEN** la respuesta incluye su nombre y el número de ejemplares que alberga

#### Scenario: Localización vacía

- **WHEN** se consulta una localización sin ningún ejemplar
- **THEN** la respuesta indica cero ejemplares, no la omite

#### Scenario: Localización inexistente

- **WHEN** se consulta un identificador que no corresponde a ninguna localización
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

### Requirement: Corrección del nombre de una localización

El sistema SHALL permitir cambiar el nombre de una localización existente **sin afectar a los ejemplares que alberga**: siguen siendo los mismos y conservan su identificador. Un nombre en blanco SHALL responder `400`.

#### Scenario: Localización renombrada

- **WHEN** se corrige el nombre de una localización
- **THEN** la respuesta refleja el nombre nuevo y los ejemplares que alberga no cambian

#### Scenario: Nombre en blanco

- **WHEN** se intenta dejar el nombre de una localización vacío o solo con espacios
- **THEN** la respuesta es `400 Bad Request` con el cuerpo de error uniforme, no un `500`

#### Scenario: Localización inexistente

- **WHEN** se intenta corregir una localización que no existe
- **THEN** la respuesta es `404 Not Found`

### Requirement: Retirada de una localización

El sistema SHALL permitir retirar una localización **que no albergue ningún ejemplar**. Una localización con ejemplares SHALL responder `409` y seguir existiendo: la planta no puede quedarse sin sitio.

#### Scenario: Retirada de una localización vacía

- **WHEN** se retira una localización que no alberga ningún ejemplar
- **THEN** la operación se acepta y la localización deja de aparecer en el catálogo

#### Scenario: Retirada de una localización con ejemplares

- **WHEN** se intenta retirar una localización que alberga al menos un ejemplar
- **THEN** la respuesta es `409 Conflict` con el cuerpo de error uniforme
- **AND** la localización sigue existiendo y sus ejemplares conservan su localización

#### Scenario: Retirada de una localización inexistente

- **WHEN** se intenta retirar un identificador que no corresponde a ninguna localización
- **THEN** la respuesta es `404 Not Found`

## MODIFIED Requirements

### Requirement: Listado de localizaciones

El sistema SHALL exponer el catálogo de localizaciones registradas, de forma que puedan seleccionarse al registrar una planta, y SHALL incluir en cada fila **cuántos ejemplares alberga**.

El recuento SHALL resolverse en **una sola consulta** para toda la página, no con una consulta por fila: es el dato sobre el que se apoya el mapa del vivero del prototipo —una localización sin su carga no dice nada—, así que servirlo es más barato que recortar la pantalla.

#### Scenario: Catálogo con localizaciones

- **WHEN** existen las localizaciones `Invernadero 1` y `Bandeja A3` y se consulta el catálogo de localizaciones
- **THEN** la respuesta es `200 OK` y contiene ambas localizaciones con su identificador, su nombre y su número de ejemplares

#### Scenario: Localización recién creada aparece en el catálogo

- **WHEN** se crea una localización y a continuación se consulta el catálogo
- **THEN** la localización creada está presente en el resultado, con cero ejemplares

#### Scenario: El recuento no multiplica las consultas

- **WHEN** se consulta una página del catálogo con varias localizaciones
- **THEN** los recuentos se obtienen en una sola consulta, sea cual sea el número de filas de la página
