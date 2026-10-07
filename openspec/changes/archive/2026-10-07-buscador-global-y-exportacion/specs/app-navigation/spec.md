## REMOVED Requirements

### Requirement: Búsqueda global de plantas y especies por código

**Reason**: describía una búsqueda híbrida —código real y localizaciones y etiquetas de ejemplo marcadas—; con T-21 todos los tipos son reales.

**Migration**: sustituida por «Búsqueda global sobre datos reales», que conserva la pausa, el descarte de respuestas obsoletas y el fallo por tipo.

## ADDED Requirements

### Requirement: Búsqueda global sobre datos reales

La búsqueda global SHALL encontrar **plantas, especies, localizaciones y etiquetas reales**, consultando el API, con coincidencia parcial y sin distinguir mayúsculas. Las **plantas** se buscan por código, apodo y nombre de su especie y se muestran con su código y su apodo; las **especies**, por código y por nombre científico o común, con su código y su nombre científico; las **localizaciones**, por nombre y código; las **etiquetas**, por nombre. Cada resultado SHALL abrir la pantalla del elemento. **No queda ningún dato de ejemplo ni marca `· ejemplo`** en la búsqueda.

Cada tipo SHALL mostrar un número acotado de resultados y, si hay más, un enlace **«Ver los N resultados»** que abre el inventario o el catálogo ya filtrado por el mismo texto (`?q=`); localizaciones y etiquetas, cuyas pantallas no se filtran por texto, no lo ofrecen. Las cuatro consultas SHALL ir en paralelo y **cada tipo SHALL fallar por separado**: si una falla, las demás se muestran y esa se degrada a «sin resultados de ese tipo», sin mensaje técnico.

Escribir deprisa SHALL NO lanzar una petición por tecla, y una respuesta de una búsqueda anterior SHALL NO sustituir a la de la búsqueda actual.

#### Scenario: Encontrar una planta por su código

- **WHEN** el usuario escribe `CAT-GRUSS-01` en la búsqueda global
- **THEN** aparece, en el grupo de plantas, la planta con ese código y su apodo, y al elegirla se abre su ficha

#### Scenario: Encontrar una planta por su apodo

- **WHEN** el usuario escribe `suegra`
- **THEN** aparece la planta cuyo apodo lo contiene, aunque su código no

#### Scenario: Encontrar plantas por el nombre de su especie

- **WHEN** el usuario escribe `grusonii`
- **THEN** aparecen en el grupo de plantas los ejemplares de esa especie y en el de especies, la propia especie

#### Scenario: Encontrar una especie por su código

- **WHEN** el usuario escribe `mammi`
- **THEN** aparece, en el grupo de especies, la que tiene ese código, con su nombre científico, y al elegirla se abre su ficha

#### Scenario: Localizaciones y etiquetas reales

- **WHEN** el usuario escribe `inver`
- **THEN** el grupo de localizaciones muestra las que existen en el API, sin marca de ejemplo, y al elegir una se abre su ficha

#### Scenario: Ningún dato de ejemplo

- **WHEN** el usuario busca un texto que solo coincide con un dato que existe en el API
- **THEN** no aparece ningún resultado que no exista en él

#### Scenario: Más resultados de los que caben

- **WHEN** hay 37 plantas que coinciden y el grupo muestra 5
- **THEN** el grupo ofrece «Ver los 37 resultados» y al elegirlo se abre `/plants?q=<texto>` ya filtrado

#### Scenario: Un tipo que no se filtra por texto

- **WHEN** hay más localizaciones de las que caben
- **THEN** el grupo muestra las primeras sin enlace «Ver todos»

#### Scenario: Una respuesta tardía no pisa a la actual

- **WHEN** el usuario escribe un texto, escribe otro después, y la respuesta del primero llega la última
- **THEN** los resultados mostrados son los del segundo texto

#### Scenario: Un tipo falla

- **WHEN** el API de etiquetas falla durante una búsqueda
- **THEN** plantas, especies y localizaciones se muestran y no hay resultados de etiquetas ni mensaje de error técnico

#### Scenario: Fallan todos

- **WHEN** el API no responde
- **THEN** el diálogo muestra «sin resultados» y sigue funcionando
