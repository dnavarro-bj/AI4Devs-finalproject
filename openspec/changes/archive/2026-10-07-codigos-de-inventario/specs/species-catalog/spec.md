## ADDED Requirements

### Requirement: Código de una especie

Toda especie SHALL tener un **código de inventario** único con la forma `CAT-GRUSS`: letras mayúsculas y cifras, con guiones entre grupos, y no más de 20 caracteres. Es el prefijo del código de cada uno de sus ejemplares.

El código es **obligatorio al dar de alta** una especie: lo indica quien la da de alta y el sistema no lo propone ni lo deduce del nombre. SHALL normalizarse a mayúsculas y sin espacios al principio ni al final. Un código ausente, en blanco o con formato inválido SHALL rechazarse con `400 Bad Request`, y uno ya usado por otra especie con `409 Conflict`; en ningún caso con un error interno del servidor.

El código SHALL viajar en el listado del catálogo y en la ficha de la especie.

#### Scenario: Código indicado

- **WHEN** se da de alta una especie indicando el código ` cat-gruss `
- **THEN** la respuesta es `201 Created` y la especie queda con el código `CAT-GRUSS`

#### Scenario: Alta sin código

- **WHEN** se da de alta una especie sin indicar código, o con el código vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el código es obligatorio, y no se crea ninguna especie

#### Scenario: Código ya usado

- **WHEN** se da de alta una especie con un código que ya tiene otra
- **THEN** la respuesta es `409 Conflict` con un cuerpo de error que dice que el código ya existe, y no se crea ninguna especie

#### Scenario: Código con formato inválido

- **WHEN** se da de alta una especie con un código que contiene espacios, símbolos o más de 20 caracteres
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se crea ninguna especie

#### Scenario: El código viaja en el listado y en la ficha

- **WHEN** se consulta el catálogo o la ficha de una especie
- **THEN** la respuesta incluye su código

### Requirement: Ejemplares de una especie en su ficha

La ficha de una especie SHALL incluir **cuántos ejemplares tiene**, incluido el cero, porque es la cifra que decide si su código se puede corregir. El listado del catálogo no la lleva: resolverla por fila sería una consulta por especie.

#### Scenario: Especie con ejemplares

- **WHEN** se consulta la ficha de una especie con tres ejemplares
- **THEN** la respuesta indica tres ejemplares

#### Scenario: Especie sin ejemplares

- **WHEN** se consulta la ficha de una especie que ninguna planta tiene
- **THEN** la respuesta indica cero ejemplares, no omite la cifra

### Requirement: Corrección del código de una especie mientras no tenga ejemplares

El sistema SHALL permitir corregir el código de una especie **mientras no tenga ejemplares**. Cuando tiene alguno, SHALL rechazar el cambio con `409 Conflict` explicando que el código ya identifica plantas, y la especie SHALL conservar el que tenía. Enviar el mismo código que ya tiene no es un cambio y SHALL aceptarse, con o sin ejemplares. Un código nuevo ya usado por otra especie SHALL rechazarse con `409 Conflict`.

La actualización de la ficha es reemplazo completo, así que SHALL llevar también el código, con las mismas reglas de obligatoriedad y formato que el alta.

#### Scenario: Corrección sin ejemplares

- **WHEN** se cambia el código de una especie que no tiene ejemplares a otro libre
- **THEN** la respuesta es `200 OK` con el código nuevo, y la ficha posterior lo refleja

#### Scenario: Corrección con ejemplares

- **WHEN** se cambia el código de una especie que tiene al menos un ejemplar
- **THEN** la respuesta es `409 Conflict` explicando que el código ya identifica plantas, y la especie conserva su código

#### Scenario: Mismo código con ejemplares

- **WHEN** se actualiza la ficha de una especie con ejemplares enviando su mismo código
- **THEN** la respuesta es `200 OK` y el resto de cambios de la ficha se aplican

#### Scenario: Actualización sin código

- **WHEN** se actualiza la ficha de una especie sin indicar código
- **THEN** la respuesta es `400 Bad Request` y la especie conserva el suyo

#### Scenario: Código nuevo ya usado

- **WHEN** se cambia el código de una especie sin ejemplares a uno que ya tiene otra
- **THEN** la respuesta es `409 Conflict` y la especie conserva su código

#### Scenario: Corregir el código no cambia el de ningún ejemplar

- **WHEN** se corrige el código de una especie sin ejemplares y después se da de alta un ejemplar suyo
- **THEN** el ejemplar nace con el código nuevo de la especie
