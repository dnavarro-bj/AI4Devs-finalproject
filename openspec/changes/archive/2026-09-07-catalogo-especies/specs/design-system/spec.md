## ADDED Requirements

### Requirement: Pauta anual

El sistema SHALL ofrecer un componente que presenta una o varias pautas a lo largo de los doce meses del año, cada una con su nombre y con una **intensidad por mes**, de modo que un vistazo baste para ver cuándo ocurre cada cosa y con cuánta fuerza.

El componente SHALL mostrar los doce meses aunque ninguna pauta tenga actividad, porque la rejilla vacía sigue diciendo qué se va a poder registrar. El tono de cada pauta SHALL decidirlo quien la usa: el componente no conoce qué es «crecimiento» ni «riego».

Cuando se le dé una leyenda, el componente SHALL mostrarla, porque una intensidad en color no se interpreta sola.

#### Scenario: Varias pautas a lo largo del año

- **WHEN** se le dan varias pautas con su actividad por mes
- **THEN** cada una ocupa su fila, con los doce meses rotulados una sola vez en la cabecera

#### Scenario: Intensidad por mes

- **WHEN** una pauta declara distinta intensidad en distintos meses
- **THEN** cada mes se representa con la intensidad que le corresponde, y no solo como presente o ausente

#### Scenario: Pauta sin actividad

- **WHEN** ninguna pauta tiene actividad en ningún mes
- **THEN** la rejilla se muestra igual, con sus doce meses y sus filas, en lugar de desaparecer

#### Scenario: Meses fuera de la rejilla

- **WHEN** se le dan más o menos de doce valores para una pauta
- **THEN** la rejilla sigue teniendo doce meses, sin descuadrarse ni omitir columnas

#### Scenario: La leyenda explica la intensidad

- **WHEN** se le da una leyenda
- **THEN** se muestra con la muestra de color de cada pauta junto a su significado
