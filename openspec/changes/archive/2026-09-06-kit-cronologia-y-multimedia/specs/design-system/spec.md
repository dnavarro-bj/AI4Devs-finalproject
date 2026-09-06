## ADDED Requirements

### Requirement: Cronología de eventos

El sistema SHALL ofrecer un componente de cronología que presenta eventos heterogéneos **del más reciente al más antiguo**, cada uno con su tipo, su título, su fecha y un cuerpo propio. Los eventos SHALL poder filtrarse por tipo sin que el orden cambie. Un tipo de evento desconocido SHALL mostrarse igual, con una representación de reserva: ocultarlo escondería algo que ocurrió de verdad.

#### Scenario: Orden descendente

- **WHEN** se muestran eventos de distintas fechas
- **THEN** aparecen del más reciente al más antiguo

#### Scenario: Filtrar por tipo

- **WHEN** el usuario filtra por un tipo de evento
- **THEN** solo se muestran los de ese tipo, en el mismo orden, y el resto no se pierde al quitar el filtro

#### Scenario: Densidades distintas, mismo orden

- **WHEN** la cronología incluye eventos de tipos con contenidos de distinta extensión
- **THEN** cada uno se presenta con la densidad que le corresponde sin romper la línea temporal

#### Scenario: Tipo desconocido

- **WHEN** llega un evento de un tipo que el componente no reconoce
- **THEN** se muestra con una representación de reserva y no se descarta

#### Scenario: Cronología vacía

- **WHEN** no hay ningún evento
- **THEN** se indica que no hay nada registrado todavía, y no se muestra una línea vacía

### Requirement: Agenda por vencimiento

El sistema SHALL ofrecer un componente de agenda que agrupa el trabajo pendiente en **vencido, hoy, próximos días y posterior**, calculando la pertenencia a partir de una fecha de referencia que recibe. Los grupos sin contenido NO SHALL mostrarse. El grupo de lo vencido SHALL distinguirse por texto o forma además de por color.

#### Scenario: Reparto por vencimiento

- **WHEN** se muestran entradas con fechas anteriores, iguales y posteriores a la de referencia
- **THEN** cada una cae en su grupo, y lo vencido aparece primero

#### Scenario: Grupo vacío

- **WHEN** ningún elemento cae en uno de los grupos
- **THEN** ese grupo no se muestra

#### Scenario: Lo vencido se distingue sin color

- **WHEN** se muestra el grupo de lo vencido
- **THEN** su condición se comunica con texto o forma, no solo con color

#### Scenario: Agenda vacía

- **WHEN** no hay ninguna entrada pendiente
- **THEN** se indica que no hay trabajo pendiente

### Requirement: Calendario mensual

El sistema SHALL ofrecer un componente de calendario mensual que presenta las semanas de un mes **empezando en lunes**, sitúa cada entrada en su día y permite cambiar de mes. Los días que no pertenecen al mes mostrado SHALL distinguirse de los que sí. Cuando un día acumula más entradas de las que caben, el componente SHALL indicar cuántas quedan sin mostrar en lugar de recortarlas en silencio. El día de referencia SHALL marcarse.

#### Scenario: Semanas empezando en lunes

- **WHEN** se muestra un mes
- **THEN** la primera columna es lunes y el mes aparece completo

#### Scenario: Días de relleno

- **WHEN** el mes no empieza en lunes ni termina en domingo
- **THEN** los días de los meses contiguos se muestran distinguidos de los del mes actual

#### Scenario: Día con muchas entradas

- **WHEN** un día acumula más entradas de las que caben
- **THEN** se indica cuántas quedan sin mostrar

#### Scenario: Cambiar de mes

- **WHEN** el usuario avanza o retrocede de mes
- **THEN** el componente comunica qué mes se ha pedido

#### Scenario: Elegir un día

- **WHEN** el usuario activa un día
- **THEN** el componente comunica cuál, para que la pantalla pueda actuar sobre él

### Requirement: Galería de imágenes

El sistema SHALL ofrecer un componente de galería que presenta imágenes en orden, permite ampliarlas y señala cuál es la principal. Cada imagen SHALL llevar texto alternativo. Una galería sin imágenes SHALL explicar que no hay ninguna en lugar de mostrar un hueco.

#### Scenario: Ampliar una imagen

- **WHEN** el usuario activa una imagen
- **THEN** se muestra ampliada, con su texto y con salida hacia la galería

#### Scenario: Imagen principal

- **WHEN** una de las imágenes está marcada como principal
- **THEN** se distingue de las demás por texto o forma

#### Scenario: Galería vacía

- **WHEN** no hay ninguna imagen
- **THEN** se explica que todavía no hay fotografías

### Requirement: Zona de subida

El sistema SHALL ofrecer un componente de zona de subida que acepta uno o varios ficheros, tanto al elegirlos como al soltarlos encima, y **comunica hacia fuera los ficheros elegidos sin transferirlos**. SHALL ser alcanzable y activable con el teclado, y SHALL indicar qué tipos admite.

#### Scenario: Elegir ficheros

- **WHEN** el usuario elige uno o varios ficheros
- **THEN** el componente comunica cuáles, y no realiza ninguna transferencia

#### Scenario: Soltar ficheros encima

- **WHEN** el usuario suelta ficheros sobre la zona
- **THEN** se comunican igual que si los hubiera elegido

#### Scenario: Alcanzable con el teclado

- **WHEN** el usuario recorre la pantalla con el teclado
- **THEN** alcanza el control de subida y puede activarlo sin ratón

### Requirement: Sección de formulario

El sistema SHALL ofrecer un componente de sección de formulario con título, descripción opcional y contenido, para dividir un formulario largo en bloques con significado para el usuario. El título SHALL nombrar la sección para las tecnologías de asistencia.

#### Scenario: Sección con título y descripción

- **WHEN** se declara una sección con título, descripción y campos
- **THEN** los tres se muestran y la sección queda nombrada por su título

#### Scenario: Sección sin descripción

- **WHEN** se declara una sección solo con su título
- **THEN** no queda ningún hueco de descripción en el marcado

### Requirement: Rango de meses

El sistema SHALL ofrecer un componente que presenta un periodo del año por meses, admitiendo un periodo que **cruza el fin de año** —de noviembre a febrero—. Los meses incluidos SHALL distinguirse de los excluidos por texto o forma además de por color, y el componente SHALL indicar el periodo en palabras.

#### Scenario: Periodo dentro del año

- **WHEN** se declara un periodo de marzo a octubre
- **THEN** esos meses aparecen incluidos y los demás no

#### Scenario: Periodo que cruza el fin de año

- **WHEN** se declara un periodo de noviembre a febrero
- **THEN** noviembre, diciembre, enero y febrero aparecen incluidos, y el resto no

#### Scenario: Un solo mes

- **WHEN** el periodo empieza y termina en el mismo mes
- **THEN** solo ese mes aparece incluido

### Requirement: Barra de proporciones

El sistema SHALL ofrecer un componente que presenta partes de un total con su proporción y su etiqueta, y **SHALL señalar cuando la suma no cuadra**, indicando en cuánto se desvía. El valor de cada parte SHALL leerse como texto además de verse como proporción.

#### Scenario: Proporciones que suman el total

- **WHEN** las partes suman exactamente el total esperado
- **THEN** cada parte se muestra con su proporción y no se señala ningún desajuste

#### Scenario: Suma que no cuadra

- **WHEN** las partes no suman el total esperado
- **THEN** se señala el desajuste y en cuánto se desvía

#### Scenario: El valor se lee

- **WHEN** se muestra una parte
- **THEN** su valor aparece como texto, no solo como longitud de la barra
