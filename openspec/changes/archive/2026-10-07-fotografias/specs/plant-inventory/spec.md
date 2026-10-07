## ADDED Requirements

### Requirement: Portada y recuento de fotografías del ejemplar

Cada fila de `GET /plants` y el detalle `GET /plants/{id}` SHALL traer **`primaryPhoto`** —identificador, texto alternativo y las rutas de sus variantes— y **`photoCount`**; sin fotografías, la primera se omite y el recuento es `0`. Para la página entera SHALL bastar **una consulta agregada**. Un ejemplar sin fotografías SHALL seguir siendo plenamente válido y **crear un ejemplar NO SHALL requerir ninguna**.

#### Scenario: Un ejemplar con portada

- **WHEN** un ejemplar tiene cuatro fotografías
- **THEN** su fila y su detalle traen la principal y `photoCount` 4

#### Scenario: Sin fotografías

- **WHEN** un ejemplar no tiene ninguna
- **THEN** no trae `primaryPhoto` y `photoCount` es 0

#### Scenario: Sin una consulta por fila

- **WHEN** se lista una página de 25 ejemplares
- **THEN** las portadas y los recuentos se obtienen con una sola consulta agregada

#### Scenario: Las de la especie no cuentan

- **WHEN** la especie de un ejemplar tiene fotografías y el ejemplar ninguna
- **THEN** el ejemplar no trae portada y su recuento es 0
