## ADDED Requirements

### Requirement: Las alertas del ejemplar en su cronología

`GET /plants/{id}/timeline` SHALL incluir el tipo **`alerta`**: **una entrada por transición** de cada alerta de ese ejemplar —su **apertura**, su revisión, su resolución y su descarte—, en el instante de la transición, con un detalle `alert` que lleve el identificador de la alerta, su categoría, su severidad, su motivo, el estado anterior (ausente en la apertura), el nuevo y el comentario si lo hay. Las entradas SHALL leerse de donde ya viven, **sin copiarse** a la espina de eventos, y SHALL obedecer al resto del contrato de la cronología: orden descendente con desempate estable, paginación y filtro `?type=alerta` aplicado antes de paginar. Las **ocurrencias** posteriores de una alerta NO SHALL generar entradas: la alerta acumula y la cronología no se inunda. Las alertas de una **localización** NO SHALL aparecer en la cronología de sus ejemplares.

#### Scenario: Apertura y resolución en la cronología

- **WHEN** una alerta de un ejemplar se abre, se revisa y se resuelve
- **THEN** la cronología trae tres entradas `alerta`, con su instante y su estado, y la primera no tiene estado anterior

#### Scenario: Filtrar por alertas

- **WHEN** se pide `?type=alerta`
- **THEN** solo vienen transiciones de alertas, `totalElements` las cuenta todas y el orden es el de la cronología completa

#### Scenario: Las ocurrencias no son eventos

- **WHEN** una alerta abierta recibe cinco lecturas más fuera de rango
- **THEN** la cronología no gana ninguna entrada de alerta

#### Scenario: Alerta de una localización

- **WHEN** una localización tiene una alerta propia
- **THEN** no aparece en la cronología de las plantas que alberga

#### Scenario: Una alerta manual

- **WHEN** se anota una alerta manual sobre un ejemplar
- **THEN** su apertura figura en la cronología con el motivo
