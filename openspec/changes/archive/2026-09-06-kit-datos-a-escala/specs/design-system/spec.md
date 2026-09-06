## MODIFIED Requirements

### Requirement: Tabla de datos con selección y acciones masivas

El sistema SHALL ofrecer un componente de tabla para inventarios, con una primera columna identificativa visualmente dominante, selección de filas opcional y una barra de acciones masivas que SHALL aparecer únicamente cuando hay al menos una fila seleccionada. La barra SHALL declarar cuántos elementos afecta la acción antes de ejecutarla. En pantallas estrechas la tabla SHALL conservar desplazamiento horizontal en lugar de ocultar columnas.

La tabla SHALL permitir **ordenar por una columna** que se declare ordenable, exponiendo a las tecnologías de asistencia cuál es la columna ordenada y en qué sentido. SHALL permitir además **mostrar y ocultar columnas**, conservando siempre visible la columna identificativa, y ofrecer una **densidad** alternativa más compacta. Ordenar o cambiar las columnas visibles NO SHALL perder la selección en curso.

La tabla NO SHALL ordenar los datos por sí misma: emite el criterio y quien sirve las filas ya ordenadas es la pantalla.

#### Scenario: Sin selección no hay acciones masivas

- **WHEN** la tabla se muestra sin ninguna fila seleccionada
- **THEN** la barra de acciones masivas no está presente

#### Scenario: Cantidad declarada

- **WHEN** el usuario selecciona varias filas
- **THEN** la barra de acciones masivas aparece indicando cuántos elementos hay seleccionados

#### Scenario: Selección de todas las filas

- **WHEN** el usuario activa la selección global de la tabla
- **THEN** quedan seleccionadas todas las filas mostradas y la cantidad indicada coincide con ellas

#### Scenario: Tabla en pantalla estrecha

- **WHEN** la tabla se muestra en una pantalla más estrecha que su contenido
- **THEN** el contenido se desplaza horizontalmente y ninguna columna se pierde

#### Scenario: Ordenar por una columna

- **WHEN** el usuario activa el encabezado de una columna ordenable
- **THEN** la tabla comunica el criterio de ordenación hacia fuera y marca esa columna como la ordenada, indicando el sentido

#### Scenario: Invertir el sentido

- **WHEN** el usuario vuelve a activar el encabezado de la columna ya ordenada
- **THEN** el sentido se invierte y así queda expuesto

#### Scenario: Columna no ordenable

- **WHEN** una columna no se declara ordenable
- **THEN** su encabezado no es activable y no comunica ningún criterio

#### Scenario: Ocultar una columna

- **WHEN** el usuario oculta una columna
- **THEN** esa columna deja de mostrarse y las demás permanecen, sin perder la selección en curso

#### Scenario: La columna identificativa no se puede ocultar

- **WHEN** el usuario recorre las columnas que puede ocultar
- **THEN** la columna identificativa no está entre ellas, porque sin ella una fila deja de poder reconocerse

## ADDED Requirements

### Requirement: Paginación

El sistema SHALL ofrecer un componente de paginación que muestre en qué página se está y cuántas hay, y permita avanzar y retroceder. En la primera página la acción de retroceder SHALL estar deshabilitada, y en la última la de avanzar. Mientras la página se está cargando ambas SHALL estar deshabilitadas, para que no se encolen saltos. El componente NO SHALL mostrarse cuando solo hay una página.

#### Scenario: Una sola página

- **WHEN** el contenido cabe en una única página
- **THEN** la paginación no se muestra

#### Scenario: Posición y total

- **WHEN** se muestra la paginación
- **THEN** indica la página actual y cuántas hay en total, contando desde uno

#### Scenario: Bordes del recorrido

- **WHEN** el usuario está en la primera página
- **THEN** retroceder está deshabilitado; y en la última, lo está avanzar

#### Scenario: Cambio de página en curso

- **WHEN** una página se está cargando
- **THEN** ninguna de las dos acciones admite activación

### Requirement: Barra de filtros

El sistema SHALL ofrecer un componente de barra de filtros que reúne los controles de filtrado y los criterios ya aplicados, presentados como filtros retirables. SHALL permitir retirar un criterio concreto y retirarlos todos de una vez. La acción de retirarlos todos NO SHALL mostrarse cuando no hay ninguno aplicado.

#### Scenario: Criterios aplicados a la vista

- **WHEN** hay filtros aplicados
- **THEN** cada uno se muestra como un filtro retirable, identificando qué criterio representa

#### Scenario: Retirar un criterio

- **WHEN** el usuario retira uno de los criterios aplicados
- **THEN** el componente comunica cuál se ha retirado y los demás permanecen

#### Scenario: Sin filtros aplicados

- **WHEN** no hay ningún criterio aplicado
- **THEN** no se muestra la acción de limpiar filtros, porque no habría nada que limpiar

### Requirement: Métrica navegable

El sistema SHALL ofrecer un componente de métrica que presenta una cifra, lo que representa y un contexto opcional, y que **SHALL ser navegable**: llevar al conjunto que la cifra resume, ya filtrado. Una métrica sin destino NO SHALL presentarse como activable. La severidad de una métrica SHALL comunicarse con texto o forma además de con color.

#### Scenario: La cifra lleva a su conjunto

- **WHEN** el usuario activa una métrica que declara destino
- **THEN** la aplicación lleva al listado que esa cifra resume

#### Scenario: Métrica sin destino

- **WHEN** una métrica no declara destino
- **THEN** se muestra como dato y no como control activable

#### Scenario: Métrica en cero

- **WHEN** una métrica vale cero
- **THEN** se muestra el cero, que es información, y no se oculta el bloque

### Requirement: Árbol jerárquico

El sistema SHALL ofrecer un componente de árbol para presentar una jerarquía —localizaciones, en el producto— donde cada nodo muestra su nombre y un recuento, y los nodos con descendientes se pueden plegar y desplegar. El estado plegado o desplegado SHALL quedar expuesto a las tecnologías de asistencia, y el árbol SHALL poder recorrerse con el teclado.

#### Scenario: Nodo con descendientes

- **WHEN** se muestra un nodo que contiene otros
- **THEN** ofrece plegarse y desplegarse, y su estado queda expuesto

#### Scenario: Nodo hoja

- **WHEN** se muestra un nodo sin descendientes
- **THEN** no ofrece plegado, porque no hay nada que plegar

#### Scenario: Recuento por nodo

- **WHEN** se muestra un nodo con su recuento
- **THEN** el recuento acompaña al nombre y se distingue de él

#### Scenario: Selección de un nodo

- **WHEN** el usuario activa un nodo
- **THEN** el componente comunica cuál se ha elegido
