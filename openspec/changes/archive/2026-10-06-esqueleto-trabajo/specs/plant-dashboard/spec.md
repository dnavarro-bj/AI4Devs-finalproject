## ADDED Requirements

### Requirement: Dashboard de trabajo

La aplicación SHALL abrir en un Dashboard con la composición de la pantalla `dashboard` del prototipo: cabecera con **la fecha de hoy** y la acción de crear una tarea; a continuación una **fila de tres cifras navegables** —tareas vencidas, tareas para hoy y alertas abiertas—; y debajo dos columnas: la **agenda** («Siguiente trabajo») como columna principal y, en la lateral, las **alertas** más recientes y la **carga por zona**.

El Dashboard SHALL presentar **trabajo pendiente, no métricas decorativas**: lo vencido va primero y cada cifra SHALL abrir el listado que representa, no una pantalla genérica. La agenda SHALL agrupar por día con el de hoy destacado, y mostrar de cada tarea su tipo, su prioridad, su título, su destino y su hora o su flexibilidad. La carga por zona SHALL verse como **barra proporcional además de como cifra**, con el número de plantas de cada localización.

La carga por zona SHALL salir **de las localizaciones reales** del API —su nombre y su número de plantas—; lo que depende de entidades que no existen —tareas, alertas y las cifras que las cuentan— SHALL salir de datos de ejemplo y aparecer **marcado con su ticket en su sitio del layout**: tareas con T-22, alertas con T-23 y las cifras con T-24. Nada de ello SHALL presentarse como dato real.

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
- **THEN** la agenda, las alertas y las tres cifras aparecen marcadas con su ticket y como datos de ejemplo, y el número de tareas por zona queda marcado con T-22 en su sitio de la tarjeta

#### Scenario: Error de carga de las localizaciones

- **WHEN** el API de localizaciones falla
- **THEN** el panel de carga por zona lo explica con la opción de reintentar y el resto del Dashboard sigue visible

### Requirement: Tareas en tres vistas

La aplicación SHALL mostrar las tareas con la composición de la pantalla `tasks` del prototipo: cabecera con la acción de crear, **selector de vista** con agenda, calendario y completadas, y **la misma lista de tareas** detrás de las tres. Cambiar de vista SHALL hacerse **sin recargar** y sin perder los filtros.

La **agenda** SHALL agrupar en «Vencidas», «Hoy» y «Próximos 7 días» con el número de tareas de cada grupo, y llevar de cada tarea su casilla de completar, su tipo, su prioridad, su título, su destino, su fecha y la acción de editar. «Vencida» SHALL **calcularse** comparando la fecha de la tarea con la de referencia, no almacenarse. El **calendario** SHALL mostrar el mes con las tareas en su día, marcar el de hoy y **declarar cuántas quedan ocultas** cuando un día no las abarca. **Completadas** SHALL ofrecer su estado vacío explicativo.

Las acciones sobre una tarea —crear, completar, editar, completar varias— SHALL verse y **declararse como T-22**, sin modificar ninguna tarea. Los filtros por localización, tipo y prioridad SHALL aplicarse a los datos de ejemplo para que la barra no sea decorativa.

#### Scenario: Las tres vistas muestran lo mismo

- **WHEN** el usuario alterna entre agenda y calendario
- **THEN** una misma tarea aparece en ambas, y el número de la agenda coincide con las tareas pendientes del calendario

#### Scenario: Cambiar de vista no recarga

- **WHEN** el usuario pasa de la agenda al calendario y vuelve
- **THEN** no se repite ninguna petición de datos y el filtro aplicado se conserva

#### Scenario: Vencida se calcula

- **WHEN** una tarea pendiente tiene una fecha anterior a la de referencia
- **THEN** aparece en «Vencidas» con cuánto hace que venció, sin que nadie la haya marcado como tal

#### Scenario: Día con más tareas de las que caben

- **WHEN** un día del calendario tiene más tareas que las que muestra
- **THEN** la celda indica cuántas quedan ocultas

#### Scenario: Una acción de tarea no modifica nada

- **WHEN** el usuario intenta completar, crear o editar una tarea
- **THEN** se le indica que esa acción la habilita T-22 y ninguna tarea cambia

#### Scenario: Sin tareas

- **WHEN** no hay ninguna tarea pendiente
- **THEN** la agenda lo explica y ofrece crear la primera, en lugar de mostrar una lista vacía

### Requirement: Bandeja de alertas

La aplicación SHALL mostrar las alertas con la composición de la pantalla `alerts` del prototipo: cabecera con **el recuento de abiertas**, barra de filtros —estado, severidad, localización y origen— y una **tarjeta por alerta** con su marca, su tipo, su severidad, su título, la planta a la que afecta con su especie, su ubicación y cuándo se detectó, y sus acciones.

La severidad y el estado del ciclo de vida SHALL distinguirse **por texto o por forma, no solo por color**: «Crítica» se lee, y las alertas críticas tienen una marca propia. Los estados SHALL ser los del ciclo de vida —`Nueva`, `Revisada`, `Resuelta`, `Descartada`—, y el filtro por defecto SHALL mostrar las abiertas. La tarjeta ofrece **crear una tarea** y **revisar o descartar**; esas acciones SHALL declararse como T-23 sin cambiar el estado de ninguna alerta. Una alerta no es una tarea: crear una tarea desde ella no la resuelve.

Las alertas SHALL ser datos de ejemplo marcados con T-23, no una lista presentada como real.

#### Scenario: Severidad legible sin color

- **WHEN** se muestran una alerta crítica y una media
- **THEN** la crítica se distingue de la media por su rótulo y por su marca, aunque se vean sin colores

#### Scenario: Abiertas por defecto

- **WHEN** el usuario abre la bandeja
- **THEN** se muestran las alertas abiertas y el recuento de la cabecera coincide con las tarjetas

#### Scenario: Filtrar por estado

- **WHEN** el usuario filtra por un estado del ciclo de vida
- **THEN** solo se muestran las alertas en ese estado, y si no hay ninguna se explica

#### Scenario: Una acción de alerta no cambia su estado

- **WHEN** el usuario intenta revisar o descartar una alerta o crear una tarea desde ella
- **THEN** se le indica que lo habilita T-23 y la alerta conserva su estado

#### Scenario: Navegar a la planta afectada

- **WHEN** el usuario activa la planta de una alerta
- **THEN** llega a su ficha

### Requirement: Importar y exportar

La aplicación SHALL mostrar importar y exportar con la composición de la pantalla `transfer` del prototipo: cabecera con la **frescura de la última copia**; dos paneles lado a lado, **importar datos** y **preparar exportación**; y debajo la **actividad reciente**.

La **importación** SHALL ser un asistente de tres pasos —archivo, validación y aplicar— con el progreso visible. El paso de validación SHALL mostrar **cuántas filas están listas, cuántas tienen avisos y cuántas errores**, la tabla de revisión con **el resultado por fila**, y la opción de descargar solo los errores. Mientras haya errores **la importación SHALL estar bloqueada y decir por qué**; **ningún dato se descarta en silencio**. La **exportación** SHALL ofrecer el contenido —inventario completo, plantas filtradas, etiquetas físicas—, el formato y la codificación, y una estimación del archivo.

Importar y exportar SHALL ser una **simulación declarada**: recorre sus pasos con un archivo de ejemplo, no sube ni descarga nada y no modifica el inventario, y la pantalla lo dice. Lo que depende de otros tickets —exportar el resultado filtrado (T-21) y los códigos y el QR de las etiquetas (T-15)— SHALL aparecer marcado con ese ticket. Importar y la actividad reciente no tienen ticket que los recoja, y SHALL marcarse como tal.

#### Scenario: Errores por fila a la vista

- **WHEN** el archivo de ejemplo se valida y tiene filas con error
- **THEN** se ve cuántas están listas, con avisos y con errores, y la tabla indica el resultado de cada fila con su motivo

#### Scenario: Los errores bloquean la importación

- **WHEN** la validación tiene filas con error
- **THEN** la acción de importar está deshabilitada y la pantalla explica que hay que corregir esas filas, sin descartarlas

#### Scenario: Corregidos los errores se permite aplicar

- **WHEN** ya no quedan filas con error
- **THEN** la acción de importar se habilita y al aplicarla se llega al paso final

#### Scenario: Es una simulación y lo dice

- **WHEN** el usuario recorre la importación o genera una exportación
- **THEN** la pantalla declara que es una simulación y el inventario no cambia

#### Scenario: Cambiar de archivo

- **WHEN** el usuario cambia de archivo a mitad de la revisión
- **THEN** el asistente vuelve al primer paso sin conservar la validación anterior

### Requirement: Configuración por ámbitos

La aplicación SHALL mostrar la configuración con la composición de la pantalla `settings` del prototipo: cabecera con el **estado de guardado** y la acción de guardar; **navegación lateral de ámbitos** —colección, códigos, alertas y avisos, inteligencia artificial, usuarios y acceso—; y a su lado **el panel del ámbito activo**. Solo un ámbito SHALL verse a la vez, y cambiar de ámbito no SHALL perder lo editado en otro.

El estado de guardado SHALL distinguir **«todos los cambios guardados»** de **«hay cambios sin guardar»**. En el ámbito de códigos, la **vista previa** del código SHALL reflejar en el acto el prefijo, los dígitos y el separador elegidos. El ámbito de inteligencia artificial SHALL declarar qué datos se envían al proveedor y NO SHALL mostrar ni pedir la clave de acceso. El de usuarios SHALL mostrar al administrador único y la invitación de usuarios **deshabilitada y marcada** como futura.

La configuración SHALL ser **maqueta**: guardar no persiste nada y no modifica la configuración real del sistema, y la pantalla lo declara. No existe ticket que la recoja, y SHALL marcarse como tal.

#### Scenario: Un ámbito a la vez

- **WHEN** el usuario elige un ámbito en la navegación lateral
- **THEN** se muestra el panel de ese ámbito y los demás quedan ocultos, con el ámbito elegido marcado como el actual

#### Scenario: Los cambios de otro ámbito se conservan

- **WHEN** el usuario edita un valor, cambia de ámbito y vuelve
- **THEN** el valor editado sigue ahí

#### Scenario: Cambios sin guardar

- **WHEN** el usuario modifica cualquier valor
- **THEN** el estado de guardado pasa a indicar que hay cambios sin guardar

#### Scenario: Vista previa del código

- **WHEN** el usuario cambia el prefijo, los dígitos o el separador de los códigos
- **THEN** la vista previa muestra al instante el código resultante, por ejemplo `CAT-GRUSS-01`

#### Scenario: Guardar no persiste y lo dice

- **WHEN** el usuario guarda
- **THEN** se le indica que la configuración todavía no se conserva y la configuración real del sistema no cambia

#### Scenario: La clave de la IA no se expone

- **WHEN** el usuario abre el ámbito de inteligencia artificial
- **THEN** se declara qué datos se envían al proveedor y no aparece ninguna clave de acceso
