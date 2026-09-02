## ADDED Requirements

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
