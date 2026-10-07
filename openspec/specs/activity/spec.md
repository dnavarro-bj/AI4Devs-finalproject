# activity Specification

## Purpose
TBD - created by archiving change dashboard-operativo. Update Purpose after archive.

## Requirements

### Requirement: Actividad reciente

`GET /activity` SHALL devolver, paginada con el envelope `PageResponse` (ADR-009), **lo que se ha hecho** en la colección, del más reciente al más antiguo por su instante con el identificador como desempate. Cada entrada SHALL traer `id`, `type`, `occurredAt` y el detalle de su tipo en un objeto con su nombre: **`lote`** (`batch` con `id`, `action` y `plantCount`), **`tarea`** (`task` con `id`, `type`, `title` y `affectedPlants`, de una tarea **completada**), **`comentario`** (`plant` con `id`, `code` y `nickname`, y `comment.excerpt`, el comienzo del texto) e **`intervencion`** (`plant` y `intervention.type`). Un comentario o una intervención que **pertenece a un lote o a una tarea** SHALL NOT aparecer por separado: lo representa su lote o su tarea. Las lecturas, los cambios de estado, los movimientos y las floraciones SHALL NOT aparecer. No SHALL requerir ninguna tabla propia.

#### Scenario: Un lote es una sola línea

- **WHEN** se registró una lectura por lote en 31 plantas
- **THEN** la actividad trae una sola entrada `lote` con `plantCount` 31 y ninguna por planta

#### Scenario: Una tarea completada

- **WHEN** se completó una tarea de riego sobre 6 plantas
- **THEN** la actividad trae una entrada `tarea` con su título y `affectedPlants` 6, y no los eventos de cada planta ni la lectura enlazada

#### Scenario: Un comentario suelto

- **WHEN** se añadió un comentario a una planta fuera de un lote
- **THEN** la actividad trae una entrada `comentario` con la planta y el comienzo del texto

#### Scenario: Una intervención suelta

- **WHEN** se registró una poda en una planta sin lote ni tarea
- **THEN** la actividad trae una entrada `intervencion` con la planta y el tipo

#### Scenario: Lo que no es actividad

- **WHEN** se registra una lectura individual, un cambio de estado o un movimiento
- **THEN** no aparece en la actividad

#### Scenario: Orden estable

- **WHEN** dos entradas comparten instante
- **THEN** su orden relativo es el mismo entre una consulta y la siguiente

#### Scenario: Paginado

- **WHEN** hay 40 entradas y se pide `?size=8`
- **THEN** devuelve las 8 más recientes y `totalElements` 40

#### Scenario: Sin actividad

- **WHEN** no se ha hecho nada
- **THEN** responde `200` con una página vacía

#### Scenario: Una tarea abierta no cuenta

- **WHEN** una tarea está pendiente, omitida o cancelada
- **THEN** no aparece en la actividad
