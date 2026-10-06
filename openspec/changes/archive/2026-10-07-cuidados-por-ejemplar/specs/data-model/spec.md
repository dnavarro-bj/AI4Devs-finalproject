## ADDED Requirements

### Requirement: Cuidados propios del ejemplar en el esquema

El esquema SHALL guardar los **cuidados propios** de un ejemplar como columnas **opcionales** de su fila: los rangos de humedad, de temperatura y de horas de luz (mínimo y máximo de cada uno), la pauta de riego y la mezcla de sustrato. **Un valor nulo significa que el ejemplar hereda el de su especie**; un valor, que lo sobrescribe. El esquema SHALL defender ([ADR-002](../../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)) que la humedad esté entre 0 y 100 y las horas de luz entre 0 y 24, y que la mezcla de sustrato, si se informa, exista.

Los ejemplares que ya existen al aplicar la migración SHALL quedar **sin ningún valor propio**: siguen heredando exactamente lo de su especie.

#### Scenario: Ejemplar sin cuidados propios

- **WHEN** se guarda un ejemplar sin ningún valor propio
- **THEN** la base de datos lo acepta y todos los valores propios quedan nulos

#### Scenario: Un solo valor propio

- **WHEN** se guarda un ejemplar que sobrescribe solo el máximo de temperatura
- **THEN** la base de datos lo acepta y el resto queda nulo

#### Scenario: Humedad fuera de 0 a 100

- **WHEN** se intenta guardar un ejemplar con una humedad propia de 101 o de -1
- **THEN** la base de datos lo rechaza

#### Scenario: Horas de luz fuera de 0 a 24

- **WHEN** se intenta guardar un ejemplar con unas horas de luz propias de 25 o de -1
- **THEN** la base de datos lo rechaza

#### Scenario: Mezcla de sustrato inexistente

- **WHEN** se intenta guardar un ejemplar con una mezcla de sustrato propia que no existe
- **THEN** la base de datos lo rechaza

#### Scenario: Los ejemplares existentes siguen heredando

- **WHEN** se aplica la migración sobre una base con ejemplares
- **THEN** todos quedan sin valores propios
