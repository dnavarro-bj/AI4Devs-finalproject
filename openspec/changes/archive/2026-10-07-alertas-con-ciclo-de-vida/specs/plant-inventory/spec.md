## ADDED Requirements

### Requirement: Nivel de atención de cada ejemplar en el listado

Cada fila de `GET /plants` SHALL traer **`attention`**: la **mayor severidad** entre las alertas **abiertas** del ejemplar (`baja`, `media` o `critica`), y ausente si no tiene ninguna. El dato SHALL salir de **una consulta agregada** para la página y no de una por fila. **Filtrar y ordenar por atención NO SHALL ofrecerse** en este change. `GET /plants/{id}` SHALL traer además sus alertas abiertas, de la más grave a la más leve.

#### Scenario: Un ejemplar con alertas

- **WHEN** un ejemplar tiene una alerta `media` abierta y una `critica` abierta
- **THEN** su fila trae `attention` = `critica`

#### Scenario: Un ejemplar sin alertas

- **WHEN** un ejemplar no tiene alertas abiertas
- **THEN** su fila no trae `attention`

#### Scenario: Una alerta cerrada no cuenta

- **WHEN** la única alerta del ejemplar está resuelta
- **THEN** no trae `attention`

#### Scenario: Sin una consulta por fila

- **WHEN** se lista una página de 25 ejemplares
- **THEN** las severidades se obtienen con una sola consulta agregada

#### Scenario: Alertas abiertas en la ficha

- **WHEN** se consulta un ejemplar con dos alertas abiertas
- **THEN** la respuesta las trae ordenadas de la más grave a la más leve
