## ADDED Requirements

### Requirement: La ficha de especie muestra su ficha de cultivo y su año

La ficha de una especie SHALL mostrar con datos reales la descripción en la cabecera, la exposición y el entorno entre las condiciones, la rejilla «Año de cultivo» con una fila de crecimiento, otra de floración y otra de riego, y el perfil de floración con periodo, color, madurez, duración y notas. Un periodo que cruza el fin de año SHALL pintar los meses de diciembre y de enero seguidos. La intensidad del riego SHALL verse como intensidad y no solo como presencia, y el crecimiento máximo como un crecimiento más intenso. Un dato sin definir SHALL leerse como «Sin definir», no como un valor vacío ni inventado. La ficha SHALL seguir marcando con su ticket lo que no existe aún —fotografías, grupos de cultivo, lista de ejemplares— y el número de ejemplares SHALL ser el real.

#### Scenario: Año de cultivo con cruce de año

- **WHEN** se abre la ficha de una especie con reposo de noviembre a febrero
- **THEN** la fila correspondiente enciende noviembre, diciembre, enero y febrero

#### Scenario: Crecimiento máximo sobre el crecimiento

- **WHEN** se abre la ficha de una especie con crecimiento de marzo a junio y crecimiento máximo de abril a mayo
- **THEN** abril y mayo se pintan con más fuerza que marzo y junio

#### Scenario: Especie sin calendario

- **WHEN** se abre la ficha de una especie sin periodos
- **THEN** la rejilla se muestra sin actividad y la ficha dice que el calendario no está definido

#### Scenario: Exposición y entorno reales

- **WHEN** se abre la ficha de una especie con exposición `pleno_sol` y entorno `exterior`
- **THEN** la ficha muestra «Pleno sol» y «Exterior»

#### Scenario: Floración sin datos

- **WHEN** la especie no tiene color ni madurez de floración
- **THEN** esos datos muestran «Sin definir»

### Requirement: Alta y edición de la ficha de cultivo y del calendario

El formulario de especie SHALL permitir indicar la descripción, la exposición, el entorno, el calendario anual y los datos de floración. La exposición SHALL presentarse como cuatro opciones con **su definición funcional visible** bajo cada una, sin umbrales numéricos. El entorno SHALL ofrecer exactamente interior, exterior y ambos.

El calendario SHALL editarse **sobre la propia rejilla del año**, como la de la ficha, y no con selectores: cuatro pautas —crecimiento, reposo, floración y riego— por doce meses, donde cada mes es **pulsable** y cada pulsación sube su intensidad hasta el máximo de la pauta y a la siguiente lo apaga. El crecimiento tiene dos niveles (el segundo es el **crecimiento máximo**, superpuesto al crecimiento), el riego tres (de escaso a abundante), y reposo y floración uno. Los meses consecutivos se envían como **un** periodo; diciembre y enero marcados seguidos, como uno que cruza el fin de año. Como cada mes tiene un solo nivel por pauta, el formulario no puede producir periodos solapados ni un crecimiento máximo fuera del crecimiento. El formulario SHALL explicar cómo se usa la rejilla, conservar lo escrito ante un error del API y precargar el calendario guardado en la edición.

#### Scenario: Elegir exposición con su definición a la vista

- **WHEN** se abre el formulario
- **THEN** cada opción de exposición muestra su definición y ninguna exige un número de horas

#### Scenario: Tres opciones de entorno

- **WHEN** se abre el formulario
- **THEN** el entorno ofrece interior, exterior y ambos, y no ofrece «estacional»

#### Scenario: Calendario como rejilla pulsable

- **WHEN** se abre la sección de crecimiento y floración
- **THEN** muestra una rejilla de cuatro pautas por doce meses cuyas casillas son botones, y ningún selector de periodo

#### Scenario: Marcar y quitar un mes

- **WHEN** se pulsa un mes de la floración, y se vuelve a pulsar
- **THEN** primero queda marcado y después vuelve a quedar sin marcar

#### Scenario: Segundo nivel de crecimiento

- **WHEN** se marcan de marzo a junio en crecimiento y se vuelve a pulsar abril y mayo
- **THEN** abril y mayo muestran el nivel máximo, y se envían un crecimiento de marzo a junio y un crecimiento máximo de abril a mayo

#### Scenario: Una tercera pulsación lo quita todo

- **WHEN** se pulsa tres veces un mes de crecimiento
- **THEN** el mes queda sin crecimiento ni crecimiento máximo

#### Scenario: Intensidad del riego

- **WHEN** se pulsa un mes de riego una, dos y tres veces
- **THEN** pasa por escaso, moderado y abundante, y se envía con esa intensidad

#### Scenario: Periodo que cruza el año

- **WHEN** se marcan noviembre, diciembre, enero y febrero en el reposo
- **THEN** se envía un solo reposo con inicio `11` y fin `2`

#### Scenario: La edición precarga

- **WHEN** se abre la corrección de una especie con calendario y floración
- **THEN** la rejilla muestra sus meses con su intensidad y los datos de floración tal como están guardados

#### Scenario: Error del API sin perder lo escrito

- **WHEN** el API rechaza el guardado
- **THEN** el formulario explica el motivo y conserva todo lo introducido
