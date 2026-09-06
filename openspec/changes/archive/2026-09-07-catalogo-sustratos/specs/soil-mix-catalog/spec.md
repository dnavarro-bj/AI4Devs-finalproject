## Purpose

El catálogo de mezclas de sustrato como API REST: alta, consulta, listado, corrección y retirada de las recetas que las especies recomiendan, con sus invariantes de composición y la protección de las que están en uso.

## ADDED Requirements

### Requirement: Alta de una mezcla de sustrato

El sistema SHALL permitir registrar una mezcla indicando su nombre, su porcentaje orgánico, su porcentaje mineral, su rango de pH recomendado y, opcionalmente, una descripción. La mezcla registrada SHALL quedar disponible en el catálogo para asociarse a una especie.

#### Scenario: Mezcla registrada

- **WHEN** se registra una mezcla con nombre, porcentajes que suman 100 y un rango de pH válido
- **THEN** la respuesta es `201 Created` con la mezcla y su identificador

#### Scenario: Nombre en blanco

- **WHEN** se registra una mezcla sin nombre
- **THEN** la respuesta es `400 Bad Request` explicando que el nombre es obligatorio

### Requirement: Composición coherente de la mezcla

El sistema SHALL rechazar toda mezcla cuyos porcentajes orgánico y mineral **no sumen exactamente 100**, cuyo pH quede fuera de la escala 0–14, o cuyo pH mínimo supere al máximo. El rechazo SHALL ser un `400` con el motivo, **nunca** un fallo inesperado.

#### Scenario: Porcentajes que no suman 100

- **WHEN** se registra una mezcla cuyos porcentajes suman un valor distinto de 100
- **THEN** la respuesta es `400 Bad Request` indicando cuánto suman

#### Scenario: pH fuera de la escala

- **WHEN** se registra una mezcla con un pH fuera del rango 0–14
- **THEN** la respuesta es `400 Bad Request` indicando que está fuera de la escala

#### Scenario: Rango de pH invertido

- **WHEN** se registra una mezcla cuyo pH mínimo supera al máximo
- **THEN** la respuesta es `400 Bad Request` indicando ambos valores

#### Scenario: La misma regla al corregir

- **WHEN** se corrige una mezcla dejándola con una composición inválida
- **THEN** se rechaza igual que en el alta, y la mezcla conserva sus valores anteriores

### Requirement: Consulta y listado de mezclas

El sistema SHALL exponer la consulta de una mezcla por su identificador y el listado del catálogo, paginado con el envelope común. Una mezcla inexistente SHALL responder `404`.

#### Scenario: Consulta de una mezcla

- **WHEN** se consulta una mezcla existente por su identificador
- **THEN** la respuesta incluye su nombre, sus porcentajes, su rango de pH y su descripción

#### Scenario: Mezcla inexistente

- **WHEN** se consulta un identificador que no corresponde a ninguna mezcla
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

#### Scenario: Listado paginado

- **WHEN** se consulta el catálogo de mezclas
- **THEN** se devuelve paginado con el envelope común y en un orden estable

### Requirement: Corrección de una mezcla

El sistema SHALL permitir corregir el nombre, la composición, el rango de pH y la descripción de una mezcla existente. La corrección SHALL alcanzar a las especies que la recomiendan, porque la relación es por referencia y no por copia.

#### Scenario: Mezcla corregida

- **WHEN** se corrige una mezcla existente con valores válidos
- **THEN** la respuesta refleja los valores nuevos

#### Scenario: Corrección de una mezcla inexistente

- **WHEN** se corrige un identificador que no corresponde a ninguna mezcla
- **THEN** la respuesta es `404 Not Found`

### Requirement: Retirada de una mezcla en uso

El sistema SHALL permitir retirar una mezcla del catálogo, **salvo que alguna especie la recomiende**. En ese caso SHALL responder `409 Conflict` explicando la causa, y la mezcla SHALL permanecer. La retirada NUNCA SHALL producir un fallo de integridad de la base de datos.

#### Scenario: Retirada de una mezcla sin uso

- **WHEN** se retira una mezcla que ninguna especie recomienda
- **THEN** la respuesta es `204 No Content` y deja de aparecer en el catálogo

#### Scenario: Retirada de una mezcla en uso

- **WHEN** se retira una mezcla que alguna especie recomienda
- **THEN** la respuesta es `409 Conflict` explicando que está en uso, y la mezcla permanece

#### Scenario: Retirada de una mezcla inexistente

- **WHEN** se retira un identificador que no corresponde a ninguna mezcla
- **THEN** la respuesta es `404 Not Found`
