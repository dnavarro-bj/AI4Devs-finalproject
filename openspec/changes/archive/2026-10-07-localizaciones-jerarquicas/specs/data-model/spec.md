## ADDED Requirements

### Requirement: Jerarquía y ficha de la localización en el esquema

El esquema SHALL añadir a `location` la columna `parent_id` —clave foránea a `location.id`, nula en la raíz— y las columnas `code`, `description`, `location_type`, `capacity`, `operational_notes`, `environment` y `sun_exposure`. **Todas SHALL ser nulables salvo `code`**, que SHALL ser obligatorio y único sin distinguir mayúsculas ni espacios de los extremos. `location_type` SHALL aceptar solo `bancada`, `bandeja`, `invernadero`, `zona_exterior`, `estanteria` y `otro`; `environment` solo `interior`, `cubierto` y `exterior`; `sun_exposure` solo `sombra`, `semisombra`, `soleado` y `pleno_sol`; `capacity`, si existe, SHALL ser mayor que cero. Todo con restricción `CHECK` en la base. Una localización SHALL NOT poder ser su propio padre.

La migración SHALL **asignar un código a cada localización existente dentro de la propia migración**, único y derivado de su nombre, y dejar cada una como raíz.

#### Scenario: Las localizaciones existentes pasan a ser raíces con código

- **WHEN** se aplica la migración sobre una base con localizaciones
- **THEN** todas conservan nombre e identificador, no tienen padre y tienen un código distinto entre sí

#### Scenario: Código repetido sin distinguir mayúsculas

- **WHEN** se intenta guardar una localización con el código `loc-i1` existiendo `LOC-I1`
- **THEN** la base rechaza la fila

#### Scenario: Tipo, entorno o exposición fuera del vocabulario

- **WHEN** se intenta guardar una localización con tipo `almacen`, entorno `subterraneo` o exposición `radiante`
- **THEN** la base rechaza la fila en cada caso

#### Scenario: Capacidad no positiva

- **WHEN** se intenta guardar una localización con capacidad `0`
- **THEN** la base rechaza la fila

#### Scenario: Padre inexistente o propio

- **WHEN** se intenta guardar una localización con un padre que no existe, o con ella misma como padre
- **THEN** la base rechaza la fila

### Requirement: Historial de movimientos en el esquema

El esquema SHALL incluir la tabla `plant_movement` con identificador, planta (clave foránea), localización de origen y de destino (claves foráneas a `location`) e instante del movimiento (`timestamptz`), todos obligatorios. El origen y el destino SHALL ser distintos con `CHECK`. La migración SHALL NOT fabricar movimientos para lo ya existente: una planta sin historial es una planta que no se ha movido desde que se registra.

#### Scenario: Movimiento sin cambio de sitio

- **WHEN** se intenta guardar un movimiento con origen igual al destino
- **THEN** la base rechaza la fila

#### Scenario: Las plantas existentes no tienen movimientos

- **WHEN** se aplica la migración sobre una base con plantas
- **THEN** `plant_movement` está vacía y cada planta conserva su localización

#### Scenario: Una localización con movimientos no se borra por accidente

- **WHEN** se intenta borrar directamente una localización que aparece como origen o destino de algún movimiento
- **THEN** la base lo rechaza por la clave foránea
