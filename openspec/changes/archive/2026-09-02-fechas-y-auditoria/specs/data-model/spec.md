## ADDED Requirements

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
