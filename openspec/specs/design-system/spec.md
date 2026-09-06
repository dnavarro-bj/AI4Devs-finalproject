# design-system Specification

## Purpose

El sistema de diseño del frontend de Cactify: los tokens visuales compartidos, el catálogo de componentes reutilizables con sus variantes y estados, el armazón de la aplicación y las garantías de accesibilidad que toda pantalla hereda, de modo que una pantalla nueva se componga en lugar de reinventar su presentación.

## Requirements

### Requirement: Tokens de diseño como origen único de la presentación

El sistema SHALL exponer a toda la aplicación un conjunto único de tokens de diseño —color, familias y tamaños tipográficos, escala de espaciado, radios, sombra de superposición, anillo de foco, duraciones de transición y medidas de retícula— derivado de la referencia de diseño del producto. Ningún componente ni pantalla SHALL declarar un color, un radio, una duración o un tamaño tipográfico literal fuera de esos tokens.

#### Scenario: Un componente toma sus colores de los tokens

- **WHEN** se inspecciona el estilo de cualquier componente del kit o de cualquier pantalla de la aplicación
- **THEN** sus colores, radios, tamaños tipográficos y duraciones se expresan como tokens, y no aparece ningún valor de color literal

#### Scenario: Cambiar un token se propaga sin tocar componentes

- **WHEN** se cambia el valor del token de color de marca
- **THEN** la acción primaria, la navegación activa y el anillo de foco pasan a ese color sin modificar ningún componente

#### Scenario: La escala de espaciado es la única disponible

- **WHEN** un componente separa o rellena contenido
- **THEN** usa un valor de la escala de espaciado publicada, y no una medida ajena a ella

### Requirement: Jerarquía de acciones

El sistema SHALL ofrecer un componente de acción con las variantes primaria, secundaria, de texto, destructiva y de solo icono, más un estado deshabilitado y un estado de acción en curso. Una acción de solo icono SHALL exigir un nombre accesible; sin él, el componente NO SHALL poder usarse.

#### Scenario: Variantes distinguibles

- **WHEN** se muestran una acción primaria, una secundaria y una de texto en la misma región
- **THEN** cada una se distingue de las otras por algo más que el color, y solo la primaria tiene el peso visual de acción principal

#### Scenario: Acción de solo icono sin nombre

- **WHEN** se declara una acción de solo icono sin nombre accesible
- **THEN** el componente lo señala como uso incorrecto en lugar de renderizar un control anónimo

#### Scenario: Acción en curso

- **WHEN** una acción está en curso
- **THEN** el control comunica que está en curso y no admite una segunda activación mientras lo esté

#### Scenario: Acción destructiva

- **WHEN** una acción es destructiva
- **THEN** se presenta con la variante destructiva y nunca con la apariencia de la acción primaria

### Requirement: Campos de formulario

El sistema SHALL ofrecer un componente de campo que asocia siempre una etiqueta visible a su control, admite un texto de ayuda, admite un sufijo de unidad fuera del valor editable y presenta los estados vacío, completo, foco, deshabilitado, error y solo lectura. En estado de error el campo SHALL mostrar un mensaje que indique cómo corregirlo y SHALL marcarse como inválido para las tecnologías de asistencia. El texto de ejemplo del control NUNCA SHALL sustituir a la etiqueta.

#### Scenario: Etiqueta asociada al control

- **WHEN** se renderiza un campo del kit
- **THEN** su etiqueta es visible y queda asociada al control, de modo que activarla enfoca el control

#### Scenario: Campo en error

- **WHEN** un campo recibe un mensaje de error
- **THEN** el mensaje se muestra junto al campo, el control queda marcado como inválido y el valor introducido se conserva

#### Scenario: Sufijo de unidad

- **WHEN** un campo declara una unidad
- **THEN** la unidad se muestra dentro del control pero fuera del valor editable, y no forma parte del valor que el campo emite

#### Scenario: Campo de solo lectura

- **WHEN** un campo se declara de solo lectura
- **THEN** su valor es legible y seleccionable, y no admite edición

### Requirement: Estado y prioridad como dimensiones distintas

El sistema SHALL ofrecer un componente de estado —que responde a *cómo está* algo— y un componente de prioridad —que responde a *cuándo actuar*— como componentes separados, con vocabularios propios y no intercambiables. Ambos SHALL comunicar su significado con texto además de con color.

#### Scenario: Estado legible sin color

- **WHEN** se muestra un estado
- **THEN** su significado se lee en el texto del propio componente, sin depender de distinguir su color

#### Scenario: Prioridad y estado no se confunden

- **WHEN** se muestran un estado y una prioridad en la misma región
- **THEN** cada uno se presenta con su forma propia, y ninguno admite los valores del otro

### Requirement: Filtros aplicados

El sistema SHALL ofrecer un componente de filtro aplicado que muestra el criterio activo y permite retirarlo en un solo gesto, sin abrir un menú. Su acción de retirada SHALL tener nombre accesible aunque se represente con un símbolo.

#### Scenario: Retirar un filtro

- **WHEN** el usuario activa la retirada de un filtro aplicado
- **THEN** el componente comunica qué filtro se ha retirado, sin necesidad de abrir ningún menú

### Requirement: Panel

El sistema SHALL ofrecer un componente de panel que agrupa una responsabilidad sobre una superficie delimitada por borde, con una cabecera opcional que alinea el título con una única acción contextual. La sombra SHALL quedar reservada a los elementos realmente superpuestos y NO SHALL usarse para separar paneles ordinarios.

#### Scenario: Panel con cabecera y acción

- **WHEN** se declara un panel con título y una acción contextual
- **THEN** el título y la acción se muestran en su cabecera, y el contenido queda dentro de la superficie del panel

#### Scenario: Panel sin sombra

- **WHEN** se renderiza un panel ordinario
- **THEN** se separa de su fondo mediante borde y superficie, y no mediante sombra

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


### Requirement: Aviso

El sistema SHALL ofrecer un componente de aviso con severidad explícita, título accionable, explicación breve y una acción opcional. Cerrar visualmente un aviso NO SHALL considerarse la resolución de la condición que lo originó.

#### Scenario: Aviso con acción

- **WHEN** se declara un aviso con su severidad, su título, su explicación y una acción
- **THEN** los cuatro elementos se muestran, y la severidad se comunica con texto o forma además de con color

#### Scenario: Aviso descartado

- **WHEN** el usuario descarta un aviso
- **THEN** el aviso deja de mostrarse y el componente no informa de ninguna resolución de la condición de dominio

### Requirement: Diálogo

El sistema SHALL ofrecer un componente de diálogo modal para tareas acotadas y reversibles, con título, cierre explícito, contenido desplazable y acciones estables al final. Mientras está abierto SHALL retener el foco del teclado, SHALL cerrarse con la tecla de escape y al cerrarse SHALL devolver el foco al elemento que lo abrió.

#### Scenario: Diálogo abierto

- **WHEN** se abre un diálogo
- **THEN** su título, su contenido y sus acciones son accesibles, y el foco pasa a su interior

#### Scenario: Cierre con teclado

- **WHEN** el usuario pulsa la tecla de escape con el diálogo abierto
- **THEN** el diálogo se cierra y el foco vuelve al control que lo abrió

#### Scenario: Foco retenido

- **WHEN** el usuario recorre los controles con el tabulador dentro de un diálogo abierto
- **THEN** el foco permanece dentro del diálogo

### Requirement: Toast

El sistema SHALL ofrecer un componente de confirmación efímera que anuncia una acción ya completada, se comunica a las tecnologías de asistencia como mensaje de estado y desaparece por sí solo. NO SHALL usarse para comunicar un error de formulario ni para contener información que el usuario necesite recuperar después.

#### Scenario: Confirmación anunciada

- **WHEN** una acción se completa y se emite una confirmación efímera
- **THEN** el mensaje se muestra y se anuncia como estado, sin robar el foco al usuario

#### Scenario: Confirmación efímera

- **WHEN** transcurre el tiempo de visibilidad de la confirmación
- **THEN** el mensaje desaparece sin intervención del usuario

### Requirement: Breadcrumbs y pestañas

El sistema SHALL ofrecer un componente de breadcrumbs que muestra la ruta hasta la pantalla actual y marca el último elemento como el actual, y un componente de pestañas para cambiar de vista dentro de una pantalla. El estado activo de una pestaña SHALL comunicarse con texto y forma, no solo con color, y las pestañas NO SHALL sustituir a la navegación principal.

#### Scenario: Ruta hasta la pantalla actual

- **WHEN** se muestran los breadcrumbs de una pantalla
- **THEN** los niveles anteriores son navegables y el último se marca como la página actual

#### Scenario: Pestaña activa

- **WHEN** una pestaña está activa
- **THEN** su estado se distingue por forma además de por color, y queda expuesto como seleccionado a las tecnologías de asistencia

### Requirement: Estado vacío y error en línea

El sistema SHALL ofrecer un componente de estado vacío que explica qué falta y ofrece una única acción útil, y un componente de error en línea que identifica el elemento o proceso afectado, describe el siguiente paso y conserva lo que el usuario hubiera introducido.

#### Scenario: Vacío con una sola salida

- **WHEN** se muestra un estado vacío
- **THEN** explica qué falta y ofrece exactamente una acción

#### Scenario: Error en línea

- **WHEN** se muestra un error en línea
- **THEN** identifica qué ha fallado, describe el siguiente paso y se anuncia como alerta a las tecnologías de asistencia

### Requirement: Etiqueta de ejemplar

El sistema SHALL ofrecer un componente de etiqueta de ejemplar que reúne la marca visual del ejemplar, su código permanente, su nombre y su contexto botánico. El código NUNCA SHALL truncarse. El componente SHALL renderizarse correctamente cuando cualquiera de los datos de contexto no esté disponible, omitiendo lo ausente en lugar de mostrar un hueco vacío o un valor inventado.

#### Scenario: Etiqueta completa

- **WHEN** se declara una etiqueta con código, nombre, especie y contexto
- **THEN** los cuatro se muestran y el código aparece íntegro

#### Scenario: Etiqueta con datos ausentes

- **WHEN** se declara una etiqueta sin código y sin datos de contexto
- **THEN** se muestra con el nombre y la especie disponibles, sin huecos vacíos ni valores inventados

### Requirement: Armazón de la aplicación

El sistema SHALL ofrecer el armazón de la aplicación: una barra lateral de navegación que agrupa sus entradas bajo encabezados no navegables y marca la sección activa, una barra superior que aloja los breadcrumbs de la pantalla y la búsqueda global, y un área de contenido con ancho máximo encabezada por la cabecera de página. En pantallas pequeñas la barra lateral SHALL convertirse en un panel lateral desplegable, oculto por defecto, con una acción de apertura y otra de cierre accesibles; al cerrarse SHALL devolver el foco a la acción que lo abrió.

#### Scenario: Sección activa

- **WHEN** el usuario está en una pantalla que corresponde a una entrada de la navegación
- **THEN** esa entrada se marca como activa, con algo más que el color, y queda expuesta como la actual

#### Scenario: Entradas agrupadas

- **WHEN** se renderiza la barra lateral con varias agrupaciones
- **THEN** cada grupo presenta su encabezado y sus entradas, y el encabezado no es un control activable

#### Scenario: Navegación en pantalla pequeña

- **WHEN** la aplicación se muestra en una pantalla pequeña
- **THEN** la navegación lateral está oculta y se abre y se cierra mediante controles con nombre accesible

#### Scenario: Contenido con ancho máximo

- **WHEN** la aplicación se muestra en una pantalla muy ancha
- **THEN** el área de contenido no supera su ancho máximo y permanece legible


### Requirement: Garantías de accesibilidad comunes

Todo componente del sistema SHALL cumplir un mínimo común: foco visible y separado del borde del control al navegar con teclado, área interactiva no inferior a la mínima recomendada, ninguna información transmitida únicamente por el color y respeto de la preferencia de movimiento reducido, ante la cual las transiciones SHALL anularse.

#### Scenario: Foco visible con teclado

- **WHEN** el usuario alcanza un control del kit con el teclado
- **THEN** el control muestra un indicador de foco visible y separado de su borde

#### Scenario: Movimiento reducido

- **WHEN** el usuario ha declarado en su sistema la preferencia de movimiento reducido
- **THEN** las transiciones de los componentes se anulan y ninguna animación se reproduce

#### Scenario: Información no dependiente del color

- **WHEN** se muestra cualquier componente que comunique severidad, estado, prioridad o selección
- **THEN** ese significado es legible a través del texto o de la forma, sin necesidad de distinguir colores

### Requirement: Galería del sistema de diseño

La aplicación SHALL ofrecer una galería que muestra los componentes reales del sistema con sus variantes y sus estados, servida por la propia aplicación para que refleje siempre la implementación vigente y no una copia. La galería SHALL ser una superficie de desarrollo y NO SHALL formar parte de la navegación de producto.

#### Scenario: Galería con los componentes vigentes

- **WHEN** se abre la galería
- **THEN** muestra los componentes del sistema con sus variantes y estados, renderizados con la misma implementación que usan las pantallas

#### Scenario: La galería no es producto

- **WHEN** el usuario recorre la navegación de la aplicación
- **THEN** la galería no aparece como una sección de producto

### Requirement: Cabecera de página

El sistema SHALL ofrecer un componente de cabecera de página que presenta el título de la pantalla, un texto de contexto opcional y sus acciones principales, de modo que ninguna pantalla resuelva por su cuenta esa composición. El título SHALL ser el encabezado de primer nivel de la pantalla.

#### Scenario: Cabecera con título y acciones

- **WHEN** se declara una cabecera con título, contexto y acciones
- **THEN** los tres se muestran, con el título como encabezado principal y las acciones alineadas a su altura

#### Scenario: Cabecera sin acciones

- **WHEN** se declara una cabecera solo con su título
- **THEN** se muestra el título sin reservar ni dejar visible ningún hueco de acciones

### Requirement: Búsqueda global como componente

El sistema SHALL ofrecer un componente de búsqueda global que acepta un texto, presenta los resultados **agrupados por tipo** y permite activar uno. SHALL exponerse a las tecnologías de asistencia como un campo de búsqueda con su lista de resultados, SHALL poder recorrerse enteramente con el teclado y SHALL distinguir el estado sin resultados del estado inicial sin búsqueda.

#### Scenario: Resultados agrupados

- **WHEN** el componente recibe resultados de varios tipos
- **THEN** los presenta agrupados, con cada grupo identificado por su tipo

#### Scenario: Recorrido con teclado

- **WHEN** el usuario escribe y recorre los resultados con el teclado
- **THEN** puede desplazarse por ellos y activar uno sin usar el ratón, y el resultado enfocado queda expuesto como el activo

#### Scenario: Sin resultados frente a sin búsqueda

- **WHEN** el usuario escribe un texto que no coincide con nada
- **THEN** el componente indica que no hay resultados, que es un estado distinto de no haber buscado todavía

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

### Requirement: Navegación de secciones de un formulario

El sistema SHALL ofrecer un componente de navegación de las secciones de un formulario largo, que marca en cuál se está y puede señalar cuáles están completas. La sección actual SHALL distinguirse por algo más que el color, y las completas SHALL indicarse con texto además de con una marca. NO SHALL exponerse como pestañas: las pestañas cambian de vista, y esto recorre un mismo formulario.

#### Scenario: Sección actual

- **WHEN** se muestra la navegación de un formulario
- **THEN** la sección actual queda marcada como tal, con algo más que el color

#### Scenario: Elegir una sección

- **WHEN** el usuario elige otra sección
- **THEN** el componente comunica cuál se ha pedido

#### Scenario: Sección completa

- **WHEN** una sección está completa
- **THEN** se indica con texto, no solo con una marca visual

### Requirement: Agrupación de controles de filtrado

La barra de filtros SHALL agruparse como un **conjunto de controles de formulario**, nombrado por su propia leyenda y no por un atributo de accesibilidad añadido. Sus controles SHALL alinearse por su **borde superior**, de modo que un campo con texto de ayuda no desplace su control respecto a los que no la tienen.

#### Scenario: Grupo nombrado nativamente

- **WHEN** una tecnología de asistencia alcanza la barra de filtros
- **THEN** el grupo queda nombrado por su leyenda

#### Scenario: Campos con y sin ayuda en la misma fila

- **WHEN** la barra combina campos con texto de ayuda y campos sin él
- **THEN** todos los controles quedan a la misma altura, y la ayuda cuelga por debajo

### Requirement: Campo en línea

El componente de campo SHALL admitir una disposición **en línea**, con la etiqueta y su texto de ayuda a un lado y el control al otro, conservando la asociación entre etiqueta y control y el anuncio de la ayuda a las tecnologías de asistencia.

#### Scenario: Etiqueta asociada en línea

- **WHEN** se renderiza un campo en línea
- **THEN** su etiqueta sigue asociada al control y su ayuda sigue anunciándose

#### Scenario: Distinguible del apilado

- **WHEN** se comparan un campo en línea y uno apilado
- **THEN** se distinguen en el marcado, de modo que ninguna pantalla necesite imitar la disposición con estilos propios

### Requirement: Acción alineada con los campos

El sistema SHALL ofrecer una forma de colocar **un control sin rótulo** —un botón, típicamente— en una fila de campos, quedando alineado con los controles de esos campos. El hueco del rótulo SHALL derivarse del propio estilo de los rótulos de campo y NO de una medida fija, de modo que cambiar la tipografía o el espaciado no vuelva a desalinearlo. El hueco NO SHALL anunciarse a las tecnologías de asistencia.

#### Scenario: Control sin rótulo en una fila de campos

- **WHEN** se coloca un control sin rótulo junto a campos con rótulo
- **THEN** queda a la altura de los controles de esos campos

#### Scenario: El hueco no se anuncia

- **WHEN** una tecnología de asistencia recorre la fila
- **THEN** el hueco del rótulo no se anuncia como contenido

#### Scenario: Con rótulo propio

- **WHEN** el control declara su propio rótulo
- **THEN** se muestra ese rótulo en lugar del hueco
