## ADDED Requirements

### Requirement: Ficha de cultivo de la especie en el esquema

El esquema SHALL añadir a `species` las columnas nulables `description`, `sun_exposure`, `environment`, `bloom_description`, `bloom_color`, `bloom_maturity` y `bloom_typical_duration`, de modo que una especie sin esos datos sea válida. `sun_exposure` SHALL aceptar solo `sombra`, `semisombra`, `soleado` y `pleno_sol`, y `environment` solo `interior`, `exterior` y `ambos`, ambos con restricción `CHECK` en la base de datos.

#### Scenario: Las especies existentes quedan sin definir

- **WHEN** se aplica la migración sobre una base con especies
- **THEN** todas conservan sus datos y quedan con exposición, entorno, descripción y floración sin definir

#### Scenario: Exposición fuera del vocabulario

- **WHEN** se intenta guardar una especie con exposición `radiante` directamente en la base
- **THEN** la base rechaza la fila

#### Scenario: Estacional no es un entorno

- **WHEN** se intenta guardar una especie con entorno `estacional`
- **THEN** la base rechaza la fila

### Requirement: Calendario anual de la especie en el esquema

El esquema SHALL incluir la tabla `species_period` con identificador, especie (clave foránea con borrado en cascada), tipo, mes de inicio, mes de fin, intensidad y notas. El tipo SHALL aceptar solo `crecimiento`, `crecimiento_maximo`, `reposo`, `floracion` y `riego`; `crecimiento_maximo` llega en la migración `V11`, aparte de `V10` porque esta ya estaba aplicada y Flyway rechaza una migración cuyo contenido cambia. Los meses SHALL estar entre 1 y 12 con `CHECK`; **un inicio posterior al fin es válido** y significa que el periodo cruza el fin de año. La intensidad SHALL aceptar solo `escaso`, `moderado` y `abundante`, y SHALL ser obligatoria si y solo si el tipo es `riego`.

#### Scenario: Un periodo que cruza el año

- **WHEN** se guarda un periodo de reposo con inicio `11` y fin `2`
- **THEN** la base lo acepta

#### Scenario: El crecimiento máximo es un tipo de periodo

- **WHEN** se guarda un periodo de tipo `crecimiento_maximo`
- **THEN** la base lo acepta

#### Scenario: Mes fuera de rango

- **WHEN** se intenta guardar un periodo con mes de inicio `13` o mes de fin `0`
- **THEN** la base rechaza la fila

#### Scenario: Intensidad solo en el riego

- **WHEN** se intenta guardar un periodo de crecimiento con intensidad `moderado`, o uno de riego sin intensidad
- **THEN** la base rechaza la fila

#### Scenario: Retirar la especie retira su calendario

- **WHEN** se elimina una especie que tiene periodos
- **THEN** sus periodos desaparecen con ella
