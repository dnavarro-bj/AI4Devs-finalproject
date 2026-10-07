# saved-views Specification

## Purpose
TBD - created by archiving change vistas-guardadas-y-grupos-de-especies. Update Purpose after archive.

## Requirements

### Requirement: Vistas guardadas del listado

El sistema SHALL guardar una **vista**: un nombre, un ámbito (`plants` o `species`), la consulta —la *query string* de filtros y orden del listado de su ámbito— y, solo en `plants`, las columnas visibles. `POST /saved-views` SHALL crearla y devolverla con su identificador; `GET /saved-views/{id}` SHALL devolverla; `PUT /saved-views/{id}` SHALL **reemplazarla por completo**; `DELETE /saved-views/{id}` SHALL retirarla. El nombre SHALL ser obligatorio y no estar en blanco, y su longitud estar acotada. Una vista inexistente SHALL responder `404`.

#### Scenario: Guardar una vista del inventario

- **WHEN** se hace `POST /saved-views` con ámbito `plants`, nombre «Cuarentena de Invernadero 1», consulta `status=cuarentena&location=<id>&sort=code,asc` y columnas `species`, `location`
- **THEN** responde `201` con la vista, su `id` y la consulta tal cual

#### Scenario: Guardar un grupo de especies

- **WHEN** se hace `POST /saved-views` con ámbito `species`, nombre «Sensibles al frío» y consulta `minTemperatureFrom=9`
- **THEN** responde `201` con la vista

#### Scenario: Reemplazo completo

- **WHEN** se hace `PUT /saved-views/{id}` con otro nombre y otra consulta
- **THEN** la vista conserva su `id` y su fecha de creación y no queda nada de la consulta anterior

#### Scenario: Nombre en blanco

- **WHEN** se guarda con nombre vacío o de espacios
- **THEN** responde `400` y no se crea nada

#### Scenario: Retirar una vista

- **WHEN** se hace `DELETE /saved-views/{id}`
- **THEN** responde `204` y la vista deja de existir, sin afectar a plantas ni especies

#### Scenario: Vista inexistente

- **WHEN** se pide, se reemplaza o se retira una vista que no existe
- **THEN** responde `404` con el cuerpo uniforme de errores

### Requirement: El nombre de una vista es único por ámbito

El nombre de una vista SHALL ser único **dentro de su ámbito**, sin distinguir mayúsculas ni espacios de los extremos —el mismo criterio que el nombre de una etiqueta—, y la unicidad SHALL garantizarse también en la base de datos. Dos ámbitos distintos PUEDEN repetir nombre. Reemplazar una vista conservando su propio nombre SHALL NOT ser un conflicto.

#### Scenario: Nombre repetido

- **WHEN** existe «Sensibles al frío» en `species` y se guarda « sensibles al FRÍO » en `species`
- **THEN** responde `409` y no se crea

#### Scenario: Mismo nombre en otro ámbito

- **WHEN** existe «Cuarentena» en `plants` y se guarda «Cuarentena» en `species`
- **THEN** se crea

#### Scenario: Renombrarse a sí misma

- **WHEN** se hace `PUT` de una vista con su mismo nombre y otra consulta
- **THEN** se acepta

#### Scenario: Carrera entre dos altas

- **WHEN** dos altas con el mismo nombre llegan a la vez
- **THEN** una se crea y la otra responde `409`, nunca `500`

### Requirement: Una vista guardada no puede ser inservible

Al crear o reemplazar una vista, el servidor SHALL interpretar su consulta con **el mismo criterio que el listado de su ámbito** y rechazar con `400` lo que el listado rechazaría: un parámetro con valor inválido, una clave de orden que no es pública, un enumerado desconocido. Un parámetro **que el listado no conoce** SHALL rechazarse también, para que una vista no guarde ruido. `page` y `size` SHALL descartarse: no forman parte de una vista. Las columnas SHALL ser claves conocidas del listado de `plants`, y una vista de `species` con columnas SHALL responder `400`.

#### Scenario: Valor inválido

- **WHEN** se guarda una vista de `species` con consulta `growthMonth=13`
- **THEN** responde `400`

#### Scenario: Clave de orden ajena

- **WHEN** se guarda una vista de `plants` con `sort=lastReview,desc`
- **THEN** responde `400`

#### Scenario: Parámetro desconocido

- **WHEN** se guarda una consulta `colour=red`
- **THEN** responde `400`

#### Scenario: Paginación descartada

- **WHEN** se guarda la consulta `status=cuarentena&page=3&size=25`
- **THEN** la vista guarda `status=cuarentena`

#### Scenario: Columnas de un ámbito que no las tiene

- **WHEN** se guarda una vista de `species` con columnas
- **THEN** responde `400`

#### Scenario: Columna desconocida

- **WHEN** se guarda una vista de `plants` con la columna `password`
- **THEN** responde `400`

### Requirement: Listado de vistas

`GET /saved-views` SHALL devolver las vistas paginadas con el envelope `PageResponse` (ADR-009), filtradas por `scope` si se indica, ordenadas por nombre. Un `scope` desconocido SHALL responder `400`.

#### Scenario: Por ámbito

- **WHEN** existen dos vistas de `plants` y una de `species` y se pide `GET /saved-views?scope=species`
- **THEN** devuelve solo la de `species`

#### Scenario: Sin vistas

- **WHEN** no hay ninguna
- **THEN** responde `200` con una página vacía y `totalElements` 0

### Requirement: Los grupos de especies son dinámicos

Una vista de ámbito `species` SHALL ser un **grupo**: sus miembros no se guardan, son las especies que cumplen su consulta **en el momento de evaluarla**. Cada vista de `species` SHALL traer `matchCount`, el número de especies que cumplen hoy su regla, calculado con una consulta de recuento por grupo y no una por especie. Una especie SHALL entrar o salir de un grupo, sin intervención, al cambiar sus características. Las vistas de `plants` SHALL NOT traer `matchCount`.

#### Scenario: Recuento del grupo

- **WHEN** hay 12 especies con temperatura mínima de 9 °C o más y un grupo con esa regla
- **THEN** su `matchCount` es 12

#### Scenario: Una especie sale sola

- **WHEN** una especie de ese grupo pasa a tener temperatura mínima de 5 °C
- **THEN** el `matchCount` del grupo baja en una y nadie ha editado el grupo

#### Scenario: Una especie entra sola

- **WHEN** una especie sin exposición definida pasa a `semisombra` y existe el grupo «exposición = semisombra»
- **THEN** el `matchCount` sube en una

#### Scenario: Valor que ya no existe

- **WHEN** un grupo filtra por una mezcla de sustrato que se retira
- **THEN** el grupo sigue existiendo y su `matchCount` es 0, no un error

#### Scenario: Las vistas de plantas no cuentan

- **WHEN** se lista una vista de `plants`
- **THEN** la respuesta no trae `matchCount`

#### Scenario: Una consulta por grupo

- **WHEN** se listan 10 grupos
- **THEN** se ejecutan 10 consultas de recuento y ninguna por especie
