## ADDED Requirements

### Requirement: Portada y recuento de fotografías de la especie

Cada fila de `GET /species` y la ficha `GET /species/{id}` SHALL traer **`primaryPhoto`** —identificador, texto alternativo y las rutas de sus variantes— y **`photoCount`**; sin fotografías, la primera se omite y el recuento es `0`. Para la página entera SHALL bastar **una consulta agregada**. Retirar una especie —solo posible sin ejemplares— SHALL **retirar también sus fotografías**: las filas y, tras confirmarse, sus archivos. La exportación a CSV NO SHALL cambiar.

#### Scenario: Una especie con portada

- **WHEN** una especie tiene tres fotografías
- **THEN** su fila trae la principal y `photoCount` 3

#### Scenario: Sin fotografías

- **WHEN** una especie no tiene fotografías
- **THEN** su fila no trae `primaryPhoto` y `photoCount` es 0

#### Scenario: Sin una consulta por fila

- **WHEN** se lista una página de 25 especies
- **THEN** las portadas y los recuentos se obtienen con una sola consulta agregada

#### Scenario: Retirar una especie retira sus fotografías

- **WHEN** se retira una especie sin ejemplares que tiene fotografías
- **THEN** sus filas de fotografía desaparecen y sus archivos se retiran tras confirmarse

#### Scenario: Retirar una especie con ejemplares sigue siendo 409

- **WHEN** se intenta retirar una especie con ejemplares
- **THEN** la respuesta es `409` y sus fotografías se conservan
