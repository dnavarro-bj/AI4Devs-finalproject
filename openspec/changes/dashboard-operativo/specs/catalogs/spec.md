## ADDED Requirements

### Requirement: Tareas pendientes por localización

Cada localización de `GET /locations` y de `GET /locations/{id}` SHALL traer **`pendingTasks`**: el número de tareas **pendientes** que afectan a esa localización, contando las dirigidas **a ella o a sus sublocalizaciones** y las dirigidas a **plantas expresas que estén ahora en ellas**, de modo que una localización incluya lo de lo que contiene. Una tarea SHALL contarse **una sola vez** por localización aunque la alcance por varias vías. Una tarea completada, omitida o cancelada SHALL NOT contar. El número SHALL calcularse con una consulta agregada para todo el listado, no una por fila, y SHALL coincidir con `totalElements` de `GET /tasks?location=<id>&includeDescendants=true`.

#### Scenario: Una tarea directa

- **WHEN** hay una tarea pendiente dirigida a «Invernadero 1»
- **THEN** su `pendingTasks` es 1

#### Scenario: Las de lo que contiene

- **WHEN** hay una tarea dirigida a «Bandeja A3», dentro de «Invernadero 1»
- **THEN** «Bandeja A3» e «Invernadero 1» cuentan 1

#### Scenario: Plantas expresas

- **WHEN** una tarea apunta a tres plantas que están en «Invernadero 2»
- **THEN** «Invernadero 2» cuenta 1 tarea, no 3

#### Scenario: Una sola vez

- **WHEN** una tarea alcanza una localización por dos vías
- **THEN** cuenta 1

#### Scenario: Lo cerrado no cuenta

- **WHEN** una tarea está completada, omitida o cancelada
- **THEN** no cuenta

#### Scenario: Sin tareas

- **WHEN** una localización no tiene ninguna
- **THEN** `pendingTasks` es 0

#### Scenario: Coincide con el listado de tareas

- **WHEN** se compara con `GET /tasks?location=<id>&includeDescendants=true`
- **THEN** `pendingTasks` es su `totalElements`

#### Scenario: Una consulta para todo el listado

- **WHEN** se piden 25 localizaciones
- **THEN** el recuento de tareas se obtiene en una sola consulta agregada
