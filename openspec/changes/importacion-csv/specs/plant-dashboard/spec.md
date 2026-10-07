## MODIFIED Requirements

### Requirement: Importar y exportar

La aplicación SHALL mostrar importar y exportar con la composición de la pantalla `transfer` del prototipo: cabecera con la **frescura de la última copia**; dos paneles lado a lado, **importar datos** y **preparar exportación**; y debajo la **actividad reciente**.

La **importación** SHALL ser **real** para **plantas y especies** y SHALL ser un asistente de tres pasos —archivo, validación y aplicar— con el progreso visible. El primer paso SHALL permitir **elegir el tipo**, **soltar o elegir un CSV** (rechazando en el cliente lo que no sea CSV o exceda el tamaño, sin sustituir al servidor) y **descargar la plantilla** del tipo. El paso de validación SHALL mostrar **cuántas filas están listas, cuántas tienen avisos y cuántas errores**, las columnas ignoradas, la tabla de revisión **paginada** con el resultado de cada fila y todos sus motivos, y la opción de **descargar el `errores.csv`**. Mientras haya errores **la importación SHALL estar bloqueada y decir por qué**; **ningún dato se descarta en silencio**. Al aplicar, el paso final SHALL decir **cuántos registros se crearon** y que **ningún registro existente se modificó**, y SHALL enlazar al inventario o al catálogo. Un fallo del servidor al revisar o aplicar SHALL mostrarse con su mensaje y permitir reintentar sin perder el archivo. Los tipos que **no se importan** —localizaciones, mezclas de sustrato y etiquetas— SHALL verse **deshabilitados y marcados** como no disponibles.

**La actividad reciente** SHALL leer el **historial real de importaciones** —tipo, archivo, resultado, filas y cuándo— con su estado vacío, y declarar que **no atribuye a ninguna persona** porque aún no hay usuarios.

La **exportación** SHALL seguir siendo una **maqueta declarada**: ofrece el contenido, el formato y la codificación y una estimación, no descarga nada y la pantalla lo dice, con lo que depende de otros tickets marcado con el suyo. La exportación del resultado filtrado, que es real, sigue estando en los listados.

#### Scenario: Errores por fila a la vista

- **WHEN** se revisa un archivo con filas con error
- **THEN** se ve cuántas están listas, con avisos y con errores, y la tabla indica el resultado de cada fila con sus motivos

#### Scenario: Los errores bloquean la importación

- **WHEN** la revisión tiene filas con error
- **THEN** la acción de importar está deshabilitada y la pantalla explica que hay que corregir esas filas, sin descartarlas, con el `errores.csv` a mano

#### Scenario: Corregidos los errores se permite aplicar

- **WHEN** se carga el archivo corregido y ya no quedan filas con error
- **THEN** la acción de importar se habilita y al aplicarla se llega al paso final con el número de registros creados

#### Scenario: Cambiar de archivo

- **WHEN** el usuario cambia de archivo a mitad de la revisión
- **THEN** el asistente vuelve al primer paso sin conservar la revisión anterior

#### Scenario: Un archivo que no es CSV o es demasiado grande

- **WHEN** el usuario elige un archivo que no es CSV o que excede el tamaño admitido
- **THEN** la pantalla lo rechaza con el motivo antes de subirlo

#### Scenario: Error del servidor

- **WHEN** el servidor rechaza el archivo (por ejemplo, sin una columna obligatoria)
- **THEN** la pantalla muestra su mensaje y permite elegir otro archivo

#### Scenario: Tipos no disponibles

- **WHEN** el usuario abre el selector de tipo
- **THEN** localizaciones, mezclas y etiquetas aparecen deshabilitadas y marcadas

#### Scenario: Actividad real

- **WHEN** se ha aplicado una importación
- **THEN** la actividad reciente muestra una línea con su tipo, resultado, filas y cuándo, sin autor

#### Scenario: Sin actividad

- **WHEN** no se ha importado nada
- **THEN** la actividad reciente muestra su estado vacío

#### Scenario: Es una simulación y lo dice

- **WHEN** el usuario genera una exportación desde el panel de exportar
- **THEN** la pantalla declara que es una simulación, no descarga nada y el inventario no cambia; la importación, en cambio, no se declara simulada
