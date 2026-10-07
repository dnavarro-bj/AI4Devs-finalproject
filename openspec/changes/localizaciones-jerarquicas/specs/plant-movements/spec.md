## Purpose

Mover ejemplares entre localizaciones, de uno en uno o por lote, y conservar dónde estuvo cada uno: origen, destino y fecha, para saber dónde ha estado una planta y no solo dónde está ahora.

## ADDED Requirements

### Requirement: Mover ejemplares a una localización

El sistema SHALL permitir mover uno o varios ejemplares a una localización con `POST /locations/{id}/movements`, indicando la lista de ejemplares. La operación SHALL ser **atómica**: o se mueven todos o no se mueve ninguno. Para cada ejemplar que cambia de sitio SHALL registrarse un movimiento con su localización de origen, la de destino y **el instante en que ocurrió**, y la respuesta SHALL decir cuántos ejemplares se movieron.

Un ejemplar que **ya está** en el destino SHALL ignorarse sin error ni movimiento, y la respuesta SHALL distinguirlo de los movidos. Una lista vacía, o con ejemplares repetidos, SHALL responder `400`. Un ejemplar inexistente en la lista SHALL responder `400` —es una referencia del cuerpo— y un destino inexistente `404`; en ambos casos sin mover nada.

#### Scenario: Mover varios ejemplares

- **WHEN** se mueven tres ejemplares de `Bandeja A3` y `Bandeja A4` a `Bandeja B1`
- **THEN** la respuesta es `200 OK` con `moved: 3`, los tres figuran en `Bandeja B1` y existen tres movimientos con su origen real, su destino y su instante

#### Scenario: Un ejemplar que ya está en el destino

- **WHEN** se mueven dos ejemplares a `Bandeja B1`, uno de los cuales ya estaba en ella
- **THEN** la respuesta indica `moved: 1` y `unchanged: 1`, y solo existe un movimiento nuevo

#### Scenario: Un ejemplar inexistente deshace el lote

- **WHEN** se mueve una lista donde uno de los identificadores no existe
- **THEN** la respuesta es `400 Bad Request` y ningún ejemplar de la lista cambia de localización ni genera movimiento

#### Scenario: Lista vacía o con repetidos

- **WHEN** se mueve una lista vacía, o con el mismo ejemplar dos veces
- **THEN** la respuesta es `400 Bad Request` y no se registra nada

#### Scenario: Destino inexistente

- **WHEN** se mueven ejemplares a una localización que no existe
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

### Requirement: Historial de movimientos

El sistema SHALL exponer el historial de movimientos de **un ejemplar** (`GET /plants/{id}/movements`) y de **una localización** (`GET /locations/{id}/movements`), este último con los movimientos cuyo origen o destino es esa localización, **no** los de sus descendientes. Ambos SHALL ir paginados y del más reciente al más antiguo, y cada movimiento SHALL llevar el ejemplar (identificador y código), el origen y el destino con su nombre, y el instante.

#### Scenario: Historial de un ejemplar

- **WHEN** un ejemplar se ha movido dos veces y se consulta su historial
- **THEN** aparecen los dos movimientos, el más reciente primero, encadenados: el destino del primero es el origen del segundo

#### Scenario: Historial de una localización

- **WHEN** una localización ha recibido cinco ejemplares y ha cedido tres, y se consulta su historial
- **THEN** aparecen los ocho movimientos, con su sentido —recibido o cedido— deducible de origen y destino

#### Scenario: Ejemplar sin movimientos

- **WHEN** se consulta el historial de un ejemplar que nunca se ha movido
- **THEN** la respuesta es `200 OK` con contenido vacío

#### Scenario: Entidad inexistente

- **WHEN** se consulta el historial de un ejemplar o una localización que no existen
- **THEN** la respuesta es `404 Not Found`

### Requirement: La edición que cambia de localización es un movimiento

Cuando `PUT /plants/{id}` cambie la localización del ejemplar, el sistema SHALL registrar un movimiento igual que el de un lote de uno, **en la misma transacción** que la edición. Si la localización no cambia, SHALL NOT registrarse ninguno. Si la edición se rechaza, no queda ni cambio ni movimiento.

#### Scenario: La edición cambia de sitio

- **WHEN** se edita un ejemplar indicando otra localización
- **THEN** el historial del ejemplar gana un movimiento del sitio anterior al nuevo

#### Scenario: La edición no cambia de sitio

- **WHEN** se edita solo el apodo de un ejemplar
- **THEN** el historial del ejemplar no cambia

#### Scenario: Edición rechazada

- **WHEN** una edición que cambia de localización se rechaza por una especie inexistente
- **THEN** el ejemplar conserva su localización y no se registra ningún movimiento

### Requirement: El alta de un ejemplar no es un movimiento

El sistema SHALL NOT registrar un movimiento al crear un ejemplar: nace en su localización, no llega a ella.

#### Scenario: Ejemplar recién creado

- **WHEN** se crea un ejemplar
- **THEN** su historial de movimientos está vacío
