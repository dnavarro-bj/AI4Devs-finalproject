## ADDED Requirements

### Requirement: Pauta anual editable

La pauta anual SHALL poder usarse como **editor**: con la opción `editable`, cada mes es un botón con nombre accesible («Crecimiento, marzo: nivel 2 de 2») y estado pulsado, que **cicla** el nivel del mes —apagado, 1, 2… hasta el máximo de su fila y vuelta a apagado—. Cada fila SHALL poder declarar cuántas fuerzas admite, y la rejilla reparte esos niveles por toda la escala del color, de modo que un «sí» de una fila de presencia no se pinte con la fuerza de un «poco». La rejilla NO SHALL guardar el nivel: emite el siguiente con el identificador de la fila y el mes, y quien la usa decide. Sin `editable` NO SHALL haber ningún botón.

#### Scenario: Sin editable no hay botones

- **WHEN** se usa la pauta anual sin la opción `editable`
- **THEN** ningún mes es interactivo

#### Scenario: Los meses son botones accesibles

- **WHEN** se usa con `editable`
- **THEN** cada mes es un botón cuyo nombre dice la fila, el mes y el nivel, y que indica si está marcado

#### Scenario: Pulsar emite el nivel siguiente

- **WHEN** se pulsa un mes de una fila de dos niveles que está en el 2
- **THEN** se emite el identificador de la fila, el mes y el nivel `0`

#### Scenario: Sin quien la actualice, no cambia

- **WHEN** se pulsa un mes y quien la usa no actualiza los datos
- **THEN** el mes sigue pintado como estaba

#### Scenario: Una fila de presencia se pinta con toda la fuerza

- **WHEN** una fila que admite un solo nivel tiene un mes marcado
- **THEN** ese mes se pinta con la fuerza máxima de la escala
