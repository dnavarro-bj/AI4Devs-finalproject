## ADDED Requirements

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
