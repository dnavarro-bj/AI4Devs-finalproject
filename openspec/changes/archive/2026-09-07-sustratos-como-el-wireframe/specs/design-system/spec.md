## ADDED Requirements

### Requirement: Rueda de proporción

El sistema SHALL ofrecer un componente que presenta partes de un total como un anillo, con la parte dominante expresada como cifra en el centro. Las partes SHALL leerse como texto además de verse como sector, y el componente SHALL declarar su contenido a quien no ve el anillo.

#### Scenario: Reparto de dos partes

- **WHEN** se le dan dos partes que suman el total
- **THEN** cada una ocupa su sector y la dominante aparece como cifra en el centro

#### Scenario: El anillo se describe

- **WHEN** se muestra la rueda
- **THEN** su descripción accesible enuncia las partes y su proporción, no solo el dibujo

#### Scenario: Más de dos partes

- **WHEN** se le dan tres o más partes
- **THEN** todas se representan, sin que la rueda dependa de que sean exactamente dos

### Requirement: Escala con rango

El sistema SHALL ofrecer un componente que sitúa un rango de valores sobre una escala continua con sus dos extremos nombrados, mostrando dónde empieza y dónde acaba el rango. Los valores SHALL leerse como texto además de verse como posición.

#### Scenario: Rango dentro de la escala

- **WHEN** se sitúa un rango dentro de los límites de la escala
- **THEN** se muestra su tramo y sus dos valores, y los extremos de la escala quedan nombrados

#### Scenario: Rango de un solo punto

- **WHEN** el valor mínimo y el máximo coinciden
- **THEN** el tramo sigue siendo visible y no desaparece por tener anchura cero

#### Scenario: Rango que excede la escala

- **WHEN** el rango se sale de los límites de la escala
- **THEN** se recorta a la escala en lugar de desbordarla, y los valores siguen leyéndose

## MODIFIED Requirements

### Requirement: Barra de proporciones

El sistema SHALL ofrecer un componente que presenta partes de un total con su proporción y su etiqueta, y **SHALL señalar cuando la suma no cuadra**, indicando en cuánto se desvía. El valor de cada parte SHALL leerse como texto además de verse como proporción.

El componente SHALL admitir **rotular cada parte dentro de la barra** en lugar de bajo ella, y un **tamaño compacto** para presentarse dentro de la celda de una tabla. Ninguna de las dos variantes SHALL renunciar a leer el valor como texto ni a señalar el desajuste.

#### Scenario: Proporciones que suman el total

- **WHEN** las partes suman exactamente el total esperado
- **THEN** cada parte se muestra con su proporción y no se señala ningún desajuste

#### Scenario: Suma que no cuadra

- **WHEN** las partes no suman el total esperado
- **THEN** se señala el desajuste y en cuánto se desvía

#### Scenario: El valor se lee

- **WHEN** se muestra una parte
- **THEN** su valor aparece como texto, no solo como longitud de la barra

#### Scenario: Partes rotuladas dentro de la barra

- **WHEN** se pide el rotulado interior
- **THEN** cada parte muestra su etiqueta y su valor dentro de su tramo, sin leyenda aparte

#### Scenario: Barra compacta en una celda

- **WHEN** se pide el tamaño compacto
- **THEN** la barra y su leyenda ocupan la altura de una fila de tabla, y el valor sigue leyéndose
