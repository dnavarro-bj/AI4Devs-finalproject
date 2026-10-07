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
