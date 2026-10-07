## ADDED Requirements

### Requirement: Ficha de cultivo de la especie

El sistema SHALL permitir registrar y corregir, en el alta y en la edición de una especie, su descripción, su exposición solar (`sombra`, `semisombra`, `soleado`, `pleno_sol`), su entorno (`interior`, `exterior`, `ambos`) y los datos de su floración esperada: descripción y condiciones, color, madurez aproximada y duración habitual. Todos son opcionales. La exposición y las horas de luz SHALL ser independientes: ninguna se deduce de la otra ni se valida contra ella. Un valor de exposición o de entorno fuera del vocabulario SHALL rechazarse con `400`.

#### Scenario: Alta con la ficha de cultivo

- **WHEN** se da de alta una especie con exposición `pleno_sol`, entorno `exterior` y color de flor «Amarillo intenso»
- **THEN** la ficha de la especie devuelve esos tres datos

#### Scenario: Una especie sin ficha de cultivo es válida

- **WHEN** se da de alta una especie sin ninguno de los campos nuevos
- **THEN** se acepta, y la ficha los devuelve vacíos

#### Scenario: Exposición y horas de luz son independientes

- **WHEN** se registra una especie con exposición `sombra` y horas de luz de `10` a `12`
- **THEN** se acepta, sin que ninguno de los dos valores condicione al otro

#### Scenario: Exposición desconocida

- **WHEN** se envía la exposición `radiante`
- **THEN** la respuesta es `400` y no se guarda la especie

#### Scenario: Estacional no es un entorno

- **WHEN** se envía el entorno `estacional`
- **THEN** la respuesta es `400`

### Requirement: Calendario anual de la especie

El sistema SHALL permitir registrar los periodos del año de una especie —`crecimiento`, `crecimiento_maximo`, `reposo`, `floracion` y `riego`—, cada uno con mes de inicio y de fin entre 1 y 12 y notas opcionales; el riego SHALL llevar además una intensidad `escaso`, `moderado` o `abundante`, y ningún otro tipo puede llevarla. Un periodo cuyo inicio es posterior a su fin SHALL entenderse como un periodo que cruza el fin de año. Dentro de un mismo tipo los periodos NO SHALL solaparse, contando también el cruce de año. El **crecimiento máximo** —los meses en que la especie más crece— se superpone al crecimiento y SHALL caer **dentro** de él, también cuando cruza el fin de año; un crecimiento máximo sin crecimiento que lo cubra se rechaza. El calendario enviado en una edición SHALL sustituir al guardado.

#### Scenario: Noviembre a febrero se guarda y se devuelve igual

- **WHEN** se registra un periodo de reposo con inicio `11` y fin `2`
- **THEN** la ficha devuelve ese periodo con inicio `11` y fin `2`, sin partirlo en dos

#### Scenario: Varios periodos del mismo tipo

- **WHEN** se registran dos periodos de riego, de marzo a mayo y de septiembre a octubre
- **THEN** se aceptan los dos

#### Scenario: Periodos solapados del mismo tipo

- **WHEN** se registran dos periodos de crecimiento, de marzo a julio y de junio a octubre
- **THEN** la respuesta es `400` explicando el solape y no se guarda nada

#### Scenario: El solape cuenta el cruce del año

- **WHEN** se registran un reposo de noviembre a febrero y otro de enero a marzo
- **THEN** la respuesta es `400`

#### Scenario: El crecimiento máximo se superpone al crecimiento

- **WHEN** se registran un crecimiento de marzo a octubre y un crecimiento máximo de mayo a julio
- **THEN** se aceptan los dos y la ficha los devuelve

#### Scenario: El crecimiento máximo fuera del crecimiento

- **WHEN** se registran un crecimiento de marzo a junio y un crecimiento máximo de mayo a agosto
- **THEN** la respuesta es `400` indicando los meses que quedan fuera, y no se guarda nada

#### Scenario: Crecimiento máximo sin crecimiento

- **WHEN** se registra un crecimiento máximo y ningún crecimiento
- **THEN** la respuesta es `400`

#### Scenario: Tipos distintos pueden coincidir

- **WHEN** se registran un periodo de crecimiento de marzo a octubre y una floración de mayo a julio
- **THEN** se aceptan: el solape solo se prohíbe dentro de un tipo

#### Scenario: Mes fuera de rango

- **WHEN** se envía un periodo con mes de inicio `13`
- **THEN** la respuesta es `400`

#### Scenario: Intensidad solo en el riego

- **WHEN** se envía un periodo de riego sin intensidad, o uno de crecimiento con intensidad
- **THEN** la respuesta es `400`

#### Scenario: Tipo de periodo desconocido

- **WHEN** se envía un periodo de tipo `transicion`
- **THEN** la respuesta es `400`

#### Scenario: La edición sustituye el calendario

- **WHEN** se edita una especie con tres periodos enviando solo uno
- **THEN** la ficha devuelve ese único periodo

#### Scenario: Una edición rechazada no toca el calendario

- **WHEN** una edición con un periodo inválido se rechaza
- **THEN** la especie conserva su calendario anterior

### Requirement: La ficha de la especie devuelve su ficha de cultivo y su calendario

`GET /species/{id}` SHALL devolver, además de lo que ya devuelve, la descripción, la exposición, el entorno, los cuatro datos de floración y la lista `periods` ordenada por tipo y mes de inicio, con el número de ejemplares. El listado `GET /species` NO SHALL incluir esos campos. Los identificadores de los periodos, si se devuelven, viajan como cadena decimal.

#### Scenario: Ficha completa

- **WHEN** se consulta una especie con exposición, entorno y tres periodos
- **THEN** la respuesta los incluye junto con `plantCount`

#### Scenario: Especie sin calendario

- **WHEN** se consulta una especie sin periodos
- **THEN** `periods` es una lista vacía, no ausente

#### Scenario: El listado no cambia

- **WHEN** se consulta `GET /species`
- **THEN** cada fila sigue siendo la del resumen, sin calendario

### Requirement: Los ejemplares de una especie no se ven afectados por su ficha de cultivo

Cambiar la exposición, el entorno, la floración o el calendario de una especie SHALL NOT modificar ninguno de sus ejemplares, sus lecturas ni sus análisis.

#### Scenario: Editar el calendario no toca los ejemplares

- **WHEN** se edita el calendario de una especie con ejemplares
- **THEN** los ejemplares conservan identidad, código, cuidados propios y lecturas
