## MODIFIED Requirements

### Requirement: Ficha de cuidados recomendados de una especie

El sistema SHALL exponer la ficha de una especie concreta con los rangos mínimo y máximo de humedad, de temperatura y de horas de luz, la pauta orientativa de riego y **la mezcla de sustrato que tiene recomendada**, además de su identificador y sus dos nombres, de forma que puedan consultarse las condiciones ideales de cultivo sin necesidad de tener una planta de esa especie registrada. Estos datos proceden del catálogo, no de la IA.

La mezcla SHALL viajar identificada, no solo por su nombre: el alta y la corrección de una especie la exigen por identificador, así que sin él **la ficha no basta para reconstruir la especie** y una corrección perdería su mezcla.

#### Scenario: Ficha de una especie existente

- **WHEN** se consulta la ficha de una especie registrada
- **THEN** la respuesta es `200 OK` e incluye su identificador, su nombre científico, su nombre común, los rangos de humedad, de temperatura y de horas de luz, la pauta de riego y su mezcla de sustrato con el identificador y el nombre de esta

#### Scenario: La ficha basta para corregir la especie

- **WHEN** se consulta la ficha de una especie y se envía de vuelta sin cambios como corrección
- **THEN** la especie conserva la mezcla de sustrato que tenía, porque la ficha la incluía

#### Scenario: Ficha de una especie inexistente

- **WHEN** se consulta la ficha de un identificador de especie que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error que indica que la especie no existe

#### Scenario: Identificador de especie con formato inválido

- **WHEN** se consulta la ficha indicando un identificador que no es una cadena decimal
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica el formato inválido, y no un error interno del servidor
