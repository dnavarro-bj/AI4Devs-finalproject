## ADDED Requirements

### Requirement: Búsqueda de texto en localizaciones y etiquetas

`GET /locations` SHALL aceptar `q`: coincidencia parcial, sin distinguir mayúsculas, sobre el **nombre** y el **código** de la localización. `GET /tags` SHALL aceptar `q` sobre el **nombre** de la etiqueta. En ambos el texto SHALL tratarse como literal (`%` y `_` no son comodines) y uno en blanco SHALL no filtrar. El resultado SHALL seguir paginado con `PageResponse` (ADR-009) y conservar el recuento por fila que ya traen.

#### Scenario: Localización por nombre

- **WHEN** se pide `GET /locations?q=invernadero`
- **THEN** devuelve las localizaciones cuyo nombre contiene «invernadero»

#### Scenario: Localización por código

- **WHEN** se pide `GET /locations?q=loc-inv`
- **THEN** devuelve la de código `LOC-INV…`

#### Scenario: Etiqueta por nombre

- **WHEN** se pide `GET /tags?q=glob`
- **THEN** devuelve «globular» y «globulares» con su recuento de plantas

#### Scenario: Comodines como texto

- **WHEN** se pide `GET /tags?q=_`
- **THEN** devuelve solo las etiquetas con un guion bajo literal en el nombre

#### Scenario: En blanco

- **WHEN** `q` solo tiene espacios
- **THEN** el resultado es el del listado sin `q`
