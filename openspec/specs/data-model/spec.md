# data-model Specification

## Purpose

Define el esquema de persistencia del MVP de Cactify: catálogos de mezclas de tierra, especies, localizaciones y tags, inventario de plantas, lecturas de cuidado y recomendaciones de IA, con su integridad referencial, restricciones de dominio y datos semilla.

## Requirements

### Requirement: Esquema de base de datos del MVP

El sistema SHALL crear, mediante migraciones versionadas, las tablas `soil_mix`, `species`, `location`, `plant`, `tag`, `plant_tag`, `care_record` y `ai_recommendation` con los campos descritos en el modelo de datos del README (§3.2), usando TSID (identificador de 64 bits ordenado por tiempo, almacenado como `bigint` y generado por la aplicación) como clave primaria en todas las tablas salvo `plant_tag`, cuya clave primaria es la compuesta (`plant_id`, `tag_id`).

#### Scenario: Migraciones sobre base de datos limpia

- **WHEN** se ejecutan las migraciones sobre una base de datos PostgreSQL vacía
- **THEN** todas las migraciones terminan sin error y las 8 tablas existen con sus claves primarias

#### Scenario: Migraciones idempotentes por versionado

- **WHEN** se arranca de nuevo la aplicación sobre una base de datos ya migrada
- **THEN** no se vuelve a aplicar ninguna migración ya ejecutada y el arranque termina sin error

### Requirement: Integridad referencial

El sistema SHALL imponer claves foráneas entre las tablas: `species.soil_mix_id` → `soil_mix.id`, `plant.species_id` → `species.id`, `plant.location_id` → `location.id`, `plant_tag.plant_id` → `plant.id`, `plant_tag.tag_id` → `tag.id`, `care_record.plant_id` → `plant.id` y `ai_recommendation.care_record_id` → `care_record.id`.

#### Scenario: Planta con especie inexistente

- **WHEN** se intenta insertar una planta cuyo `species_id` no existe en `species`
- **THEN** la base de datos rechaza la inserción con una violación de clave foránea

#### Scenario: Lectura con planta inexistente

- **WHEN** se intenta insertar una lectura (`care_record`) cuyo `plant_id` no existe en `plant`
- **THEN** la base de datos rechaza la inserción con una violación de clave foránea

### Requirement: Campos obligatorios

El sistema SHALL exigir valor no nulo en los campos obligatorios; como mínimo: `species.scientific_name`, `plant.species_id` y `care_record.recorded_at`.

#### Scenario: Especie sin nombre científico

- **WHEN** se intenta insertar una especie sin nombre científico
- **THEN** la inserción se rechaza por violación de `NOT NULL`

#### Scenario: Lectura sin fecha

- **WHEN** se intenta insertar una lectura sin `recorded_at`
- **THEN** la inserción se rechaza por violación de `NOT NULL`

### Requirement: Restricciones de dominio de la mezcla de tierra

El sistema SHALL garantizar que en toda mezcla de tierra persistida `organic_percentage + mineral_percentage = 100` y `ph_min <= ph_max`.

#### Scenario: Porcentajes que no suman 100

- **WHEN** se intenta persistir una mezcla con `organic_percentage = 30` y `mineral_percentage = 60`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Rango de pH invertido

- **WHEN** se intenta persistir una mezcla con `ph_min = 7.0` y `ph_max = 5.5`
- **THEN** la operación se rechaza con un error de validación

### Requirement: Unicidad de tags

El sistema SHALL impedir que existan dos tags con el mismo nombre, considerando iguales los nombres que solo difieren en mayúsculas/minúsculas o espacios al principio y al final.

#### Scenario: Tag duplicado exacto

- **WHEN** existe el tag `globular` y se intenta crear otro tag `globular`
- **THEN** la operación se rechaza por violación de unicidad

#### Scenario: Tag duplicado con distinta capitalización o espacios

- **WHEN** existe el tag `globular` y se intenta crear el tag ` Globular `
- **THEN** la operación se rechaza por considerarse el mismo nombre

### Requirement: Datos semilla

El sistema SHALL cargar datos semilla reproducibles con al menos 2 mezclas de tierra, 2 especies (cada una con todos sus rangos de cuidado y mezcla de tierra asociada), 2 localizaciones y 3 tags de ejemplo, de forma que el flujo E2E pueda probarse sin introducir catálogos manualmente.

#### Scenario: Especie sembrada completa

- **WHEN** se consultan las especies tras ejecutar las migraciones sobre una base de datos limpia
- **THEN** existe al menos una especie con nombre científico, nombre común, rangos de humedad, temperatura y horas de luz, pauta de riego y mezcla de tierra asociada

#### Scenario: Semillas idempotentes

- **WHEN** la aplicación se arranca varias veces sobre la misma base de datos
- **THEN** los datos semilla no se duplican

### Requirement: Marcas de tiempo de auditoría

Toda tabla del esquema SHALL registrar cuándo se creó su fila y cuándo se modificó por última vez. Ambas marcas son obligatorias: una fila no puede existir sin ellas, ni siquiera cuando se inserta directamente por SQL sin pasar por la aplicación.

Al crear una fila, ambas marcas SHALL reflejar el mismo momento. Al modificarla, la marca de modificación SHALL avanzar y la de creación SHALL permanecer intacta.

#### Scenario: Fila creada por la aplicación

- **WHEN** se persiste una entidad nueva
- **THEN** su marca de creación y su marca de modificación quedan informadas y son iguales

#### Scenario: Fila modificada por la aplicación

- **WHEN** se modifica una entidad ya persistida
- **THEN** su marca de modificación avanza respecto al valor anterior y su marca de creación no cambia

#### Scenario: Fila insertada directamente por SQL

- **WHEN** se inserta una fila con `INSERT` sin indicar las marcas de tiempo
- **THEN** la fila queda persistida con ambas marcas informadas al momento de la inserción

#### Scenario: Marca de tiempo nula

- **WHEN** se intenta insertar una fila forzando una marca de creación nula
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Tabla de unión sin entidad

- **WHEN** se asignan tags a una planta y se inspeccionan las filas de la tabla de unión resultantes
- **THEN** cada fila lleva sus marcas de tiempo informadas, aunque ninguna entidad las gestione

### Requirement: Representación temporal de las fechas

Toda fecha del sistema SHALL persistirse como un instante en el tiempo, sin desplazamiento horario propio, y SHALL exponerse en el API en tiempo universal coordinado. Dos despliegues del sistema en zonas horarias distintas SHALL devolver la misma representación para el mismo instante.

#### Scenario: Fecha recuperada tal y como se guardó

- **WHEN** se persiste una entidad con una fecha y se recupera después
- **THEN** la fecha recuperada representa el mismo instante que la guardada

#### Scenario: Fecha aportada con desplazamiento horario

- **WHEN** se persiste una fecha expresada con un desplazamiento horario distinto del universal
- **THEN** se guarda el instante equivalente, y al recuperarla se obtiene ese mismo instante

#### Scenario: Representación independiente de la zona del servidor

- **WHEN** se consulta por el API un recurso que incluye una fecha
- **THEN** la fecha se representa en tiempo universal coordinado, con independencia de la zona horaria de la máquina que sirve la petición
