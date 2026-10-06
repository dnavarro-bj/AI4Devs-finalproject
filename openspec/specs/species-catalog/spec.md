# species-catalog Specification

## Purpose

El catálogo de especies expuesto como API REST, con su ciclo de vida completo —alta, consulta, edición y retirada—: la base de conocimiento determinista de cuidados recomendados —rangos de humedad, temperatura y horas de luz, pauta de riego y mezcla de tierra— que se consulta al elegir una especie y al registrar una lectura, y que la recomendación de IA usa como referencia.

## Requirements

### Requirement: Alta de una especie con sus cuidados recomendados

El sistema SHALL permitir crear una especie indicando su nombre científico, su nombre común, los rangos mínimo y máximo de humedad, de temperatura y de horas de luz, la pauta orientativa de riego y la mezcla de tierra recomendada, y SHALL devolver la especie creada con el identificador asignado. Todos esos datos son obligatorios.

#### Scenario: Especie creada correctamente

- **WHEN** se solicita crear la especie `Ferocactus glaucescens` / `Biznaga azul`, con humedad entre 10 y 30, temperatura entre 12 y 35, horas de luz entre 6 y 10, pauta de riego `cada 15 dias en crecimiento` y una mezcla de tierra existente
- **THEN** la respuesta es `201 Created` e incluye el identificador asignado, ambos nombres, los seis límites de rango y la pauta de riego

#### Scenario: Especie recién creada disponible en el catálogo

- **WHEN** se crea una especie y a continuación se consulta el catálogo de especies
- **THEN** la especie creada está presente en el resultado y puede seleccionarse para registrar una planta

### Requirement: Validación de los datos de la especie

El sistema SHALL rechazar con un error del cliente, nunca con un error interno del servidor, el alta de una especie cuyos datos estén incompletos o sean incoherentes: un nombre científico, un nombre común o una pauta de riego en blanco, o un límite mínimo mayor que su máximo correspondiente.

#### Scenario: Nombre científico en blanco

- **WHEN** se solicita crear una especie con el nombre científico vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nombre científico es obligatorio, y no se crea ninguna especie

#### Scenario: Rango invertido

- **WHEN** se solicita crear una especie con humedad mínima 40 y humedad máxima 20
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el mínimo no puede superar al máximo, y no se crea ninguna especie

#### Scenario: Pauta de riego en blanco

- **WHEN** se solicita crear una especie con la pauta de riego vacía o solo espacios
- **THEN** la respuesta es `400 Bad Request` y no se crea ninguna especie

### Requirement: Mezcla de tierra recomendada de la especie

Toda especie SHALL quedar asociada a una mezcla de tierra del catálogo de mezclas, indicada en el alta por su identificador. Si el identificador no corresponde a ninguna mezcla existente, el alta SHALL rechazarse como dato inválido de la petición, no como recurso ausente ni como error interno del servidor.

#### Scenario: Mezcla de tierra inexistente

- **WHEN** se solicita crear una especie indicando un identificador de mezcla de tierra que no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que esa mezcla no existe, y no se crea ninguna especie

#### Scenario: Mezcla de tierra ausente

- **WHEN** se solicita crear una especie sin indicar mezcla de tierra
- **THEN** la respuesta es `400 Bad Request` y no se crea ninguna especie

### Requirement: Unicidad del nombre científico

El sistema SHALL rechazar tanto la creación como la actualización de una especie cuando el nombre científico resultante ya lo ocupe **otra** especie del catálogo. Conservar el propio nombre al actualizar no SHALL considerarse un conflicto. El rechazo SHALL ser un error controlado del cliente, nunca un error interno del servidor.

#### Scenario: Nombre científico duplicado al crear

- **WHEN** existe la especie `Echinocactus grusonii` y se solicita crear otra especie con ese mismo nombre científico
- **THEN** la respuesta es `409 Conflict` con un cuerpo de error que indica que la especie ya existe, y el catálogo sigue teniendo una única especie con ese nombre científico

#### Scenario: Nombre científico duplicado al actualizar

- **WHEN** existen las especies `Echinocactus grusonii` y `Mammillaria elongata` y se solicita actualizar la segunda dándole el nombre científico de la primera
- **THEN** la respuesta es `409 Conflict` y ninguna de las dos especies cambia

#### Scenario: Actualización que conserva el propio nombre científico

- **WHEN** se solicita actualizar una especie cambiándole solo la pauta de riego y enviando su mismo nombre científico
- **THEN** la actualización se acepta y no se reporta ningún conflicto

### Requirement: Listado del catálogo de especies

El sistema SHALL exponer el catálogo de especies registradas con su identificador, su nombre científico y su nombre común, de forma que pueda seleccionarse una especie al registrar una planta. El listado SHALL tener un orden estable entre páginas consecutivas.

#### Scenario: Catálogo con especies

- **WHEN** existen las especies `Echinocactus grusonii` y `Mammillaria elongata` y se consulta el catálogo de especies
- **THEN** la respuesta es `200 OK` y contiene ambas con su identificador, su nombre científico y su nombre común

#### Scenario: Orden estable del listado

- **WHEN** se consulta el catálogo de especies sin indicar criterio de orden
- **THEN** las especies se devuelven ordenadas por su nombre científico, y dos páginas consecutivas ni repiten ni omiten ninguna especie

### Requirement: Paginación del catálogo de especies

El listado de especies SHALL devolverse siempre paginado, nunca como una colección completa sin límite, con la misma forma de respuesta que el resto de listados del API: contenido de la página, total de elementos, total de páginas, número de página y tamaño de página aplicado. La página y el tamaño SHALL poder indicarse en la petición; en su ausencia se aplica el tamaño de página por defecto configurado, y el tamaño solicitado SHALL quedar limitado al máximo configurado.

#### Scenario: Catálogo paginado por defecto

- **WHEN** se consulta el catálogo de especies sin indicar página ni tamaño
- **THEN** la respuesta devuelve la primera página con el tamaño de página por defecto configurado, e incluye el total de elementos, el total de páginas, el número de página y el tamaño aplicado

#### Scenario: Catálogo con tamaño de página explícito

- **WHEN** existen 5 especies y se consulta el catálogo pidiendo la primera página con tamaño 2
- **THEN** la respuesta contiene 2 especies, el total de elementos es 5 y el total de páginas es 3

#### Scenario: Tamaño de página por encima del máximo

- **WHEN** se consulta el catálogo de especies pidiendo un tamaño de página mayor que el máximo configurado
- **THEN** la respuesta se sirve con el tamaño máximo configurado, y el tamaño de página indicado en la respuesta es ese máximo

### Requirement: Ficha de cuidados recomendados de una especie

El sistema SHALL exponer la ficha de una especie concreta con los rangos mínimo y máximo de humedad, de temperatura y de horas de luz, la pauta orientativa de riego y **la mezcla de sustrato que tiene recomendada**, además de su identificador y sus dos nombres, de forma que puedan consultarse las condiciones ideales de cultivo sin necesidad de tener una planta de esa especie registrada. Estos datos proceden del catálogo, no de la IA.

La mezcla SHALL viajar identificada, no solo por su nombre: el alta y la corrección de una especie la exigen por identificador, así que sin él **la ficha no basta para reconstruir la especie** y una corrección perdería su mezcla.

#### Scenario: Ficha de una especie existente

- **WHEN** se consulta la ficha de una especie registrada
- **THEN** la respuesta es `200 OK` e incluye su identificador, su nombre científico, su nombre común, los rangos de humedad, de temperatura y de horas de luz, la pauta de riego y su mezcla de sustrato con el identificador y el nombre de esta

#### Scenario: La ficha basta para corregir la especie

- **WHEN** se consulta la ficha de una especie y se envía de vuelta sin cambios como corrección
- **THEN** la especie conserva la mezcla de sustrato que tenía, porque la ficha la incluía

#### Scenario: Ficha de una especie inexistente

- **WHEN** se consulta la ficha de un identificador de especie que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error que indica que la especie no existe

#### Scenario: Identificador de especie con formato inválido

- **WHEN** se consulta la ficha indicando un identificador que no es una cadena decimal
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica el formato inválido, y no un error interno del servidor

### Requirement: Actualización de una especie

El sistema SHALL permitir actualizar la ficha de una especie existente sustituyendo por completo sus datos: los dos nombres, los tres pares de rangos, la pauta de riego y la mezcla de tierra recomendada. Todos son obligatorios, se validan igual que en el alta, y la operación SHALL ser idempotente: repetirla con los mismos datos deja la especie en el mismo estado. Actualizar una especie inexistente SHALL responderse como recurso ausente.

#### Scenario: Especie actualizada correctamente

- **WHEN** se solicita actualizar una especie existente con humedad entre 15 y 35, temperatura entre 8 y 30, horas de luz entre 5 y 9 y la pauta de riego `cada 20 dias en crecimiento`
- **THEN** la respuesta es `200 OK` con los datos actualizados, y consultar su ficha a continuación devuelve esos mismos valores

#### Scenario: Actualización repetida

- **WHEN** se solicita dos veces seguidas la misma actualización sobre la misma especie
- **THEN** ambas respuestas son `200 OK` y la especie queda con los mismos datos que tras la primera

#### Scenario: Actualización con datos inválidos

- **WHEN** se solicita actualizar una especie con la temperatura mínima 30 y la máxima 10, o con el nombre común en blanco
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y la especie conserva sus datos anteriores

#### Scenario: Actualización de una especie inexistente

- **WHEN** se solicita actualizar un identificador de especie que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error que indica que la especie no existe

### Requirement: Propagación de la ficha a los ejemplares

Los cuidados recomendados que se consultan para una planta SHALL ser siempre los vigentes en la ficha de su especie, de modo que actualizar la ficha se refleje en todos sus ejemplares sin tocarlos uno a uno.

#### Scenario: La planta refleja la ficha actualizada de su especie

- **WHEN** existe una planta de una especie cuya humedad recomendada va de 10 a 30, y se actualiza esa especie para que vaya de 20 a 40
- **THEN** consultar el detalle de la planta devuelve la humedad recomendada de 20 a 40

### Requirement: Retirada de una especie del catálogo

El sistema SHALL permitir eliminar una especie del catálogo cuando ninguna planta la use. Si tiene ejemplares registrados, la eliminación SHALL rechazarse como conflicto controlado del cliente —nunca como error interno del servidor— y ni la especie ni sus plantas SHALL verse afectadas. Eliminar una especie inexistente SHALL responderse como recurso ausente.

#### Scenario: Especie sin ejemplares eliminada

- **WHEN** se solicita eliminar una especie que no tiene ninguna planta registrada
- **THEN** la respuesta es `204 No Content` y la especie deja de aparecer en el catálogo y en su ficha

#### Scenario: Especie con ejemplares

- **WHEN** se solicita eliminar una especie que tiene al menos una planta registrada
- **THEN** la respuesta es `409 Conflict` con un cuerpo de error que indica que la especie está en uso, la especie sigue en el catálogo y la planta sigue existiendo

#### Scenario: Eliminación de una especie inexistente

- **WHEN** se solicita eliminar un identificador de especie que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error que indica que la especie no existe

### Requirement: Coherencia de los rangos en la base de datos

Las restricciones que garantizan que ningún límite mínimo supera a su máximo y que ningún nombre científico se repite SHALL estar impuestas también en la base de datos, de modo que una fila que las incumpla no pueda persistirse por ninguna vía.

#### Scenario: Escritura directa con un rango invertido

- **WHEN** se intenta insertar directamente en la base de datos una especie con la temperatura mínima mayor que la máxima
- **THEN** la base de datos rechaza la escritura

#### Scenario: Escritura directa con un nombre científico repetido

- **WHEN** se intenta insertar directamente en la base de datos una segunda especie con un nombre científico ya presente
- **THEN** la base de datos rechaza la escritura

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

### Requirement: Filtro del catálogo de especies por código

El listado del catálogo de especies SHALL admitir un filtro opcional por **código**, con la misma coincidencia que el del inventario: **parcial, sin distinguir mayúsculas** y con el texto tratado como literal. Un texto vacío o en blanco SHALL ignorarse y uno sin coincidencias SHALL devolver una página vacía. El filtro SHALL combinarse con la paginación y con el orden del listado.

#### Scenario: Búsqueda por el código

- **WHEN** se consulta el catálogo filtrando por `cat-gruss`
- **THEN** la respuesta contiene la especie cuyo código incluye `CAT-GRUSS`

#### Scenario: Búsqueda parcial

- **WHEN** se consulta el catálogo filtrando por `mamm`
- **THEN** la respuesta contiene las especies cuyo código incluye `MAMM`, y no las demás

#### Scenario: Texto vacío

- **WHEN** se consulta el catálogo con el filtro de código vacío
- **THEN** la respuesta es el catálogo completo

#### Scenario: Sin coincidencias

- **WHEN** se filtra por un texto que no está en ningún código
- **THEN** la respuesta es `200 OK` con una página vacía
