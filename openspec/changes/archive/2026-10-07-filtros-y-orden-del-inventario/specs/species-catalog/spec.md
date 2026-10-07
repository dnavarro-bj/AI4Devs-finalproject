## ADDED Requirements

### Requirement: Búsqueda de texto en el catálogo de especies

`GET /species` SHALL aceptar `q`: coincidencia parcial, sin distinguir mayúsculas, sobre el nombre científico, el nombre común y el código, de modo que la especie encaje si **cualquiera** lo contiene. El texto SHALL tratarse como literal y uno en blanco SHALL no filtrar. El parámetro `code` existente SHALL conservar su comportamiento.

#### Scenario: Por nombre común

- **WHEN** se pide `GET /species?q=suegra`
- **THEN** devuelve la especie cuyo nombre común contiene «suegra»

#### Scenario: Por nombre científico o código

- **WHEN** se pide `GET /species?q=grus`
- **THEN** devuelve la especie cuyo nombre científico o cuyo código `CAT-GRUSS` lo contiene

#### Scenario: Texto en blanco

- **WHEN** `q` solo tiene espacios
- **THEN** el resultado es el mismo que sin `q`

### Requirement: Filtros del catálogo por características de cultivo

`GET /species` SHALL aceptar, combinables con `AND` entre sí y con `q`: `exposure` y `environment` (repetibles; encaja cualquiera de los valores), `soilMix` (identificador de mezcla, repetible), `minTemperatureFrom` y `minTemperatureTo` (la temperatura mínima soportada de la especie está dentro del intervalo, extremos incluidos; cada uno es opcional), y `growthMonth` y `bloomMonth` (enteros 1–12, repetibles, **AND**: la especie tiene un periodo de crecimiento —o de floración— que cubre **todos** los meses indicados). Un periodo cuyo inicio es posterior a su fin SHALL contarse como cruzando el fin de año. Un valor inválido SHALL responder `400`.

#### Scenario: Por exposición

- **WHEN** se pide `GET /species?exposure=semisombra`
- **THEN** devuelve las especies con esa exposición

#### Scenario: Sensibles al frío

- **WHEN** se pide `GET /species?minTemperatureFrom=9`
- **THEN** devuelve las especies cuya temperatura mínima soportada es 9 °C o más

#### Scenario: Intervalo de temperatura

- **WHEN** se pide `GET /species?minTemperatureFrom=5&minTemperatureTo=8`
- **THEN** devuelve las especies con mínima entre 5 y 8 °C, ambas incluidas

#### Scenario: Crecimiento invernal

- **WHEN** se pide `GET /species?growthMonth=12&growthMonth=1&growthMonth=2` y una especie crece de noviembre a marzo
- **THEN** esa especie figura, porque su periodo cruza el fin de año y cubre diciembre, enero y febrero

#### Scenario: El periodo no cubre todos los meses

- **WHEN** una especie crece solo de diciembre a enero y se piden también febrero
- **THEN** esa especie no figura

#### Scenario: Especie sin calendario

- **WHEN** una especie no tiene periodos definidos y se pide `growthMonth=6`
- **THEN** no figura

#### Scenario: Por mezcla de sustrato

- **WHEN** se pide `GET /species?soilMix=<id>`
- **THEN** devuelve las especies que recomiendan esa mezcla

#### Scenario: Valor inválido

- **WHEN** se pide `GET /species?growthMonth=13` o `?exposure=playa` o `?minTemperatureFrom=frio`
- **THEN** responde `400`

### Requirement: Ordenación del catálogo de especies por claves públicas

`GET /species` SHALL ordenar con `sort=<clave>,<asc|desc>`, con las claves `code`, `scientificName`, `commonName` y `exposure`, y desempate por identificador. Una clave ajena SHALL responder `400`; sin `sort`, el orden por defecto no cambia.

#### Scenario: Por nombre científico

- **WHEN** se pide `GET /species?sort=scientificName,asc`
- **THEN** vienen en orden alfabético

#### Scenario: Clave ajena

- **WHEN** se pide `GET /species?sort=periodRows,asc`
- **THEN** responde `400`
