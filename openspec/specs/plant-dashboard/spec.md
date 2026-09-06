# plant-dashboard Specification

## Purpose

La interfaz web con la que el propietario del vivero opera su colección: consultar el inventario, dar de alta una planta eligiendo especie y localización, ver los cuidados recomendados de su especie, registrar una lectura de cultivo y pedir el análisis de IA de esa lectura, sin salir del navegador ni recargar la página a mano.

## Requirements

### Requirement: Listado del inventario

La aplicación SHALL mostrar el inventario de plantas registradas, con el nickname, la especie y la localización de cada una, obtenidos del API. El listado SHALL recorrerse por páginas, respetando el envelope de paginación del API, y SHALL ofrecer navegación al detalle de cada planta. Cuando el inventario esté vacío, la pantalla SHALL explicar que no hay ninguna planta registrada y ofrecer una única acción: dar de alta la primera.

El listado SHALL poder **ordenarse** por las columnas que lo admitan y SHALL mostrar los **criterios de filtrado aplicados**, permitiendo retirarlos. La ordenación SHALL pedirse al API y no reordenar solo la página que se está viendo.

El listado SHALL admitir **selección de filas** con sus acciones masivas, y SHALL permitir **elegir qué columnas se ven**, salvo la identificativa.

Las columnas y los filtros que el API todavía no sirve SHALL **estar presentes y marcados como maqueta**, no ausentes: la pantalla enseña la forma completa del inventario y deja claro qué parte es dato. Un filtro que no puede filtrar SHALL mostrarse deshabilitado, nunca como si funcionara.

#### Scenario: Inventario con plantas

- **WHEN** el usuario abre el listado del inventario y el API devuelve plantas registradas
- **THEN** se muestra una fila por planta con su nickname, su especie y su localización

#### Scenario: Inventario vacío

- **WHEN** el usuario abre el listado del inventario y no hay ninguna planta registrada
- **THEN** se muestra un mensaje que indica que el inventario está vacío junto a la acción de añadir la primera planta, y no una tabla en blanco ni un error

#### Scenario: Salida desde el inventario vacío

- **WHEN** el usuario activa la acción ofrecida en el inventario vacío
- **THEN** la aplicación lleva al formulario de alta de planta

#### Scenario: Inventario con más plantas de las que caben en una página

- **WHEN** el API informa de que hay más de una página de resultados
- **THEN** la interfaz ofrece avanzar y retroceder de página, y al hacerlo muestra el contenido de la página solicitada

#### Scenario: Navegación al detalle

- **WHEN** el usuario selecciona una planta del listado
- **THEN** la aplicación navega a la ficha de esa planta sin recargar la página

#### Scenario: Ordenar el inventario

- **WHEN** el usuario ordena por una columna
- **THEN** el listado se vuelve a pedir al API con ese criterio, y no se reordena solo la página visible

#### Scenario: Criterios de filtrado aplicados

- **WHEN** hay filtros aplicados sobre el inventario
- **THEN** se muestran y se pueden retirar uno a uno

#### Scenario: Filtro por localización

- **WHEN** el usuario filtra por una localización
- **THEN** el listado se vuelve a pedir al API con ese criterio, y el criterio aplicado queda a la vista

#### Scenario: Filtro que el API no admite

- **WHEN** la pantalla ofrece un filtro que el API todavía no puede resolver
- **THEN** se muestra deshabilitado y explicando cuándo llegará, en lugar de aparentar que filtra

#### Scenario: Selección de filas del inventario

- **WHEN** el usuario selecciona una o varias plantas
- **THEN** aparecen las acciones masivas indicando a cuántos elementos afectan

#### Scenario: Columna de maqueta

- **WHEN** el listado muestra una columna cuyo dato el API no sirve todavía
- **THEN** la columna existe y queda marcada como maqueta, de modo que no se confunda con un dato real

### Requirement: Alta de una planta

La aplicación SHALL ofrecer un formulario de alta de planta con un campo de nickname, un selector de localización y un selector de especie, ambos poblados desde los catálogos del API. Los tres datos son obligatorios. Al confirmarse el alta, la planta creada SHALL quedar accesible sin que el usuario tenga que recargar la página.

#### Scenario: Alta completada

- **WHEN** el usuario introduce un nickname, elige una localización y una especie del catálogo y confirma el alta
- **THEN** la planta se crea a través del API y la aplicación lleva al usuario a la ficha de la planta creada, sin recarga manual

#### Scenario: Alta sin nickname

- **WHEN** el usuario intenta confirmar el alta con el nickname vacío o solo espacios
- **THEN** la interfaz señala que el nickname es obligatorio y no envía la petición

#### Scenario: Alta sin especie o sin localización

- **WHEN** el usuario intenta confirmar el alta sin haber seleccionado especie o sin haber seleccionado localización
- **THEN** la interfaz señala el campo que falta y no envía la petición

#### Scenario: El alta es rechazada por el API

- **WHEN** el API rechaza el alta con un error de cliente
- **THEN** la interfaz muestra el mensaje de error devuelto por el API, conserva lo que el usuario había escrito y le permite reintentar

### Requirement: Rangos recomendados de la especie

La aplicación SHALL mostrar los cuidados recomendados que la planta hereda de su especie —rangos de humedad, de temperatura y de horas de luz, y pauta de riego—, tomados del catálogo de especies y nunca de la IA. Estos rangos SHALL estar visibles en el selector de especie durante el alta y en la ficha de la planta **antes** de que el usuario guarde una lectura.

#### Scenario: Rangos al elegir especie en el alta

- **WHEN** el usuario selecciona una especie en el formulario de alta
- **THEN** se muestran los rangos de humedad, temperatura y horas de luz y la pauta de riego de esa especie, antes de crear la planta

#### Scenario: Rangos en la ficha antes de registrar la lectura

- **WHEN** el usuario abre la ficha de una planta existente
- **THEN** los rangos y la pauta de riego de su especie están visibles junto al formulario de nueva lectura, sin necesidad de guardarla ni de ninguna acción adicional

#### Scenario: Cambio de especie seleccionada

- **WHEN** el usuario cambia la especie seleccionada en el formulario de alta
- **THEN** los rangos mostrados pasan a ser los de la especie recién seleccionada

### Requirement: Ficha de una planta

La aplicación SHALL mostrar la ficha de una planta como el **centro operativo del ejemplar**, con:

* una **cabecera** que lo identifique de un vistazo —nombre, especie, localización y las acciones frecuentes—;
* **navegación local** entre las secciones de la ficha, donde las todavía no construidas SHALL explicar que lo están y no simular contenido;
* un **resumen del estado actual** con las magnitudes que responden «cómo está esta planta ahora»;
* la **cronología** de lo que le ha ocurrido;
* y un **perfil de cuidados efectivo**, indicando qué hereda de su especie.

La ficha SHALL ser el punto desde el que se registra una lectura y se consulta o se pide su recomendación.

Los datos que el API todavía no sirve SHALL presentarse como **datos de ejemplo reconocibles**, nunca como si fueran reales.

#### Scenario: Ficha de una planta existente

- **WHEN** el usuario abre la ficha de una planta existente
- **THEN** se muestran su nombre, su especie, su localización, sus tags y los datos de cuidado de su especie

#### Scenario: Ficha de una planta sin tags

- **WHEN** el usuario abre la ficha de una planta que no tiene ningún tag asignado
- **THEN** la ficha se muestra correctamente y la zona de tags no presenta ningún error

#### Scenario: Ficha de una planta inexistente

- **WHEN** el usuario abre la ficha de un identificador de planta que el API no reconoce
- **THEN** se muestra un mensaje de que la planta no existe, con salida hacia el inventario, y no una pantalla en blanco ni un error sin explicar

#### Scenario: Secciones de la ficha

- **WHEN** el usuario recorre las secciones de la ficha
- **THEN** puede cambiar entre ellas sin salir de la planta, y las que todavía no están construidas lo explican en lugar de aparecer vacías

#### Scenario: Resumen del estado actual

- **WHEN** la planta tiene lecturas registradas
- **THEN** el resumen muestra la última medición y el último riego a partir de ellas

#### Scenario: Perfil de cuidados heredado

- **WHEN** la planta no sobrescribe ningún valor de cuidado
- **THEN** el perfil efectivo muestra los valores de su especie e indica que los hereda

#### Scenario: Lo que todavía no existe se reconoce como ejemplo

- **WHEN** la ficha presenta datos que el API no sirve todavía
- **THEN** quedan identificados como datos de ejemplo, y no se confunden con los reales

### Requirement: Registro de una lectura de cultivo

La aplicación SHALL ofrecer, desde la ficha de la planta, un formulario para registrar manualmente una lectura con humedad, temperatura, horas de luz, cantidad de riego y acidez del sustrato. El formulario SHALL presentarse en un **diálogo** que se abre desde la acción correspondiente, de modo que no ocupe la ficha de forma permanente. Los valores SHALL poder informarse por separado y la lectura SHALL quedar asociada a esa planta.

El formulario SHALL ofrecer **la fecha y hora de la lectura**, propuesta como el momento actual y corregible: una lectura se anota a menudo después de haberla tomado. NO SHALL admitirse una fecha futura. Si el usuario no la toca, la lectura queda con el momento propuesto.

Junto a cada medida SHALL mostrarse **el rango efectivo de esa planta**, para reducir errores de interpretación al introducir el valor (§13.4).

#### Scenario: Lectura registrada

- **WHEN** el usuario rellena uno o varios de los cinco valores y confirma
- **THEN** la lectura se registra en el API asociada a esa planta, y la ficha refleja la lectura registrada sin recarga manual

#### Scenario: Lectura sin ningún valor

- **WHEN** el usuario confirma el formulario sin haber informado ninguno de los cinco valores
- **THEN** la interfaz indica que hace falta al menos un valor y la lectura no se registra

#### Scenario: Valor fuera del rango admitido

- **WHEN** el usuario introduce un valor que el API rechaza por estar fuera de rango
- **THEN** la interfaz muestra el mensaje de error devuelto por el API y permite corregir el valor sin perder el resto de lo introducido

#### Scenario: El formulario no ocupa la ficha

- **WHEN** el usuario abre la ficha de una planta
- **THEN** el formulario de lectura no está desplegado, y aparece al activar la acción de registrarla

#### Scenario: Salir del formulario sin registrar

- **WHEN** el usuario cierra el diálogo sin confirmar
- **THEN** no se registra ninguna lectura y la ficha queda como estaba

#### Scenario: Fecha propuesta

- **WHEN** el usuario abre el formulario de lectura
- **THEN** la fecha y hora vienen propuestas como el momento actual, y puede corregirlas

#### Scenario: Fecha futura

- **WHEN** el usuario intenta fijar una fecha posterior al momento actual
- **THEN** la interfaz no lo admite y la lectura no se registra con esa fecha

#### Scenario: Rango efectivo junto a cada medida

- **WHEN** el usuario introduce un valor
- **THEN** ve junto al campo el rango recomendado para esa planta, sin tener que salir del formulario

### Requirement: Generación y consulta del análisis de IA

La aplicación SHALL permitir pedir el análisis de IA de una lectura registrada y SHALL mostrar su nivel de riesgo, su explicación, la acción recomendada y la prioridad de actuación. Si la lectura ya tiene un análisis, la aplicación SHALL mostrarlo sin volver a pedir su generación.

#### Scenario: Análisis generado

- **WHEN** el usuario pide el análisis de una lectura que aún no lo tiene y el API responde correctamente
- **THEN** se muestran el nivel de riesgo, la explicación, la acción recomendada y la prioridad de esa recomendación

#### Scenario: Lectura que ya tiene análisis

- **WHEN** el usuario consulta una lectura que ya tiene un análisis generado
- **THEN** se muestra el análisis existente sin solicitar una nueva generación

#### Scenario: Flujo completo sin recarga manual

- **WHEN** el usuario da de alta una planta, registra una lectura y pide su análisis, en una sola sesión
- **THEN** completa las tres acciones y ve el resultado de cada una sin recargar la página a mano en ningún momento

### Requirement: Estados de carga y de error de las llamadas al API

Toda operación de la aplicación que dependa del API SHALL indicar visiblemente que está en curso mientras lo esté, y SHALL comunicar el fallo cuando lo haya, usando el mensaje del cuerpo de error uniforme del API cuando venga. La interfaz NUNCA SHALL quedarse sin respuesta visible tras una acción del usuario, y la generación del análisis de IA —la operación lenta y la que puede fallar por causa del proveedor externo— SHALL ofrecer siempre la posibilidad de reintentar.

#### Scenario: Análisis en curso

- **WHEN** el usuario pide el análisis de una lectura y el API aún no ha respondido
- **THEN** la interfaz indica que el análisis se está generando y evita que se lance una segunda vez la misma petición

#### Scenario: El proveedor de IA falla

- **WHEN** la petición de análisis falla porque el proveedor externo no está disponible
- **THEN** se muestra un mensaje que explica que el análisis no ha podido generarse, se ofrece reintentar, y el resto de la ficha sigue siendo utilizable

#### Scenario: Error del API con cuerpo uniforme

- **WHEN** una llamada al API falla y su respuesta trae el cuerpo de error uniforme
- **THEN** la interfaz muestra el mensaje que ese cuerpo indica, en lugar de un texto genérico

#### Scenario: Error sin cuerpo interpretable

- **WHEN** una llamada al API falla y la respuesta no trae un cuerpo de error interpretable
- **THEN** la interfaz muestra un mensaje de error genérico y comprensible, y no un fallo sin explicar ni una pantalla rota

### Requirement: Tratamiento de los identificadores del API

La aplicación SHALL tratar todo identificador que reciba del API o le envíe como una cadena de texto, sin convertirlo nunca a un tipo numérico. Los identificadores exceden el rango de enteros representables con exactitud en el navegador y una conversión numérica los alteraría en silencio.

#### Scenario: Identificador conservado íntegro

- **WHEN** la aplicación recibe una planta cuyo identificador es un valor por encima del rango de enteros exactos del navegador y a continuación lo usa para pedir su ficha
- **THEN** el identificador enviado al API es exactamente el mismo que se recibió, dígito a dígito

### Requirement: Orientación permanente en toda pantalla

Toda pantalla de la aplicación SHALL ofrecer orientación permanente: una navegación principal siempre disponible que marca la sección en la que se está, y unos breadcrumbs que muestran la ruta hasta la pantalla actual. La ficha de una planta SHALL identificarse en sus breadcrumbs por el nombre de la planta. Esta orientación SHALL estar disponible también en pantallas pequeñas, donde la navegación principal puede presentarse plegada.

#### Scenario: Breadcrumbs del inventario

- **WHEN** el usuario abre el listado del inventario
- **THEN** los breadcrumbs muestran la ruta hasta el inventario y lo marcan como la pantalla actual

#### Scenario: Breadcrumbs de la ficha

- **WHEN** el usuario abre la ficha de una planta
- **THEN** los breadcrumbs muestran el inventario como nivel navegable y el nombre de la planta como pantalla actual

#### Scenario: Sección activa en la navegación

- **WHEN** el usuario está en cualquier pantalla del inventario
- **THEN** la entrada de inventario de la navegación principal se marca como la sección activa

#### Scenario: Navegación desde la orientación

- **WHEN** el usuario selecciona el nivel del inventario en los breadcrumbs de una ficha
- **THEN** la aplicación navega al listado del inventario sin recargar la página

### Requirement: Historial de lecturas de una planta

La aplicación SHALL mostrar, en la ficha de una planta, **las lecturas ya registradas** además de las que se registren en la sesión, obtenidas del API y ordenadas de la más reciente a la más antigua. Cada lectura SHALL mostrar **las cinco magnitudes**, marcando como ausentes las que no se informaron —nunca como cero—, de modo que dos lecturas se puedan comparar columna a columna. SHALL permitir además consultar o pedir su análisis de IA desde la propia entrada.

#### Scenario: Lecturas anteriores a la sesión

- **WHEN** el usuario abre la ficha de una planta con lecturas registradas previamente
- **THEN** se muestran todas ellas, de la más reciente a la más antigua, sin que el usuario tenga que registrar ninguna

#### Scenario: Lectura recién registrada

- **WHEN** el usuario registra una lectura
- **THEN** aparece en el historial en su lugar, sin recargar la página

#### Scenario: Valores no informados

- **WHEN** una lectura no informó alguno de los cinco valores
- **THEN** ese valor aparece **marcado como ausente**, nunca como cero, y la lectura sigue mostrando las cinco magnitudes

#### Scenario: Planta sin lecturas

- **WHEN** la planta no tiene ninguna lectura registrada
- **THEN** se indica que todavía no hay nada registrado, y no una lista vacía sin explicación

#### Scenario: Análisis desde una entrada del historial

- **WHEN** el usuario pide el análisis de una lectura del historial
- **THEN** se genera o se recupera el de esa lectura, sin afectar al de las demás

### Requirement: Alta y edición de una planta con el mismo formulario

La aplicación SHALL usar **el mismo formulario** para dar de alta y para editar una planta, dividido en secciones con significado para el usuario —especie, identificación, localización, origen, fotografías y cuidados— con una **navegación que indique en qué sección se está y cuáles están completas**. En edición los campos SHALL llegar prellenados con los valores actuales.

La especie SHALL elegirse de una lista buscable donde cada opción muestre su nombre científico y común, y la elegida SHALL distinguirse por algo más que una marca de comprobación.

Cuando la validación falle, la aplicación SHALL **llevar a la sección del campo que falta**: en un formulario de seis secciones, decir que falta un campo sin decir dónde no basta.

Cuando el API no admita persistir alguno de los campos editados, la aplicación SHALL **advertirlo explícitamente** en lugar de simular que el cambio se ha guardado.

#### Scenario: Alta desde el formulario

- **WHEN** el usuario rellena el formulario de alta y confirma
- **THEN** la planta se crea y la aplicación lleva a su ficha

#### Scenario: Edición prellenada

- **WHEN** el usuario abre la edición de una planta existente
- **THEN** el formulario muestra los valores actuales de esa planta

#### Scenario: Campo que el API no admite guardar

- **WHEN** el usuario edita un campo que el API todavía no permite modificar y confirma
- **THEN** se le indica que ese cambio no se ha guardado, y no se le hace creer que sí

#### Scenario: Campo sin sitio donde guardarse

- **WHEN** el formulario presenta un campo que el API no acepta todavía
- **THEN** se muestra deshabilitado y explicando cuándo llegará, en lugar de admitir un texto que se perdería

#### Scenario: Sección del campo que falta

- **WHEN** el usuario confirma con un campo obligatorio vacío en otra sección
- **THEN** la aplicación lleva a la sección de ese campo y señala cuál falta

#### Scenario: Elegir la especie

- **WHEN** el usuario busca y elige una especie
- **THEN** la elegida queda distinguida y la pauta que heredará la planta pasa a estar a la vista

### Requirement: Catálogo de mezclas de sustrato

La aplicación SHALL mostrar el catálogo de mezclas con su nombre, su composición y su rango de pH, paginado y ordenable, con navegación a la ficha de cada una y al alta de una nueva. Con el catálogo vacío SHALL explicarlo y ofrecer una única acción: registrar la primera.

#### Scenario: Catálogo con mezclas

- **WHEN** el usuario abre el catálogo y el API devuelve mezclas registradas
- **THEN** se muestra una fila por mezcla con su nombre, su composición y su rango de pH

#### Scenario: Catálogo vacío

- **WHEN** no hay ninguna mezcla registrada
- **THEN** se explica y se ofrece registrar la primera, sin una tabla en blanco

### Requirement: Ficha de una mezcla de sustrato

La aplicación SHALL mostrar la ficha de una mezcla con su composición **representada visualmente** además de en cifras, su rango de pH, su descripción y las especies que la recomiendan. La ficha SHALL ser el punto desde el que se corrige o se retira.

#### Scenario: Ficha de una mezcla

- **WHEN** el usuario abre la ficha de una mezcla existente
- **THEN** se muestran su composición en proporción y en cifras, su rango de pH y su descripción

#### Scenario: Mezcla inexistente

- **WHEN** el usuario abre un identificador que el API no reconoce
- **THEN** se explica que no existe, con salida hacia el catálogo

### Requirement: Alta y edición de una mezcla

La aplicación SHALL usar **el mismo formulario** para registrar y para corregir una mezcla, prellenado en la corrección, y SHALL **señalar en la propia pantalla** cuando los porcentajes no sumen 100 o el rango de pH esté invertido, antes de enviar.

#### Scenario: Composición que no cuadra

- **WHEN** el usuario introduce porcentajes que no suman 100
- **THEN** la interfaz lo señala indicando cuánto falta o cuánto sobra, y no envía la petición

#### Scenario: Rango de pH invertido

- **WHEN** el usuario introduce un pH mínimo mayor que el máximo
- **THEN** la interfaz lo señala y no envía la petición

#### Scenario: Alta de una mezcla

- **WHEN** el usuario completa una composición válida y confirma
- **THEN** la mezcla se registra y la aplicación lleva a su ficha

### Requirement: Retirada de una mezcla desde la interfaz

La aplicación SHALL pedir confirmación antes de retirar una mezcla. Cuando el API la rechace por estar en uso, SHALL explicar esa causa concreta y NO SHALL presentarla como un fallo inesperado.

#### Scenario: Retirada confirmada

- **WHEN** el usuario confirma la retirada de una mezcla sin uso
- **THEN** la mezcla se retira y la aplicación vuelve al catálogo

#### Scenario: Mezcla en uso

- **WHEN** el usuario intenta retirar una mezcla que alguna especie recomienda
- **THEN** se le explica que no puede retirarse mientras esté en uso, y la mezcla permanece
