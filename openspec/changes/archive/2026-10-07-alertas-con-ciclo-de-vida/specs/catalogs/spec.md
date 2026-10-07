## ADDED Requirements

### Requirement: Alertas abiertas de una localización

Cada localización de `GET /locations` y de `GET /locations/{id}` SHALL traer **`openAlerts`**: el número de alertas **abiertas** (`nueva` o `revisada`) **totales** —las propias, las de sus sublocalizaciones y las de los ejemplares que están en ellas— y la **mayor severidad** entre ellas, ausente si no hay ninguna. El recuento por fila SHALL resolverse con una consulta agregada y no con una por fila, y SHALL seguir la jerarquía como los recuentos de ejemplares (consultas recursivas, sin ruta materializada). La ficha SHALL traer además las **propias** (solo las de la localización y las de sus ejemplares directos) para distinguirlas de las de dentro.

#### Scenario: Recuento con descendientes

- **WHEN** una localización tiene una alerta propia, una sublocalización con un ejemplar con alerta y otra alerta ya resuelta
- **THEN** `openAlerts` cuenta 2 y su mayor severidad es la más alta de esas dos

#### Scenario: Sin alertas

- **WHEN** ninguna alerta abierta afecta a la localización ni a lo que contiene
- **THEN** `openAlerts` es 0 y no trae severidad

#### Scenario: Una consulta para todo el listado

- **WHEN** se lista una página de 25 localizaciones
- **THEN** el recuento de alertas se obtiene con una consulta agregada, no una por localización

#### Scenario: Una alerta cerrada no cuenta

- **WHEN** una alerta se descarta
- **THEN** deja de contar en `openAlerts` de su localización y de sus ancestros
