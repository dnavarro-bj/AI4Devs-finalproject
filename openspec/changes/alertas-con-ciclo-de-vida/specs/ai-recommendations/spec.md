## ADDED Requirements

### Requirement: Una recomendación de riesgo alto o medio origina o enriquece una alerta

Al generarse la recomendación de una lectura, el sistema SHALL actuar según su nivel de riesgo. Una recomendación de riesgo **`high` o `medium`** SHALL, si la lectura ya abrió o actualizó una alerta abierta, **enriquecerla**: sustituir su acción recomendada por la de la IA y añadir su texto al motivo, sin cambiar su origen, su estado ni su severidad; y, si no hay ninguna, abrir una alerta de origen `recomendacion_ia`, categoría `otra`, con la severidad `critica` para `high` y `media` para `medium`. Una recomendación de riesgo **`low` NO SHALL generar nada**. La IA NO SHALL ser el único mecanismo: sin proveedor de IA, las alertas de medición y de tiempo SHALL seguir detectándose. La alerta SHALL escribirse **fuera de la llamada al proveedor** y en una transacción propia (ADR-012): un fallo del proveedor es `502` y no deja ninguna alerta a medias. Pedir otra vez la recomendación de una lectura que ya la tiene NO SHALL repetir el efecto. La alerta de la IA SHALL seguir «Sin duplicados».

#### Scenario: La IA enriquece la alerta de la lectura

- **WHEN** una lectura abrió una alerta de temperatura y su recomendación llega con riesgo `high` y una acción
- **THEN** la alerta conserva su origen `medicion` y su estado, y su acción recomendada pasa a ser la de la IA

#### Scenario: La IA abre una alerta cuando no hay ninguna

- **WHEN** una lectura dentro de rango recibe una recomendación de riesgo `high`
- **THEN** se abre una alerta `recomendacion_ia`, categoría `otra`, severidad `critica`, con el texto de la recomendación

#### Scenario: Riesgo bajo

- **WHEN** la recomendación llega con riesgo `low`
- **THEN** no se abre ni se modifica ninguna alerta

#### Scenario: Pedir la recomendación otra vez

- **WHEN** se vuelve a pedir la recomendación de una lectura que ya la tiene
- **THEN** no se consulta al proveedor y la alerta no recibe ninguna ocurrencia nueva

#### Scenario: El proveedor falla

- **WHEN** el proveedor de IA no responde
- **THEN** la respuesta es `502`, las alertas de medición de esa lectura siguen abiertas y no se crea ninguna de IA

#### Scenario: Consultar el listado nunca genera alertas

- **WHEN** se consulta el historial de lecturas de una planta
- **THEN** no se abre ni se modifica ninguna alerta
