## ADDED Requirements

### Requirement: Códigos de inventario en el esquema

El esquema SHALL guardar el código de inventario de cada especie y de cada ejemplar, y SHALL defender en la base de datos las reglas que lo hacen fiable ([ADR-002](../../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)): el código de una especie es **único**, el de un ejemplar es **único**, ambos son **obligatorios** y tienen un **formato** válido —letras mayúsculas y cifras, con guiones entre grupos—, y cada especie guarda el **contador** del siguiente número de ejemplar, que nunca es inferior a 1.

Las especies y los ejemplares que ya existen al aplicar la migración SHALL recibir su código **en la propia migración**, de modo que las columnas nacen obligatorias y no hay filas sin código ni un estado intermedio.

#### Scenario: Código de especie duplicado

- **WHEN** se intenta guardar una especie con un código que ya tiene otra
- **THEN** la base de datos lo rechaza

#### Scenario: Código de ejemplar duplicado

- **WHEN** se intenta guardar un ejemplar con un código que ya tiene otro
- **THEN** la base de datos lo rechaza

#### Scenario: Especie o ejemplar sin código

- **WHEN** se intenta guardar una especie o un ejemplar sin código
- **THEN** la base de datos lo rechaza

#### Scenario: Código con formato inválido

- **WHEN** se intenta guardar un código con minúsculas, espacios o caracteres que no son letras, cifras ni guion
- **THEN** la base de datos lo rechaza

#### Scenario: Contador inválido

- **WHEN** se intenta guardar una especie con un contador de ejemplares inferior a 1
- **THEN** la base de datos lo rechaza

#### Scenario: Los datos existentes reciben su código

- **WHEN** se aplica la migración sobre una base con especies y ejemplares
- **THEN** cada especie queda con un código único, cada ejemplar con el código de su especie y un número correlativo propio, y el contador de cada especie apunta al número siguiente al último asignado

#### Scenario: Un ejemplar conserva su código aunque su especie cambie de código

- **WHEN** se aplica la migración y después se corrige el código de una especie sin ejemplares
- **THEN** los ejemplares de otras especies no cambian de código
