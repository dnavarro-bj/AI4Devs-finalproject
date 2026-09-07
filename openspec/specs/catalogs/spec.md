# catalogs Specification

## Purpose

Catálogos de soporte reutilizables del inventario —localizaciones y tags— expuestos como API REST, para que las plantas se clasifiquen mediante valores seleccionables y consistentes en lugar de texto libre.

## Requirements

### Requirement: Alta de localizaciones

El sistema SHALL permitir crear una localización indicando su nombre, y SHALL devolver la localización creada con su identificador. El nombre es obligatorio y no puede estar en blanco.

#### Scenario: Localización creada correctamente

- **WHEN** se solicita crear una localización con el nombre `Invernadero 1`
- **THEN** la respuesta es `201 Created`, incluye el identificador asignado y el nombre `Invernadero 1`

#### Scenario: Localización sin nombre

- **WHEN** se solicita crear una localización con el nombre vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nombre es obligatorio, y no se crea ninguna localización

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

### Requirement: Alta de tags con nombre normalizado

El sistema SHALL permitir crear un tag indicando su nombre, almacenándolo sin espacios al principio ni al final. El nombre es obligatorio y no puede estar en blanco.

#### Scenario: Tag creado correctamente

- **WHEN** se solicita crear un tag con el nombre `globular`
- **THEN** la respuesta es `201 Created` e incluye el identificador asignado y el nombre `globular`

#### Scenario: Nombre con espacios sobrantes

- **WHEN** se solicita crear un tag con el nombre ` globular `
- **THEN** el tag queda registrado con el nombre `globular`

#### Scenario: Tag sin nombre

- **WHEN** se solicita crear un tag con el nombre vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nombre es obligatorio, y no se crea ningún tag

### Requirement: Unicidad de los nombres de tag en el catálogo

El sistema SHALL rechazar la creación de un tag cuyo nombre ya exista en el catálogo, considerando iguales los nombres que solo difieren en mayúsculas/minúsculas o en espacios al principio y al final. El rechazo SHALL ser un error controlado del cliente, nunca un error interno del servidor.

#### Scenario: Tag duplicado exacto

- **WHEN** existe el tag `globular` y se solicita crear otro tag `globular`
- **THEN** la respuesta es `409 Conflict` con un cuerpo de error que indica que el tag ya existe, y el catálogo sigue teniendo un único tag `globular`

#### Scenario: Tag duplicado con distinta capitalización o espacios

- **WHEN** existe el tag `globular` y se solicita crear el tag ` Globular `
- **THEN** la respuesta es `409 Conflict` y no se crea un segundo tag

### Requirement: Listado de tags

El sistema SHALL exponer el catálogo de tags registrados, de forma que puedan reutilizarse al etiquetar una planta o al filtrar el inventario.

#### Scenario: Catálogo con tags

- **WHEN** existen los tags `globular`, `pequeño` y `híbrido` y se consulta el catálogo de tags
- **THEN** la respuesta es `200 OK` y contiene los tres tags con su identificador y su nombre

### Requirement: Paginación de los listados de catálogo

Los listados de localizaciones y de tags SHALL devolverse siempre paginados, nunca como una colección completa sin límite, con la misma forma de respuesta que el listado de inventario: contenido de la página, total de elementos, total de páginas, número de página y tamaño de página aplicado. La página y el tamaño SHALL poder indicarse en la petición; en su ausencia se aplica el tamaño de página por defecto configurado, y el tamaño solicitado SHALL quedar limitado al máximo configurado.

#### Scenario: Catálogo paginado por defecto

- **WHEN** se consulta el catálogo de tags sin indicar página ni tamaño
- **THEN** la respuesta devuelve la primera página con el tamaño de página por defecto configurado, e incluye el total de elementos, el total de páginas, el número de página y el tamaño aplicado

#### Scenario: Catálogo con tamaño de página explícito

- **WHEN** existen 5 localizaciones y se consulta el catálogo pidiendo la primera página con tamaño 2
- **THEN** la respuesta contiene 2 localizaciones, el total de elementos es 5 y el total de páginas es 3

#### Scenario: Tamaño de página por encima del máximo

- **WHEN** se consulta un catálogo pidiendo un tamaño de página mayor que el máximo configurado
- **THEN** la respuesta se sirve con el tamaño máximo configurado, y el tamaño de página indicado en la respuesta es ese máximo
