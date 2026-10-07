## REMOVED Requirements

### Requirement: Tareas en tres vistas

**Reason**: describía una maqueta cuyas acciones se declaraban como T-22 y no modificaban ninguna tarea; con el API de tareas todas funcionan.

**Migration**: sustituida por «Tareas sobre datos reales en tres vistas» y los requisitos de crear, completar y reprogramar de este change.

## MODIFIED Requirements

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su código, su ruta y sus acciones; **fila de métricas** del espacio; columna principal con **lo que contiene** —las sublocalizaciones— y los ejemplares que alberga; y columna lateral con las características del espacio, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta completa**, y los **breadcrumbs reflejan esa ruta real** —Inicio / Localizaciones / cada ancestro / la localización— con cada ancestro navegable. Las métricas SHALL presentarse como **cifras destacadas** con su matiz: los ejemplares totales con cuántos hay directamente aquí, y cuántas sublocalizaciones. «Dentro de …» SHALL listar las sublocalizaciones con su carga y ofrecer **añadir dentro**, que abre el alta con esta localización como padre. Los ejemplares SHALL ir paginados con su ubicación exacta, y SHALL ofrecer ver el inventario filtrado por esta localización incluidos sus descendientes. Las características SHALL mostrar tipo, entorno, exposición, capacidad y **ocupación** (solo si hay capacidad) y las notas operativas. Los últimos movimientos SHALL mostrar los más recientes con su sentido —recibidos o cedidos, con el origen o el destino— y ofrecer el historial completo.

Las **tareas y el próximo trabajo** SHALL ser **reales**: la métrica de tareas SHALL contar las tareas pendientes dirigidas a esta localización, a sus sublocalizaciones o a plantas que están en ellas; «Próximo trabajo» SHALL listar las más próximas, cada una con su tipo, su título y su periodo, y enlazar a la pantalla de tareas ya filtrada por esta localización; y «Crear tarea aquí» SHALL abrir el formulario con esta localización como destino. Lo que el prototipo muestra y el API todavía no sirve —las **alertas** (T-23)— SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

#### Scenario: Ficha con ejemplares

- **WHEN** se abre la ficha de una localización que alberga ejemplares
- **THEN** se muestran su portada, sus métricas y esos ejemplares, cada uno navegable a su ficha
- **AND** se ofrece ver el inventario filtrado por esa localización con sus descendientes

#### Scenario: La ruta real en la portada y en los breadcrumbs

- **WHEN** se abre la ficha de `Bandeja A3`, dentro de `Bancada norte`, dentro de `Invernadero 1`
- **THEN** la portada muestra `Invernadero 1 / Bancada norte` y los breadcrumbs son Inicio / Localizaciones / Invernadero 1 / Bancada norte / Bandeja A3, con los ancestros navegables

#### Scenario: Las métricas abren la pantalla

- **WHEN** se abre la ficha
- **THEN** los ejemplares totales aparecen como cifra destacada con cuántos hay directamente aquí, junto a las sublocalizaciones

#### Scenario: Lo que contiene

- **WHEN** se abre la ficha de una localización con sublocalizaciones
- **THEN** «Dentro de» las lista con su carga, cada una navegable, y ofrece añadir otra dentro

#### Scenario: Ficha de una localización vacía

- **WHEN** se abre la ficha de una localización sin ejemplares ni sublocalizaciones
- **THEN** se indica que está vacía y se ofrece retirarla

#### Scenario: Ocupación solo con capacidad

- **WHEN** la localización tiene capacidad `250` y alberga 183 ejemplares totales
- **THEN** la ocupación se muestra como 73 %
- **AND** sin capacidad no se muestra un porcentaje sino que se dice que no está definida

#### Scenario: Últimos movimientos

- **WHEN** la localización ha recibido y cedido ejemplares
- **THEN** la columna lateral muestra los más recientes con el sentido y el origen o destino, y ofrece el historial completo

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre la ficha de una localización
- **THEN** las alertas aparecen marcadas con su ticket (T-23), en el bloque del layout que ocupan en el prototipo, mientras que las tareas y el próximo trabajo son reales

#### Scenario: Próximo trabajo de la localización

- **WHEN** la localización tiene tareas pendientes propias, de sus sublocalizaciones y de plantas que están en ella
- **THEN** la métrica de tareas las cuenta todas y «Próximo trabajo» lista las más próximas, y enlaza a `/tasks` filtrada por esta localización con sus descendientes

#### Scenario: Crear una tarea aquí

- **WHEN** se pulsa «Crear tarea aquí»
- **THEN** se abre el formulario de tarea con esta localización ya elegida como destino

#### Scenario: Sin tareas

- **WHEN** la localización no tiene tareas pendientes
- **THEN** «Próximo trabajo» lo dice y ofrece crear una

#### Scenario: Localización inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la localización no existe, con salida al catálogo, y no una pantalla en blanco

### Requirement: Dashboard de trabajo

La aplicación SHALL abrir en un Dashboard con la composición de la pantalla `dashboard` del prototipo: cabecera con **la fecha de hoy** y la acción de crear una tarea; a continuación una **fila de tres cifras navegables** —tareas vencidas, tareas para hoy y alertas abiertas—; y debajo dos columnas: la **agenda** («Siguiente trabajo») como columna principal y, en la lateral, las **alertas** más recientes y la **carga por zona**.

El Dashboard SHALL presentar **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra SHALL abrir el listado que representa, no una pantalla genérica. La agenda SHALL agrupar por día con el de hoy destacado, y mostrar de cada tarea su tipo, su prioridad, su título, su destino y su hora o su flexibilidad. La carga por zona SHALL verse como **barra proporcional además de como cifra**, con el número de plantas de cada localización.

La carga por zona SHALL salir **de las localizaciones reales** del API —su nombre y su número de plantas—. Las **tareas** SHALL ser reales: la agenda SHALL mostrar las tareas pendientes más próximas y las cifras de **vencidas** y **para hoy** SHALL contar las del API con la fecha de referencia. Lo que depende de entidades que no existen —las **alertas** (T-23) y su cifra— SHALL salir de datos de ejemplo y aparecer **marcado con su ticket en su sitio del layout**, y el **número de tareas por zona** SHALL aparecer marcado con T-24, que es quien lo agrega. Nada marcado SHALL presentarse como dato real.

#### Scenario: El trabajo pendiente abre la pantalla

- **WHEN** el usuario abre el Dashboard
- **THEN** lo primero que ve tras la cabecera son las tres cifras de trabajo —vencidas, para hoy y alertas abiertas—, antes que cualquier panel

#### Scenario: Una cifra abre su conjunto

- **WHEN** el usuario activa la cifra de tareas vencidas
- **THEN** llega a la pantalla de tareas **ya filtrada por vencidas**, con el filtro a la vista y quitable, y si activa la de alertas abiertas llega a la de alertas con las abiertas

#### Scenario: La fecha viene de fuera

- **WHEN** se monta el Dashboard con una fecha de referencia dada
- **THEN** la cabecera, el grupo «hoy» de la agenda y la clasificación de lo vencido se calculan con esa fecha y no con el reloj del navegador

#### Scenario: Carga por zona real

- **WHEN** el API devuelve localizaciones con su número de plantas
- **THEN** el panel de carga por zona muestra cada localización con su número de plantas y una barra proporcional a la mayor de ellas

#### Scenario: Lo que falta, declarado

- **WHEN** se abre el Dashboard
- **THEN** las alertas y su cifra aparecen marcadas con T-23 y como datos de ejemplo, y el número de tareas por zona queda marcado con T-24 en su sitio de la tarjeta

#### Scenario: Las tareas son reales

- **WHEN** hay tareas pendientes vencidas, de hoy y futuras
- **THEN** la agenda las muestra, las cifras de vencidas y de hoy las cuentan, y ninguna aparece marcada como ejemplo

#### Scenario: Error de carga de las localizaciones

- **WHEN** el API de localizaciones falla
- **THEN** el panel de carga por zona lo explica con la opción de reintentar y el resto del Dashboard sigue visible

## ADDED Requirements

### Requirement: Tareas sobre datos reales en tres vistas

La aplicación SHALL mostrar las tareas con la composición de la pantalla `tasks` del prototipo: cabecera con la acción de crear, **selector de vista** con agenda, calendario y completadas —y el número de tareas pendientes en la agenda—, barra de filtros con **localización, tipo y prioridad** y los criterios aplicados retirables uno a uno, y debajo la vista elegida. Los datos SHALL salir del API de tareas; **no queda ningún dato de ejemplo ni marca T-22** en la pantalla. Los filtros y la vista elegida SHALL vivir en la URL, y `?due=overdue` y `?due=today`, que abren las cifras del Dashboard, SHALL aplicarse como filtro a la vista y quitable. La fecha de referencia SHALL ser la del día real y SHALL enviarse al API.

La **agenda** SHALL agrupar las tareas pendientes en «Vencidas», «Hoy», «Próximos 7 días» y «Más adelante», con el número de cada grupo y, de cada tarea, su casilla de completar, su tipo, su prioridad, su título, su destino —la localización con su ruta, o «N plantas»— y su periodo. El **calendario** SHALL mostrar el mes con las tareas pendientes en los días de su periodo, resaltar las vencidas, resumir con «+N» los días con más tareas de las que caben y abrir el formulario de creación al elegir un día. **Completadas** SHALL listar lo cerrado —completadas, omitidas y canceladas— con su estado dicho en texto, la fecha y, en las completadas, cuántas plantas afectó. Una misma tarea pendiente SHALL contarse igual en la agenda y en el calendario. Si hay más tareas pendientes de las que caben, la agenda SHALL decirlo en vez de mostrar una lista que parezca completa.

#### Scenario: Agenda con tareas reales

- **WHEN** hay tareas pendientes vencidas, de hoy y futuras
- **THEN** la agenda las agrupa en «Vencidas», «Hoy», «Próximos 7 días» y «Más adelante» con su número, y ninguna aparece como dato de ejemplo

#### Scenario: Filtros combinables en la URL

- **WHEN** se filtra por tipo «Riego» y prioridad «Alta» y se recarga la página
- **THEN** los dos filtros siguen aplicados y se ven como criterios retirables

#### Scenario: Llegar desde el Dashboard

- **WHEN** se abre `/tasks?due=overdue`
- **THEN** la agenda muestra solo las vencidas, con el filtro a la vista y quitable

#### Scenario: Calendario

- **WHEN** se cambia a la vista de calendario en octubre de 2026
- **THEN** cada tarea pendiente aparece en los días de su periodo, las vencidas resaltadas, y un día con más tareas de las que caben muestra «+N»

#### Scenario: Crear desde un día

- **WHEN** se elige el día 15 en el calendario
- **THEN** se abre el formulario de tarea con ese día como fecha

#### Scenario: Completadas

- **WHEN** se abre «Completadas»
- **THEN** se listan las tareas completadas, omitidas y canceladas, cada una con su estado en texto y su fecha, y las completadas con el número de plantas afectadas

#### Scenario: Sin tareas

- **WHEN** no hay ninguna tarea pendiente
- **THEN** la agenda lo dice y ofrece crear una

#### Scenario: Más tareas de las que caben

- **WHEN** hay más tareas pendientes que el máximo de una página
- **THEN** la agenda avisa de cuántas hay y de que muestra las primeras

#### Scenario: Fallo del API

- **WHEN** el API de tareas falla
- **THEN** la pantalla muestra el error en línea con la opción de reintentar y no una agenda vacía

### Requirement: Crear y editar una tarea

La aplicación SHALL ofrecer un **formulario único** de tarea, en un diálogo, para crear y para editar una tarea **pendiente**, con la composición del diálogo del prototipo: encabezado «Planificar trabajo» y «Nueva tarea» o «Editar tarea»; **tipo**, **prioridad** (normal por defecto), **título**, **destino**, **fecha** de inicio y, opcionalmente, de fin, y **notas**; y al pie un texto de impacto que dice que **la tarea no registra un cuidado hasta que se complete**. El formulario SHALL **no ofrecer hora**: el periodo es de días. El título SHALL ser obligatorio y la fecha de fin no anterior a la de inicio, con el error junto al campo. El **destino** SHALL elegirse entre **una localización** y **plantas concretas** (buscándolas por código, apodo o especie, hasta 500), y SHALL mostrar el número de plantas que afectaría ahora. Un error del API SHALL explicarse sin perder lo escrito. Una tarea cerrada SHALL NOT poder editarse.

#### Scenario: Crear una tarea de riego

- **WHEN** se rellena tipo «Riego», título, una localización y una fecha, y se crea
- **THEN** la tarea aparece en la agenda en el grupo que le corresponde y se confirma con un aviso

#### Scenario: Una tarea de varias plantas

- **WHEN** se elige «Plantas concretas» y se añaden tres buscándolas por apodo
- **THEN** el destino muestra «3 plantas» y se pueden quitar una a una

#### Scenario: Título vacío

- **WHEN** se intenta crear sin título
- **THEN** el error aparece junto al campo y no se envía nada

#### Scenario: Fin anterior al inicio

- **WHEN** la fecha de fin es anterior a la de inicio
- **THEN** el formulario lo explica y no se envía

#### Scenario: Editar una pendiente

- **WHEN** se abre una tarea pendiente para editar
- **THEN** el formulario aparece relleno y «Guardar cambios» la actualiza

#### Scenario: Sin hora

- **WHEN** se abre el formulario
- **THEN** no hay campo de hora y el periodo se expresa en días

#### Scenario: Error del API

- **WHEN** el API rechaza la tarea
- **THEN** el mensaje se muestra en el diálogo y lo escrito se conserva

### Requirement: Completar una tarea mostrando su alcance

Completar una tarea SHALL abrir un diálogo que **muestre antes el alcance exacto**: las plantas que la tarea afectaría **ahora**, con su código, su apodo y su localización, paginadas, y cada una con la posibilidad de **excluirla**. SHALL decir «Se registrará en N de M plantas» y actualizarlo al excluir. SHALL pedir la **fecha de finalización** (hoy por defecto, no futura), y confirmar SHALL llamar al API con las exclusiones. Si el alcance queda vacío, confirmar SHALL estar deshabilitado y decir por qué. Al terminar SHALL mostrar cuántas plantas se afectaron realmente y SHALL sacar la tarea de la agenda. Un error SHALL mostrarse sin perder las exclusiones. La casilla de completar de la agenda y del calendario SHALL abrir este mismo diálogo; «Completar varias» SHALL seguir declarado como **T-24**, sin modificar nada.

#### Scenario: Completar una tarea de una planta

- **WHEN** se completa una tarea dirigida a una planta
- **THEN** el diálogo muestra esa planta, se confirma y la tarea desaparece de la agenda

#### Scenario: Excluir excepciones

- **WHEN** una tarea alcanza 6 plantas y se excluyen 2
- **THEN** el diálogo dice «Se registrará en 4 de 6 plantas» y solo se envían esas 2 exclusiones

#### Scenario: Un alcance grande

- **WHEN** el alcance son 300 plantas
- **THEN** el diálogo las pagina y conserva las exclusiones al cambiar de página

#### Scenario: Excluir a todas

- **WHEN** se excluyen todas las plantas
- **THEN** confirmar está deshabilitado y el diálogo explica que la tarea no afectaría a ninguna

#### Scenario: Fecha futura

- **WHEN** se elige una fecha de finalización posterior a hoy
- **THEN** el formulario lo rechaza antes de enviar

#### Scenario: Resultado

- **WHEN** se confirma
- **THEN** se avisa de a cuántas plantas se registró y la tarea pasa a «Completadas»

#### Scenario: Error del API

- **WHEN** el API responde un error
- **THEN** se explica en el diálogo y las exclusiones se conservan

#### Scenario: Completar varias sigue marcado

- **WHEN** se pulsa «Completar varias»
- **THEN** se indica que lo habilita T-24 y no cambia ninguna tarea

### Requirement: Completar puede registrar el hecho concreto

El diálogo de completar SHALL ofrecer, **opcional y según el tipo de tarea**, registrar el hecho concreto en cada planta incluida: para **riego**, la cantidad de agua en mililitros como una lectura; para **cambio de maceta**, un trasplante con el tamaño de la maceta; para **poda de raíces**, una poda con sus notas; y nada para protección frente al frío, protección frente al sol y «Otra». SHALL decir que **el mismo registro se aplica a todas las plantas incluidas** y que, si una necesita un dato distinto, se excluye y se registra aparte. Sin rellenar nada, SHALL completar escribiendo solo el evento de tarea. Un dato inválido SHALL explicarse junto al campo.

#### Scenario: Un riego con agua

- **WHEN** se completa una tarea de riego y se escribe 200 ml
- **THEN** se envía la lectura y cada planta incluida la tiene enlazada a la tarea

#### Scenario: Un cambio de maceta

- **WHEN** se completa una tarea de cambio de maceta con maceta de 12 cm
- **THEN** se envía el trasplante con ese tamaño

#### Scenario: Sin registro

- **WHEN** se completa una tarea de protección frente al frío
- **THEN** no se ofrece ningún registro y se completa solo con el evento

#### Scenario: El mismo registro para todas

- **WHEN** se rellena un registro en una tarea de varias plantas
- **THEN** el diálogo avisa de que se aplicará a todas las incluidas

### Requirement: Reprogramar, omitir y cancelar una tarea

Cada tarea pendiente SHALL ofrecer en su menú de acciones **editar**, **reprogramar**, **omitir** y **cancelar**. Reprogramar SHALL abrir un diálogo breve con el periodo y llamar al API de reprogramación. Omitir SHALL pedir un **motivo opcional**; cancelar SHALL pedir **confirmación** y un motivo opcional. Ambas SHALL decir que **la tarea se conserva como planificada y no cuenta como cuidado realizado**. La tarea SHALL salir de la agenda y aparecer en «Completadas» con su estado en texto. Un error SHALL explicarse sin perder lo escrito.

#### Scenario: Reprogramar

- **WHEN** se reprograma una tarea a otra semana
- **THEN** cambia de grupo en la agenda y de días en el calendario

#### Scenario: Omitir con motivo

- **WHEN** se omite una tarea con el motivo «lluvia»
- **THEN** sale de la agenda y aparece en «Completadas» como «Omitida» con ese motivo

#### Scenario: Cancelar con confirmación

- **WHEN** se elige cancelar
- **THEN** se pide confirmar y, al hacerlo, la tarea pasa a «Cancelada»

#### Scenario: No cuenta como cuidado

- **WHEN** se omite o se cancela una tarea
- **THEN** el diálogo había dicho que no se registra ningún cuidado y la ficha de las plantas no cambia

### Requirement: Próximo trabajo en la ficha del ejemplar

La ficha del ejemplar SHALL mostrar su **próximo trabajo real**: las tareas pendientes que le afectan —las dirigidas a ella, a su localización o a un ascendiente—, las más próximas primero, con tipo, título, periodo y si están vencidas, y un enlace a la pantalla de tareas filtrada por la planta. «Crear tarea» SHALL abrir el formulario con **esta planta como destino**. «De un vistazo» SHALL mostrar el próximo trabajo real. **No queda ninguna tarea de ejemplo ni marca T-22** en la ficha, y la marca de revisión pendiente de T-23 SHALL permanecer.

#### Scenario: Próximo trabajo real

- **WHEN** hay una tarea sobre la planta y otra sobre su invernadero
- **THEN** la ficha muestra las dos, la más próxima primero

#### Scenario: Una vencida

- **WHEN** una tarea afectada terminó antes de hoy
- **THEN** se distingue como vencida con texto, no solo con color

#### Scenario: Crear una tarea para esta planta

- **WHEN** se pulsa «Crear tarea»
- **THEN** el formulario se abre con esta planta como destino

#### Scenario: Sin trabajo pendiente

- **WHEN** no hay tareas que afecten a la planta
- **THEN** la ficha lo dice y ofrece crear una

### Requirement: Las tareas completadas aparecen en la cronología

La cronología de la ficha SHALL reconocer el tipo `tarea` con su marca y su etiqueta, mostrar el título y el tipo de la tarea completada y poder filtrarse por él. Un evento de tarea SHALL NOT ofrecer editar ni borrar. Completar una tarea desde la pantalla de tareas SHALL dejar ese evento en la cronología de cada planta incluida la próxima vez que se abra.

#### Scenario: El evento de tarea

- **WHEN** una planta tiene una tarea completada
- **THEN** su cronología muestra «Tarea completada» con el título y el tipo

#### Scenario: Filtrar por tarea

- **WHEN** se filtra la cronología por «Tarea»
- **THEN** solo se ven eventos de tarea

#### Scenario: No se edita

- **WHEN** se mira un evento de tarea
- **THEN** no ofrece editar ni borrar

### Requirement: La fecha de referencia es la del día real

La aplicación SHALL usar como fecha de referencia **el día local real del navegador** y no una fecha fija de ejemplo: la agenda, el calendario, el Dashboard y la ficha SHALL clasificar lo vencido con ella y SHALL enviarla al API de tareas como `today`. Los componentes SHALL seguir recibiéndola por propiedad, sin consultar el reloj.

#### Scenario: Hoy es hoy

- **WHEN** se abre la agenda
- **THEN** «Hoy» corresponde al día real del navegador

#### Scenario: Se envía al API

- **WHEN** se pide el listado de tareas
- **THEN** la petición lleva `today` con la fecha de referencia

#### Scenario: Los componentes no consultan el reloj

- **WHEN** se prueban la agenda y el calendario con una fecha dada
- **THEN** clasifican con esa fecha sin depender del reloj del sistema
