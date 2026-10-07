## MODIFIED Requirements

### Requirement: Dashboard de trabajo

La aplicación SHALL abrir en un Dashboard con la composición de la pantalla `dashboard` del prototipo: cabecera con **la fecha de hoy** y la acción de crear una tarea; debajo, una **fila de acciones rápidas**; a continuación una **fila de cuatro cifras navegables** —tareas vencidas, tareas para hoy, alertas abiertas y plantas sin revisar—; y debajo dos columnas: la **agenda** («Siguiente trabajo») como columna principal y, en la lateral, las **alertas** más graves, la **carga por zona** y la **actividad reciente**.

El Dashboard SHALL presentar **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra SHALL abrir el listado que representa, no una pantalla genérica. La agenda SHALL agrupar por día con el de hoy destacado, y mostrar de cada tarea su tipo, su prioridad, su título, su destino y su hora o su flexibilidad. La carga por zona SHALL verse como **barra proporcional además de como cifra**, con el número de plantas, de tareas pendientes y de alertas abiertas de cada localización.

La carga por zona SHALL salir **de las localizaciones reales** del API —su nombre y su número de plantas—. Las **tareas** SHALL ser reales: la agenda SHALL mostrar las tareas pendientes más próximas y las cifras de **vencidas** y **para hoy** SHALL contar las del API con la fecha de referencia. Las **alertas** SHALL ser **reales**: la cifra SHALL ser el total de alertas abiertas del API —con un matiz para las críticas— y el bloque lateral SHALL listar las **abiertas más graves**, de la más grave a la más leve y, a igualdad, la más recientemente detectada, cada una con su categoría, su severidad, su título y su destino. **Nada en el Dashboard SHALL aparecer marcado como maqueta ni con un ticket**: el número de tareas por zona sale de `pendingTasks`, «plantas sin revisar» de las alertas abiertas de ese origen y la actividad de `GET /activity`.

#### Scenario: El trabajo pendiente abre la pantalla

- **WHEN** el usuario abre el Dashboard
- **THEN** lo primero que ve tras la cabecera y las acciones rápidas son las cuatro cifras de trabajo —vencidas, para hoy, alertas abiertas y plantas sin revisar—, antes que cualquier panel

#### Scenario: Una cifra abre su conjunto

- **WHEN** el usuario activa la cifra de tareas vencidas
- **THEN** llega a la pantalla de tareas **ya filtrada por vencidas**, con el filtro a la vista y quitable, y si activa la de alertas abiertas o la de plantas sin revisar llega a la bandeja con ese conjunto

#### Scenario: La fecha viene de fuera

- **WHEN** se monta el Dashboard con una fecha de referencia dada
- **THEN** la cabecera, el grupo «hoy» de la agenda y la clasificación de lo vencido se calculan con esa fecha y no con el reloj del navegador

#### Scenario: Carga por zona real

- **WHEN** el API devuelve localizaciones con su número de plantas, de tareas pendientes y de alertas abiertas
- **THEN** el panel de carga por zona muestra cada localización con los tres números y una barra proporcional a la que más plantas tiene

#### Scenario: Las alertas son reales

- **WHEN** el API tiene alertas abiertas de varias severidades
- **THEN** la cifra cuenta todas las abiertas, el bloque lateral lista las más graves primero y ninguna aparece marcada como ejemplo

#### Scenario: Sin alertas

- **WHEN** no hay ninguna alerta abierta
- **THEN** la cifra es 0 y el bloque lo dice, sin simular alertas

#### Scenario: Lo que falta, declarado

- **WHEN** se abre el Dashboard
- **THEN** ningún bloque ni cifra aparece marcado con un ticket ni como dato de ejemplo

#### Scenario: Las tareas son reales

- **WHEN** hay tareas pendientes vencidas, de hoy y futuras
- **THEN** la agenda las muestra, las cifras de vencidas y de hoy las cuentan, y ninguna aparece marcada como ejemplo

#### Scenario: Error de carga de las alertas

- **WHEN** el API de alertas falla
- **THEN** el bloque de alertas y su cifra lo explican con la opción de reintentar, y el resto del Dashboard sigue visible

#### Scenario: Error de carga de las localizaciones

- **WHEN** el API de localizaciones falla
- **THEN** el panel de carga por zona lo explica con la opción de reintentar y el resto del Dashboard sigue visible

## ADDED Requirements

### Requirement: Las cifras del Dashboard abren su conjunto

El Dashboard SHALL presentar **cuatro cifras navegables**: tareas **vencidas**, tareas **para hoy**, **alertas abiertas** y **plantas sin revisar**. Cada una SHALL abrir **el listado que representa, ya filtrado y con el filtro a la vista y quitable**: las vencidas y las de hoy, `/tasks` con `?due=overdue` o `?due=today`; las alertas abiertas, la bandeja con las abiertas; las plantas sin revisar, la bandeja con las alertas abiertas de origen «sin revisar». «Plantas sin revisar» SHALL salir de las **alertas abiertas** de ese origen —una sola definición de revisión— y NO SHALL calcularse por separado. «Vencidas» SHALL decir cuántas lo están **desde hace más de una semana**. Ninguna cifra SHALL ser una cifra sin salida ni una maqueta.

#### Scenario: Cada cifra abre su listado

- **WHEN** se activa cada una de las cuatro cifras
- **THEN** llega a la pantalla de tareas o de alertas **ya filtrada** por ese concepto, con el filtro quitable

#### Scenario: Sin revisar viene de las alertas

- **WHEN** hay 7 alertas abiertas de origen «sin revisar»
- **THEN** la cifra dice 7 y abre la bandeja con esas 7

#### Scenario: Vencidas hace más de una semana

- **WHEN** hay 5 tareas vencidas y 2 terminaron hace más de siete días
- **THEN** la cifra dice 5 y su pie dice «2 desde hace más de una semana»

#### Scenario: Una cifra a cero

- **WHEN** no hay ninguna tarea vencida
- **THEN** la cifra dice 0 y sigue abriendo el listado, que lo explica

#### Scenario: Ninguna marca de maqueta

- **WHEN** se abre el Dashboard
- **THEN** ninguna cifra aparece marcada con un ticket ni como dato de ejemplo

### Requirement: Carga por zona con trabajo e incidencias

La carga por zona SHALL mostrar, de cada localización, **el número de plantas, de tareas pendientes y de alertas abiertas** con la barra proporcional a la mayor carga de plantas, y cada zona SHALL abrir su ficha. Las tareas SHALL salir de `pendingTasks` y las alertas de `openAlerts`, sin una petición por zona. Una zona sin tareas ni alertas SHALL decirlo sin ocultarse. Lo que falle SHALL explicarse sin tumbar el resto de la pantalla.

#### Scenario: Una zona con trabajo

- **WHEN** «Invernadero 1» tiene 486 plantas, 21 tareas y 2 alertas
- **THEN** la tarjeta lo dice con la barra proporcional y abre su ficha

#### Scenario: Una zona sin nada

- **WHEN** una zona no tiene tareas ni alertas
- **THEN** la tarjeta muestra 0 tareas y 0 alertas

#### Scenario: Error de carga

- **WHEN** el API de localizaciones falla
- **THEN** el panel lo explica con la opción de reintentar y el resto del Dashboard sigue visible

### Requirement: Actividad reciente en el Dashboard

La columna lateral del Dashboard SHALL incluir un panel **«Actividad reciente»** con las últimas entradas de `GET /activity`: cada una con su tipo en texto, su instante relativo y su destino —un lote como «Lectura en 31 plantas», una tarea como su título y las plantas que afectó, un comentario o una intervención con su planta enlazada a su ficha—. Un lote SHALL ser **una sola línea**. Sin actividad SHALL decirlo. Un fallo SHALL explicarse sin tumbar el resto. Este panel no existe en el prototipo y SHALL declararse como tal en el design.

#### Scenario: Un lote colapsado

- **WHEN** se registró un riego por lote en 31 plantas
- **THEN** el panel muestra una línea «Lectura en 31 plantas» y no 31

#### Scenario: Una tarea completada

- **WHEN** se completó una tarea
- **THEN** el panel muestra su título y las plantas afectadas

#### Scenario: Un comentario enlaza a su planta

- **WHEN** hay un comentario reciente
- **THEN** su línea muestra el código de la planta, enlazado a su ficha, y el comienzo del texto

#### Scenario: Sin actividad

- **WHEN** no se ha hecho nada
- **THEN** el panel lo dice

#### Scenario: Error de carga

- **WHEN** el API de actividad falla
- **THEN** el panel lo explica con la opción de reintentar y el resto del Dashboard sigue visible

### Requirement: Acciones rápidas del Dashboard

El Dashboard SHALL ofrecer las **acciones rápidas** frecuentes, visibles bajo la cabecera: **añadir planta**, **crear tarea**, **registrar un cuidado por lote**, **abrir la agenda**, **abrir las localizaciones** y **revisar alertas**. «Crear tarea» SHALL abrir el formulario de tarea; «Registrar un cuidado por lote» SHALL abrir el diálogo de lote **sin alcance previo**, pidiendo primero **la localización** a la que se aplica; las demás SHALL navegar. Ninguna SHALL ser una maqueta.

#### Scenario: Crear una tarea

- **WHEN** se pulsa «Crear tarea»
- **THEN** se abre el formulario de tarea

#### Scenario: Cuidado por lote

- **WHEN** se pulsa «Registrar un cuidado por lote»
- **THEN** se abre el diálogo de lote pidiendo la localización y, al elegirla, dice cuántas plantas afecta

#### Scenario: Navegar

- **WHEN** se pulsa «Añadir planta», «Abrir agenda», «Abrir localizaciones» o «Revisar alertas»
- **THEN** llega a la pantalla correspondiente

#### Scenario: Teclado

- **WHEN** se recorre con Tab y se activa con Enter
- **THEN** cada acción es alcanzable y se activa como un botón
