## ADDED Requirements

### Requirement: Cronología con filtro controlado desde fuera

La cronología SHALL admitir un **filtro controlado**: cuando quien la usa le pasa el tipo activo, la cronología NO SHALL filtrar por sí misma, sino emitir el tipo que se pide y mostrar los eventos que recibe. Sin tipo controlado, SHALL conservar su filtro local. El motivo: con paginación, un filtro local solo vería lo ya cargado y diría «no hay» donde sí hay.

#### Scenario: Controlado, emite y no filtra

- **WHEN** la cronología recibe el tipo activo y se pulsa otro tipo
- **THEN** emite el tipo pedido y los eventos mostrados siguen siendo los recibidos

#### Scenario: El tipo activo se marca

- **WHEN** el tipo activo es `floracion`
- **THEN** ese filtro se marca como activo y «Todos» no

#### Scenario: Volver a todos

- **WHEN** se pulsa «Todos» con un tipo activo
- **THEN** emite `null`

#### Scenario: Sin control, filtra por sí misma

- **WHEN** no se le pasa el tipo activo y se pulsa un tipo
- **THEN** muestra solo los eventos de ese tipo, como hasta ahora
