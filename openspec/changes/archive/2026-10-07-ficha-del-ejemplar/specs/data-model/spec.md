## ADDED Requirements

### Requirement: Perfil y estado del ejemplar en el esquema

El esquema SHALL guardar, para cada ejemplar, su **descripción**, su **estado**, el **año y el mes de germinación**, la **fecha de adquisición** y su **procedencia** con una nota, y SHALL defender en la base de datos las reglas que los hacen fiables ([ADR-002](../../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)): el estado es obligatorio y uno de los siete válidos; el mes de germinación está entre 1 y 12 y **solo puede informarse si hay año**; el año es plausible; y la procedencia, si se informa, es una de las de la lista cerrada. Todos los demás campos son opcionales.

Cada **cambio de estado** SHALL guardarse con el estado anterior, el nuevo, un motivo opcional y el instante en que ocurrió. Un cambio SHALL tener siempre dos estados válidos y **distintos**.

Los ejemplares que ya existen al aplicar la migración SHALL quedar **activos** y sin datos de germinación, adquisición ni procedencia: no se inventa nada.

#### Scenario: Estado inválido

- **WHEN** se intenta guardar un ejemplar con un estado que no es uno de los siete
- **THEN** la base de datos lo rechaza

#### Scenario: Ejemplar sin estado

- **WHEN** se intenta guardar un ejemplar sin estado
- **THEN** la base de datos lo rechaza

#### Scenario: Mes de germinación sin año

- **WHEN** se intenta guardar un ejemplar con mes de germinación y sin año
- **THEN** la base de datos lo rechaza

#### Scenario: Mes fuera de rango

- **WHEN** se intenta guardar un ejemplar con mes de germinación 0 o 13
- **THEN** la base de datos lo rechaza

#### Scenario: Año de germinación implausible

- **WHEN** se intenta guardar un ejemplar con un año de germinación anterior a 1900 o posterior a 2100
- **THEN** la base de datos lo rechaza

#### Scenario: Año sin mes

- **WHEN** se guarda un ejemplar con año de germinación y sin mes
- **THEN** la base de datos lo acepta

#### Scenario: Procedencia fuera de la lista

- **WHEN** se intenta guardar un ejemplar con una procedencia que no está en la lista cerrada
- **THEN** la base de datos lo rechaza

#### Scenario: Cambio de estado a sí mismo

- **WHEN** se intenta guardar un cambio de estado cuyo estado anterior y nuevo son el mismo
- **THEN** la base de datos lo rechaza

#### Scenario: Cambio de estado con un estado inválido

- **WHEN** se intenta guardar un cambio de estado con un estado que no es de los siete
- **THEN** la base de datos lo rechaza

#### Scenario: Los ejemplares existentes quedan activos

- **WHEN** se aplica la migración sobre una base con ejemplares
- **THEN** todos quedan activos y sin germinación, adquisición ni procedencia
