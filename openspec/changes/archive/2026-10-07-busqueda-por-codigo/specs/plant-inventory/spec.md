## ADDED Requirements

### Requirement: Filtro del inventario por código

El listado de plantas SHALL admitir un filtro opcional por **código de inventario**, combinable con el de localización y el de tag y con la paginación. La coincidencia SHALL ser **parcial y sin distinguir mayúsculas ni minúsculas**: el texto buscado puede aparecer en cualquier parte del código, de modo que `gruss` encuentra `CAT-GRUSS-01`. El texto SHALL tratarse como literal: los caracteres que en una consulta de coincidencia valen de comodín no lo son. Un texto vacío o solo de espacios SHALL ignorarse, como si el filtro no se hubiera indicado. Un texto que no coincide con ningún código SHALL devolver una página vacía, nunca un error.

#### Scenario: Búsqueda por el código completo

- **WHEN** se consulta el listado filtrando por el código `CAT-GRUSS-01`
- **THEN** la respuesta contiene la planta con ese código

#### Scenario: Búsqueda parcial sin distinguir mayúsculas

- **WHEN** se consulta el listado filtrando por `gruss`
- **THEN** la respuesta contiene las plantas cuyo código incluye `GRUSS`, y no las de otras especies

#### Scenario: Búsqueda por el prefijo de una especie

- **WHEN** se consulta el listado filtrando por `CAT-GRUSS-`
- **THEN** la respuesta contiene todos los ejemplares de esa especie y ninguno de otra

#### Scenario: Combinado con otros filtros

- **WHEN** se filtra por código y por localización a la vez
- **THEN** la respuesta contiene solo las plantas que cumplen las dos condiciones

#### Scenario: Texto vacío

- **WHEN** se consulta el listado con el filtro de código vacío o en blanco
- **THEN** la respuesta es el listado completo, como sin filtro

#### Scenario: Sin coincidencias

- **WHEN** se filtra por un texto que no está en ningún código
- **THEN** la respuesta es `200 OK` con una página vacía y el total a cero

#### Scenario: Los comodines se buscan como texto

- **WHEN** se filtra por `%` o por `_`
- **THEN** la respuesta no contiene plantas, porque ningún código contiene esos caracteres

#### Scenario: Paginado

- **WHEN** el filtro por código coincide con más plantas que el tamaño de página
- **THEN** la respuesta declara el total de coincidencias y el resto llega en las páginas siguientes
