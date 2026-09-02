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

### Requirement: Restricciones de dominio de las lecturas de cultivo

El sistema SHALL garantizar en base de datos que toda lectura de cultivo persistida tiene la humedad entre `0` y `100`, las horas de luz entre `0` y `24`, la cantidad de riego mayor o igual que `0`, la acidez del sustrato entre `0` y `14` y la temperatura entre `-50` y `80`. Los valores vacíos SHALL seguir admitiéndose: la restricción aplica solo a los valores presentes.

#### Scenario: Humedad fuera de rango

- **WHEN** se intenta persistir una lectura con `humidity = 150`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Acidez del sustrato fuera de rango

- **WHEN** se intenta persistir una lectura con `soil_ph = 15.0`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Cantidad de riego negativa

- **WHEN** se intenta persistir una lectura con `water_amount_ml = -10`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Lectura con valores vacíos

- **WHEN** se persiste una lectura con `humidity`, `temperature`, `light_hours`, `water_amount_ml` y `soil_ph` vacíos y su fecha de registro informada
- **THEN** la operación se acepta: las restricciones de rango no obligan a informar ningún valor

### Requirement: Consistencia interna de las entidades del dominio

Una entidad del modelo SHALL rechazar existir en un estado que viole sus propias reglas, tanto al crearse como al modificarse. El rechazo SHALL producirse en el momento en que se intenta el estado inválido, sin necesidad de llegar a persistir, y SHALL identificar la regla incumplida.

Una entidad SHALL rechazar igualmente cualquier modificación que rompa una regla que se cumplía: el estado anterior queda intacto y el cambio no se aplica.

#### Scenario: Entidad creada en estado inválido

- **WHEN** se intenta crear una mezcla de tierra cuyos porcentajes suman `180`
- **THEN** la creación se rechaza con un error que indica la regla incumplida, sin haber intentado persistir nada

#### Scenario: Entidad creada en estado válido

- **WHEN** se crea una mezcla de tierra cuyos porcentajes suman `100` y cuyo rango de pH no está invertido
- **THEN** la entidad queda construida y disponible para persistirse

#### Scenario: Modificación que rompería una regla

- **WHEN** se intenta modificar una entidad válida dejándola en un estado que viola una de sus reglas
- **THEN** la modificación se rechaza y la entidad conserva el estado que tenía antes del intento

#### Scenario: Modificación válida

- **WHEN** se modifica una entidad respetando sus reglas
- **THEN** el cambio se aplica y la entidad refleja el estado nuevo

#### Scenario: Una regla violada no es un fallo interno del servidor

- **WHEN** una petición del API provoca que una entidad rechace su estado
- **THEN** la respuesta es un error controlado del cliente con el cuerpo de error uniforme del API, y no un error interno del servidor

### Requirement: Restricciones de dominio de las especies

El sistema SHALL rechazar registrar una especie en la que el extremo inferior de cualquiera de sus tres rangos recomendados —humedad, temperatura y horas de luz— supere al extremo superior.

#### Scenario: Rango de humedad invertido

- **WHEN** se intenta registrar una especie con humedad mínima `80` y máxima `10`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Rango de temperatura invertido

- **WHEN** se intenta registrar una especie con temperatura mínima `35` y máxima `10`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Rango de horas de luz invertido

- **WHEN** se intenta registrar una especie con horas de luz mínimas `10` y máximas `6`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Rangos con extremos iguales

- **WHEN** se registra una especie cuyo mínimo y máximo de humedad valen ambos `20`
- **THEN** la operación se acepta: un rango de un solo valor es válido
