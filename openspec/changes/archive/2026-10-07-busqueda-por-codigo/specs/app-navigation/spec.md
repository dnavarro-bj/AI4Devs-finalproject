## ADDED Requirements

### Requirement: Búsqueda global de plantas y especies por código

La búsqueda global SHALL encontrar **plantas y especies reales por su código de inventario**, consultando el API, con coincidencia parcial y sin distinguir mayúsculas. Las plantas SHALL mostrarse con su código y su apodo y las especies con su código y su nombre científico, y cada resultado SHALL abrir la ficha del elemento. Los tipos que todavía no se buscan en el API —localizaciones y etiquetas— SHALL seguir apareciendo marcados como datos de ejemplo hasta que los sirva un endpoint (T-21): una búsqueda que mezcla resultados reales con otros inventados sin decirlo es peor que una que dice cuáles son cuáles.

Escribir deprisa SHALL NO lanzar una petición por tecla, y una respuesta de una búsqueda anterior SHALL NO sustituir a la de la búsqueda actual. Si el API falla, la búsqueda SHALL degradarse a «sin resultados de ese tipo» en lugar de romper el diálogo.

#### Scenario: Encontrar una planta por su código

- **WHEN** el usuario escribe `CAT-GRUSS-01` en la búsqueda global
- **THEN** aparece, en el grupo de plantas, la planta con ese código y su apodo, y al elegirla se abre su ficha

#### Scenario: Encontrar una especie por su código

- **WHEN** el usuario escribe `mammi`
- **THEN** aparece, en el grupo de especies, la que tiene ese código, con su nombre científico, y al elegirla se abre su ficha

#### Scenario: Resultados reales, no de ejemplo

- **WHEN** el usuario busca un texto que coincide con el código de una planta
- **THEN** el resultado es la planta que existe en el API y no una de ejemplo

#### Scenario: Lo que sigue siendo ejemplo, marcado

- **WHEN** la búsqueda devuelve localizaciones o etiquetas
- **THEN** esos resultados se distinguen como datos de ejemplo

#### Scenario: Una respuesta tardía no pisa a la actual

- **WHEN** el usuario escribe un texto, escribe otro después, y la respuesta del primero llega la última
- **THEN** los resultados mostrados son los del segundo texto

#### Scenario: Fallo del API

- **WHEN** el API de plantas o de especies falla durante una búsqueda
- **THEN** el diálogo sigue funcionando y no muestra resultados de ese tipo, sin mensaje de error técnico
