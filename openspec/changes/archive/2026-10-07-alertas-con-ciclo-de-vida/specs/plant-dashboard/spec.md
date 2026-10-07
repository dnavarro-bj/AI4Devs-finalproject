## MODIFIED Requirements

### Requirement: Bandeja de alertas

La aplicación SHALL mostrar las alertas con la composición de la pantalla `alerts` del prototipo: cabecera con **el recuento de abiertas**, barra de filtros —estado, severidad, localización y origen— y una **tarjeta por alerta** con su marca, su categoría, su severidad, su título, la planta a la que afecta con su especie (o la localización, si es una alerta de zona), su ubicación y cuándo se detectó, y sus acciones.

Las alertas SHALL ser **las del API**, paginadas, sin datos de ejemplo ni aviso de maqueta. El filtro por defecto SHALL mostrar las **abiertas** y los filtros viajan al servidor: un filtro **no se aplica solo a lo ya cargado**. Los cuatro filtros SHALL estar habilitados —el de **origen** ofrece los cinco orígenes—. La severidad y el estado SHALL distinguirse **por texto o por forma, no solo por color**: «Crítica» se lee, y las alertas críticas tienen una marca propia. Una alerta que ha **acumulado ocurrencias** SHALL decirlo («Detectada 4 veces · última hace 2 h») y la fecha SHALL ser la de la **última detección**, con la primera disponible en el detalle.

Las acciones SHALL ser reales y SHALL depender del estado: una alerta **`nueva`** ofrece **Revisar**, **Resolver** y **Descartar**; una **`revisada`**, **Resolver** y **Descartar**; una cerrada no ofrece ninguna y muestra **cómo se cerró** —su estado, su fecha y su comentario—. **Resolver** y **Descartar** abren un diálogo con un **comentario opcional** antes de confirmar. Todas las abiertas ofrecen **Crear tarea**, que abre el formulario de tareas con el tipo, el título, el destino y la prioridad **precompletados desde la alerta**, y la tarea creada queda enlazada. Una alerta no es una tarea: crear una tarea desde ella no la resuelve ni la revisa, y descartar no se presenta como resolver. Un fallo del API SHALL explicarse sin perder lo escrito en el diálogo.

#### Scenario: Severidad legible sin color

- **WHEN** se muestran una alerta crítica y una media
- **THEN** la crítica se distingue de la media por su rótulo y por su marca, aunque se vean sin colores

#### Scenario: Abiertas por defecto

- **WHEN** el usuario abre la bandeja
- **THEN** se muestran las alertas abiertas, el recuento de la cabecera es el `totalElements` del API y las tarjetas son las de la primera página

#### Scenario: Filtrar viaja al servidor

- **WHEN** el usuario filtra por severidad crítica y por el origen de medición
- **THEN** se pide al API con esos filtros, la lista y el recuento son los del filtro y, si no hay ninguna, se explica

#### Scenario: Filtrar por estado

- **WHEN** el usuario filtra por un estado del ciclo de vida
- **THEN** la petición lleva ese estado, solo se muestran las alertas en ese estado y, si no hay ninguna, se explica

#### Scenario: Una acción de alerta no cambia su estado

- **WHEN** el usuario crea una tarea desde una alerta
- **THEN** la alerta conserva su estado: crear trabajo no la revisa ni la resuelve

#### Scenario: Revisar

- **WHEN** el usuario revisa una alerta `nueva`
- **THEN** pasa a `revisada`, la tarjeta ofrece ya solo Resolver y Descartar y el recuento de abiertas no cambia

#### Scenario: Resolver con un comentario

- **WHEN** el usuario pulsa Resolver, escribe un comentario y confirma
- **THEN** la alerta se cierra como resuelta, deja de estar en las abiertas y el recuento baja

#### Scenario: Descartar no se presenta como resolver

- **WHEN** el usuario descarta una alerta
- **THEN** queda como «Descartada», con su fecha y su comentario, y se distingue de «Resuelta» por el texto

#### Scenario: Una alerta cerrada dice cómo se cerró

- **WHEN** se filtran las alertas resueltas
- **THEN** cada tarjeta muestra cuándo y con qué comentario se resolvió, y no ofrece acciones

#### Scenario: Crear una tarea desde una alerta

- **WHEN** el usuario pulsa «Crear tarea» en una alerta de temperatura de un ejemplar
- **THEN** el formulario se abre con el ejemplar como destino y el título y la prioridad tomados de la alerta; al guardar, la tarea queda enlazada y la alerta conserva su estado

#### Scenario: Ocurrencias visibles

- **WHEN** una alerta ha acumulado 4 ocurrencias
- **THEN** la tarjeta lo dice y muestra la última detección

#### Scenario: Error al cambiar el estado

- **WHEN** el API responde `409` al resolver una alerta que ya estaba cerrada
- **THEN** el diálogo lo explica, la lista se recarga y no se pierde el comentario escrito

#### Scenario: Navegar a la planta afectada

- **WHEN** el usuario activa la planta de una alerta
- **THEN** llega a su ficha

#### Scenario: Una alerta de localización

- **WHEN** la alerta afecta a una localización
- **THEN** la tarjeta muestra su nombre y su ruta, y llega a su ficha en lugar de a la de una planta

#### Scenario: Error de carga

- **WHEN** el API de alertas falla
- **THEN** la bandeja lo explica con la opción de reintentar

### Requirement: Dashboard de trabajo

La aplicación SHALL abrir en un Dashboard con la composición de la pantalla `dashboard` del prototipo: cabecera con **la fecha de hoy** y la acción de crear una tarea; a continuación una **fila de tres cifras navegables** —tareas vencidas, tareas para hoy y alertas abiertas—; y debajo dos columnas: la **agenda** («Siguiente trabajo») como columna principal y, en la lateral, las **alertas** más graves y la **carga por zona**.

El Dashboard SHALL presentar **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra SHALL abrir el listado que representa, no una pantalla genérica. La agenda SHALL agrupar por día con el de hoy destacado, y mostrar de cada tarea su tipo, su prioridad, su título, su destino y su hora o su flexibilidad. La carga por zona SHALL verse como **barra proporcional además de como cifra**, con el número de plantas de cada localización.

La carga por zona SHALL salir **de las localizaciones reales** del API —su nombre y su número de plantas—. Las **tareas** SHALL ser reales: la agenda SHALL mostrar las tareas pendientes más próximas y las cifras de **vencidas** y **para hoy** SHALL contar las del API con la fecha de referencia. Las **alertas** SHALL ser **reales**: la cifra SHALL ser el total de alertas abiertas del API —con un matiz para las críticas— y el bloque lateral SHALL listar las **abiertas más graves**, de la más grave a la más leve y, a igualdad, la más recientemente detectada, cada una con su categoría, su severidad, su título y su destino. Lo que depende de datos que no existen —el **número de tareas por zona**— SHALL aparecer marcado con T-24, que es quien lo agrega. Nada marcado SHALL presentarse como dato real, y **no queda ninguna maqueta de alertas**.

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

#### Scenario: Las alertas son reales

- **WHEN** el API tiene alertas abiertas de varias severidades
- **THEN** la cifra cuenta todas las abiertas, el bloque lateral lista las más graves primero y ninguna aparece marcada como ejemplo

#### Scenario: Sin alertas

- **WHEN** no hay ninguna alerta abierta
- **THEN** la cifra es 0 y el bloque lo dice, sin simular alertas

#### Scenario: Lo que falta, declarado

- **WHEN** se abre el Dashboard
- **THEN** el número de tareas por zona queda marcado con T-24 en su sitio de la tarjeta, y no hay ninguna marca de T-23

#### Scenario: Las tareas son reales

- **WHEN** hay tareas pendientes vencidas, de hoy y futuras
- **THEN** la agenda las muestra, las cifras de vencidas y de hoy las cuentan, y ninguna aparece marcada como ejemplo

#### Scenario: Error de carga de las alertas

- **WHEN** el API de alertas falla
- **THEN** el bloque de alertas y su cifra lo explican con la opción de reintentar, y el resto del Dashboard sigue visible

#### Scenario: Error de carga de las localizaciones

- **WHEN** el API de localizaciones falla
- **THEN** el panel de carga por zona lo explica con la opción de reintentar y el resto del Dashboard sigue visible

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su código, su ruta y sus acciones; **fila de métricas** del espacio; columna principal con **lo que contiene** —las sublocalizaciones— y los ejemplares que alberga; y columna lateral con las características del espacio, **las alertas**, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta completa**, y los **breadcrumbs reflejan esa ruta real** —Inicio / Localizaciones / cada ancestro / la localización— con cada ancestro navegable. Las métricas SHALL presentarse como **cifras destacadas** con su matiz: los ejemplares totales con cuántos hay directamente aquí, y cuántas sublocalizaciones. «Dentro de …» SHALL listar las sublocalizaciones con su carga y ofrecer **añadir dentro**, que abre el alta con esta localización como padre. Los ejemplares SHALL ir paginados con su ubicación exacta, y SHALL ofrecer ver el inventario filtrado por esta localización incluidos sus descendientes. Las características SHALL mostrar tipo, entorno, exposición, capacidad y **ocupación** (solo si hay capacidad) y las notas operativas. Los últimos movimientos SHALL mostrar los más recientes con su sentido —recibidos o cedidos, con el origen o el destino— y ofrecer el historial completo.

Las **tareas y el próximo trabajo** SHALL ser **reales**: la métrica de tareas SHALL contar las tareas pendientes dirigidas a esta localización, a sus sublocalizaciones o a plantas que están en ellas; «Próximo trabajo» SHALL listar las más próximas, cada una con su tipo, su título y su periodo, y enlazar a la pantalla de tareas ya filtrada por esta localización; y «Crear tarea aquí» SHALL abrir el formulario con esta localización como destino. Las **alertas** SHALL ser **reales**: la métrica SHALL contar las alertas abiertas totales de la localización con su mayor severidad, el bloque lateral SHALL listar las más graves y enlazar a la bandeja ya filtrada por esta localización con sus descendientes. Lo que el prototipo muestra y el API todavía no sirve SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

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
- **THEN** lo que el API aún no sirve aparece marcado con su ticket en su sitio del layout, y las alertas y las tareas ya no están entre ello: son datos reales

#### Scenario: Las alertas son reales

- **WHEN** la localización, una sublocalización o un ejemplar de dentro tienen alertas abiertas
- **THEN** la métrica las cuenta con su mayor severidad, el bloque lateral las lista de la más grave a la más leve y enlaza a `/alerts` filtrada por esta localización con sus descendientes

#### Scenario: Sin alertas

- **WHEN** no hay alertas abiertas en la localización
- **THEN** el bloque lo dice y no muestra ninguna marca de maqueta

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

## ADDED Requirements

### Requirement: La atención de cada ejemplar en el inventario y en el mapa

El inventario SHALL mostrar en cada fila el **nivel de atención** real del ejemplar —su mayor severidad abierta— con **texto o forma además de color** y vacío si no tiene alertas, y el mapa de localizaciones y el catálogo SHALL mostrar el **recuento de alertas abiertas** de cada localización con su mayor severidad. La opción **«Nivel de atención»** de la ordenación y del filtro SHALL permanecer marcada con su ticket de seguimiento, **no habilitada**: este change sirve y muestra el dato, no lo ordena. Ya no quedan marcas de T-23 en estas pantallas.

#### Scenario: Atención en la fila

- **WHEN** un ejemplar tiene una alerta crítica abierta
- **THEN** su fila muestra «Crítica» con su marca

#### Scenario: Sin atención

- **WHEN** un ejemplar no tiene alertas abiertas
- **THEN** la celda está vacía y no dice «ejemplo»

#### Scenario: Recuento por localización

- **WHEN** una localización tiene 3 alertas abiertas en total
- **THEN** su fila del catálogo y su nodo del mapa muestran 3 con la severidad más alta

#### Scenario: Ordenar por atención sigue sin ofrecerse

- **WHEN** se abre el selector de orden del inventario
- **THEN** «Nivel de atención» aparece deshabilitado y marcado con el ticket que lo habilitará

### Requirement: La ficha del ejemplar muestra sus alertas

La ficha del ejemplar SHALL sustituir el aviso de revisión de ejemplo por **sus alertas abiertas reales**: la más grave se muestra destacada en el bloque que el prototipo reserva al aviso, con su motivo y su acción recomendada, y enlaza a la bandeja filtrada por este ejemplar; si hay más, se cuentan. Sin alertas, el bloque SHALL decirlo en lugar de omitirse. La cronología SHALL pintar las entradas de tipo `alerta` con su categoría, su severidad, la transición y su comentario; y el filtro de tipo SHALL ofrecer «Alertas». La ficha SHALL ofrecer **anotar una alerta** sobre el ejemplar.

#### Scenario: Aviso real

- **WHEN** el ejemplar tiene una alerta crítica abierta
- **THEN** el bloque de aviso la muestra con su motivo y su acción recomendada, sin marca de ejemplo

#### Scenario: Varias alertas

- **WHEN** el ejemplar tiene tres alertas abiertas
- **THEN** se destaca la más grave y se dice que hay dos más, con enlace a la bandeja filtrada por el ejemplar

#### Scenario: Sin alertas

- **WHEN** el ejemplar no tiene alertas abiertas
- **THEN** el bloque dice que no hay ninguna

#### Scenario: Alertas en la cronología

- **WHEN** el ejemplar tuvo una alerta que se abrió y se resolvió
- **THEN** la cronología muestra las dos transiciones, y el filtro «Alertas» deja solo esas entradas

#### Scenario: Anotar una alerta

- **WHEN** el usuario anota una alerta desde la ficha con categoría, severidad y motivo
- **THEN** aparece en el bloque de avisos y en la cronología sin recargar la página

### Requirement: Completar una tarea de alerta propone resolverla

Al completar una tarea cuya respuesta traiga una **resolución sugerida**, la aplicación SHALL **proponer resolver esa alerta** en el mismo flujo, con su comentario opcional, y SHALL dejar claro que **no está resuelta todavía**. Aceptar SHALL resolver la alerta; **declinar SHALL dejarla abierta y visible**. La aplicación NO SHALL resolverla ni ocultarla sin esa confirmación.

#### Scenario: Aceptar la propuesta

- **WHEN** el usuario completa una tarea de una alerta y acepta resolverla
- **THEN** la alerta pasa a `resuelta` con el comentario que escribió

#### Scenario: Declinar la propuesta

- **WHEN** el usuario completa la tarea y declina
- **THEN** la alerta sigue abierta y visible en la bandeja

#### Scenario: Una tarea sin alerta

- **WHEN** se completa una tarea manual
- **THEN** no se propone nada
