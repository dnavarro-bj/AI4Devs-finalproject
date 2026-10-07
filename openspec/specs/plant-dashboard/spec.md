# plant-dashboard Specification

## Purpose

La interfaz web con la que el propietario del vivero opera su colección: consultar el inventario, dar de alta una planta eligiendo especie y localización, ver los cuidados recomendados de su especie, registrar una lectura de cultivo y pedir el análisis de IA de esa lectura, sin salir del navegador ni recargar la página a mano.

## Requirements

### Requirement: Fidelidad al prototipo

Toda pantalla de la aplicación SHALL reproducir la **composición** de la pantalla equivalente del [prototipo](../../../docs/wireframes/cactify-admin/index.html) —su `data-screen`—, y no solo mostrar sus datos: qué bloque la abre, qué se presenta como figura y no solo como cifra, y qué ocupa la columna principal frente a la lateral.

Lo que el prototipo compone y el API todavía no alimenta SHALL aparecer **marcado con el ticket que lo sustituye y en el lugar del layout que le corresponde**, nunca omitido ni simulado como dato real.

Cada requisito de pantalla de esta capability declara la pantalla del prototipo de la que sale. Los datos correctos en una composición equivocada son una pantalla mal entregada.

#### Scenario: La composición sale del prototipo

- **WHEN** se construye o se revisa una pantalla que el prototipo define
- **THEN** su composición reproduce la de su `data-screen`, bloque a bloque

#### Scenario: Lo que el API no sirve queda marcado en su sitio

- **WHEN** un bloque del prototipo depende de datos que el API todavía no da
- **THEN** el bloque se muestra igualmente, marcado con su ticket y en el lugar que ocupa en el prototipo

#### Scenario: Un bloque nunca se omite en silencio

- **WHEN** una pantalla no construye un bloque que el prototipo compone
- **THEN** su ausencia queda declarada, de modo que no se confunda con un olvido

### Requirement: Listado del inventario

Su composición sale de la pantalla `plants` del prototipo, conforme al requisito «Fidelidad al prototipo».

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

Su composición sale de la pantalla `plant-create` del prototipo, conforme al requisito «Fidelidad al prototipo».

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

Su composición sale de la pantalla `plant-detail` del prototipo, conforme al requisito «Fidelidad al prototipo».

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

Su composición sale de la pantalla `plant-create` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL usar **el mismo formulario** para dar de alta y para editar una planta, dividido en secciones con significado para el usuario —especie, identificación, localización, origen, fotografías y cuidados— con una **navegación que indique en qué sección se está y cuáles están completas**. En edición los campos SHALL llegar prellenados con los valores actuales.

La especie SHALL elegirse de una lista buscable donde cada opción muestre su nombre científico y común, y la elegida SHALL distinguirse por algo más que una marca de comprobación.

Cuando la validación falle, la aplicación SHALL **llevar a la sección del campo que falta**: en un formulario de seis secciones, decir que falta un campo sin decir dónde no basta.

Al editar, la aplicación SHALL **guardar** el apodo, la localización y la especie, y volver a la ficha de la planta, que refleja los cambios. Si el API rechaza la edición, la aplicación SHALL explicar el motivo **sin perder lo que el usuario había escrito**. Un campo que el API no admite guardar todavía SHALL **no ser editable**: se muestra deshabilitado y explicando cuándo llegará, en lugar de admitir un texto que se perdería.

#### Scenario: Alta desde el formulario

- **WHEN** el usuario rellena el formulario de alta y confirma
- **THEN** la planta se crea y la aplicación lleva a su ficha

#### Scenario: Edición prellenada

- **WHEN** el usuario abre la edición de una planta existente
- **THEN** el formulario muestra los valores actuales de esa planta

#### Scenario: Edición guardada

- **WHEN** el usuario cambia el apodo, la localización o la especie de una planta y confirma
- **THEN** los cambios se guardan, la aplicación lleva a la ficha de la planta y esta muestra los valores nuevos

#### Scenario: Edición sin avisos de guardado parcial

- **WHEN** el usuario guarda una edición correcta
- **THEN** no aparece ningún aviso de que los cambios no se han guardado

#### Scenario: Edición rechazada por el API

- **WHEN** el API rechaza la edición, por ejemplo porque la localización ya no existe
- **THEN** se explica el motivo, el usuario sigue en el formulario y lo que había escrito no se pierde

#### Scenario: Campo que el API no admite guardar

- **WHEN** el usuario intenta editar un campo que el API todavía no permite modificar
- **THEN** no puede: el campo está deshabilitado, de modo que ningún cambio se pierde en silencio ni se simula que se ha guardado

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

Su composición sale de la pantalla `soil-mixes` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL mostrar el catálogo de mezclas con su nombre, su composición, su rango de pH y su receta, obtenidos del API y paginados. El listado SHALL ofrecer navegación a la ficha de cada mezcla y al alta de una nueva. Cuando el catálogo esté vacío, la pantalla SHALL explicarlo y ofrecer registrar la primera.

La composición SHALL verse como **proporción** además de leerse como cifras, y el pH SHALL acompañarse de su **lectura cualitativa** —ácido, neutro o alcalino—, porque un número solo no dice dónde cae en la escala a quien no la tiene memorizada.

#### Scenario: Catálogo con mezclas

- **WHEN** se abre el catálogo y el API devuelve mezclas registradas
- **THEN** se muestra una fila por mezcla con su nombre, su composición, su rango de pH y su receta

#### Scenario: La composición se ve, no solo se lee

- **WHEN** se muestra una mezcla en el listado
- **THEN** su reparto entre orgánico y mineral aparece como proporción, con sus dos cifras legibles

#### Scenario: El pH se interpreta

- **WHEN** se muestra el rango de pH de una mezcla
- **THEN** se acompaña de su lectura cualitativa, no solo del número

#### Scenario: Catálogo vacío

- **WHEN** se abre el catálogo y no hay ninguna mezcla registrada
- **THEN** se explica que no hay ninguna y se ofrece registrar la primera, sin una tabla en blanco

#### Scenario: Navegación a la ficha

- **WHEN** se selecciona una mezcla del catálogo
- **THEN** la aplicación navega a su ficha sin recargar la página

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el listado no aparece a medias

### Requirement: Ficha de una mezcla de sustrato

Su composición sale de la pantalla `soil-mix-detail` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL mostrar la ficha de una mezcla con su composición, su rango de pH, su receta de referencia y **cuántas especies la recomiendan**. La ficha SHALL ser el punto desde el que se corrige o se retira la mezcla.

La ficha SHALL abrir con la composición **como figura**, que es la identidad de la receta, y SHALL situar el rango de pH **sobre una escala** en lugar de enunciarlo suelto.

Lo que el prototipo muestra y el API no sirve —cuántas plantas la utilizan, el drenaje y la retención esperados, el desglose de sus componentes, las notas de preparación y la fecha de actualización— SHALL aparecer **marcado con el ticket que lo sustituye**, nunca simulado como si fuese dato.

#### Scenario: Ficha de una mezcla

- **WHEN** el usuario abre la ficha de una mezcla existente
- **THEN** se muestran su composición en proporción y en cifras, su rango de pH y su descripción

#### Scenario: Composición como figura

- **WHEN** se abre la ficha de una mezcla
- **THEN** su reparto entre orgánico y mineral se presenta como figura, con las dos cifras legibles

#### Scenario: El pH sobre su escala

- **WHEN** se muestra el rango de pH
- **THEN** aparece situado sobre una escala con sus extremos nombrados, además de como cifras

#### Scenario: Uso de la mezcla

- **WHEN** se abre la ficha
- **THEN** se dice cuántas especies la recomiendan, también cuando son cero

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** la ficha presenta secciones que el API no alimenta
- **THEN** cada una queda marcada con el ticket que la llena, sin contenido simulado

#### Scenario: Mezcla inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la mezcla no existe, con salida al catálogo, y no una pantalla en blanco

### Requirement: Alta y edición de una mezcla

Su composición sale de la pantalla `soil-mix-editor` del prototipo, conforme al requisito «Fidelidad al prototipo».

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

### Requirement: Catálogo de especies

Su composición sale de la pantalla `species` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL mostrar el catálogo de especies registradas con su nombre científico y su nombre común, obtenidos del API y paginados. El listado SHALL poder ordenarse y SHALL ofrecer navegación a la ficha de cada especie y al alta de una nueva. Cuando el catálogo esté vacío, la pantalla SHALL explicarlo y ofrecer una única acción: registrar la primera especie.

La celda identificativa SHALL presentar juntos el nombre científico y el común, para que la especie se reconozca por cualquiera de los dos sin salir de la fila.

Los datos que el API todavía no sirve SHALL presentarse como **datos de ejemplo reconocibles**, nunca como si fueran reales. Esto **incluye los que el API sí sirve pero no en este endpoint**: el listado devuelve solo los nombres, así que la temperatura, el riego y el sustrato de una especie se marcan igual que lo que no existe, diciendo dónde sí están.

#### Scenario: Catálogo con especies

- **WHEN** el usuario abre el catálogo y el API devuelve especies registradas
- **THEN** se muestra una fila por especie con su nombre científico y su nombre común

#### Scenario: Catálogo vacío

- **WHEN** el usuario abre el catálogo y no hay ninguna especie registrada
- **THEN** se explica que no hay ninguna y se ofrece registrar la primera, sin una tabla en blanco

#### Scenario: Navegación a la ficha

- **WHEN** el usuario selecciona una especie del catálogo
- **THEN** la aplicación navega a su ficha sin recargar la página

#### Scenario: Ordenar el catálogo

- **WHEN** el usuario ordena por una columna
- **THEN** el catálogo se vuelve a pedir al API con ese criterio, y no se reordena solo la página visible

#### Scenario: La especie se reconoce por cualquiera de sus nombres

- **WHEN** se muestra una especie en el listado
- **THEN** su nombre científico y su nombre común aparecen juntos en la misma celda

#### Scenario: Lo que el listado no trae se distingue de lo que no existe

- **WHEN** se muestran columnas cuyo dato el endpoint del listado no devuelve
- **THEN** quedan marcadas como ejemplo **y** dicen dónde está el dato de verdad, en lugar de sugerir que no existe

### Requirement: Ficha de una especie

Su composición sale de la pantalla `species-detail` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL mostrar la ficha de una especie con su nombre científico, su nombre común y **la pauta de cultivo que heredan sus ejemplares**: rangos de humedad, temperatura y horas de luz, y su pauta de riego. La ficha SHALL ser el punto desde el que se corrige o se retira la especie.

La ficha SHALL abrir con la identidad de la especie —sus dos nombres— y SHALL agrupar la pauta de cultivo como **una sola lectura**, no como campos sueltos: es lo que se consulta de una especie.

Las secciones cuyos datos el API todavía no sirve SHALL explicarlo, sin simular contenido.

#### Scenario: Ficha de una especie existente

- **WHEN** el usuario abre la ficha de una especie existente
- **THEN** se muestran su nombre científico, su nombre común y los rangos que heredan sus ejemplares

#### Scenario: Ficha de una especie inexistente

- **WHEN** el usuario abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la especie no existe, con salida hacia el catálogo, y no una pantalla en blanco

#### Scenario: Lo que todavía no existe se reconoce como ejemplo

- **WHEN** la ficha presenta datos que el API no sirve todavía
- **THEN** quedan identificados como datos de ejemplo, y no se confunden con los reales

#### Scenario: La pauta se lee de una vez

- **WHEN** se abre la ficha de una especie
- **THEN** temperatura, humedad, luz, riego y sustrato aparecen como una sola lectura de condiciones, cada una con su magnitud

#### Scenario: El género se deduce del nombre científico

- **WHEN** se muestra la ficha de catálogo de una especie
- **THEN** su género aparece derivado del binomio, sin marcarse como ejemplo, porque no es un dato inventado

### Requirement: Alta y edición de una especie

Su composición sale de la pantalla `species-editor` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL usar **el mismo formulario** para registrar y para corregir una especie, dividido en secciones con navegación, y en edición SHALL llegar prellenado. SHALL exigir nombre científico, nombre común y los rangos de cultivo, y SHALL validar que **cada mínimo no supere a su máximo** antes de enviar.

Cuando el API rechace el nombre científico por estar ya registrado, la aplicación SHALL señalarlo **en ese campo**, no como un error general de la pantalla.

#### Scenario: Alta de una especie

- **WHEN** el usuario rellena el formulario y confirma
- **THEN** la especie se registra y la aplicación lleva a su ficha

#### Scenario: Edición prellenada

- **WHEN** el usuario abre la corrección de una especie existente
- **THEN** el formulario muestra sus valores actuales

#### Scenario: Rango invertido

- **WHEN** el usuario introduce un mínimo mayor que su máximo
- **THEN** la interfaz lo señala en ese rango y no envía la petición

#### Scenario: Nombre científico ya registrado

- **WHEN** el API rechaza el alta porque el nombre científico ya existe
- **THEN** el mensaje se muestra junto a ese campo y lo introducido se conserva

### Requirement: Retirada de una especie

La aplicación SHALL permitir retirar una especie del catálogo, **pidiendo confirmación** antes de hacerlo por ser una acción irreversible. Cuando el API la rechace por tener ejemplares asociados, la aplicación SHALL explicar esa causa concreta y NO SHALL presentarla como un fallo inesperado.

#### Scenario: Retirada confirmada

- **WHEN** el usuario confirma la retirada de una especie sin ejemplares
- **THEN** la especie se retira y la aplicación vuelve al catálogo

#### Scenario: Retirada cancelada

- **WHEN** el usuario cierra la confirmación sin aceptar
- **THEN** no se retira nada y la ficha queda como estaba

#### Scenario: Especie con ejemplares

- **WHEN** el usuario intenta retirar una especie que tiene ejemplares asociados
- **THEN** se le explica que no puede retirarse mientras los tenga, y la especie permanece

### Requirement: Catálogo de localizaciones

La aplicación SHALL ofrecer la pantalla del catálogo de localizaciones con la composición de la pantalla `locations` del prototipo: cabecera con el recuento y el alta, **mapa del vivero** a un lado y **vista general** al otro.

El mapa SHALL presentar las localizaciones como **árbol recorrible a todos sus niveles**, cada nodo con su nombre y su carga —los ejemplares **totales**, contando los descendientes—, encabezado por la colección completa; no como una tabla de filas sueltas. Los nodos con hijas SHALL poder plegarse y desplegarse y el mapa SHALL ofrecer **buscar una localización** por nombre o código. La vista general SHALL presentar cada localización de **primer nivel** como **tarjeta de zona** con su carga expresada además como **proporción ocupada** cuando tenga capacidad, y SHALL ofrecer salida al inventario completo. Seleccionar un nodo del mapa SHALL llevar la vista general a esa zona.

#### Scenario: El catálogo es un mapa, no una lista

- **WHEN** se abre el catálogo con localizaciones registradas
- **THEN** se muestran el mapa del vivero como árbol y la vista general con una tarjeta por zona

#### Scenario: El árbol tiene todos sus niveles

- **WHEN** existen `Invernadero 1`, `Bancada norte` y `Bandeja A3` anidadas
- **THEN** el mapa las muestra anidadas, con `Invernadero 1` desplegable, y cada nodo dice sus ejemplares totales

#### Scenario: Cada localización dice la carga que soporta

- **WHEN** se muestra una localización, en el mapa o como tarjeta
- **THEN** aparece cuántos ejemplares alberga, y en la tarjeta con capacidad también como proporción ocupada

#### Scenario: Localización sin capacidad

- **WHEN** una tarjeta corresponde a una localización sin capacidad definida
- **THEN** no inventa una proporción: dice que no tiene capacidad definida

#### Scenario: Buscar en el mapa

- **WHEN** se escribe `A3` en la búsqueda del mapa
- **THEN** el mapa muestra solo las localizaciones que coinciden por nombre o código, con su ruta visible

#### Scenario: Localización vacía en el listado

- **WHEN** una localización no alberga ningún ejemplar
- **THEN** aparece igualmente, indicando que está vacía

#### Scenario: El total de la colección encabeza el mapa

- **WHEN** se abre el catálogo
- **THEN** el mapa se encabeza con la colección completa y su número de localizaciones y de ejemplares

#### Scenario: Catálogo sin localizaciones

- **WHEN** no hay ninguna localización registrada
- **THEN** se muestra un estado vacío que ofrece crear la primera, sin un mapa en blanco

#### Scenario: Los niveles que faltan quedan declarados

- **WHEN** se abre el catálogo
- **THEN** ningún nivel del mapa aparece marcado con T-18: la jerarquía de zonas, bancadas y bandejas es la real

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el mapa no aparece a medias

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su código, su ruta y sus acciones; **fila de métricas** del espacio; columna principal con **lo que contiene** —las sublocalizaciones— y los ejemplares que alberga; y columna lateral con las características del espacio, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta completa**, y los **breadcrumbs reflejan esa ruta real** —Inicio / Localizaciones / cada ancestro / la localización— con cada ancestro navegable. Las métricas SHALL presentarse como **cifras destacadas** con su matiz: los ejemplares totales con cuántos hay directamente aquí, y cuántas sublocalizaciones. «Dentro de …» SHALL listar las sublocalizaciones con su carga y ofrecer **añadir dentro**, que abre el alta con esta localización como padre. Los ejemplares SHALL ir paginados con su ubicación exacta, y SHALL ofrecer ver el inventario filtrado por esta localización incluidos sus descendientes. Las características SHALL mostrar tipo, entorno, exposición, capacidad y **ocupación** (solo si hay capacidad) y las notas operativas. Los últimos movimientos SHALL mostrar los más recientes con su sentido —recibidos o cedidos, con el origen o el destino— y ofrecer el historial completo.

Lo que el prototipo muestra y el API todavía no sirve —las **tareas y el próximo trabajo** (T-22) y las **alertas** (T-23)— SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

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
- **THEN** las tareas, el próximo trabajo y las alertas aparecen marcados con su ticket (T-22, T-23), cada uno en el bloque del layout que ocupa en el prototipo

#### Scenario: Localización inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la localización no existe, con salida al catálogo, y no una pantalla en blanco

### Requirement: Administración de una localización

La aplicación SHALL permitir crear una localización, editarla por completo y retirarla desde su ficha, con la composición de la pantalla `location-editor` del prototipo: **posición en el vivero** —el padre elegido y la ruta resultante, con «cambiar padre»—, **identificación** —nombre, código corto, tipo, capacidad y descripción—, **características del espacio** —entorno, exposición y notas operativas— y un lateral que resume dónde se creará y recomienda poca profundidad.

El **código SHALL proponerse** a partir del nombre mientras no se haya escrito a mano (`Bancada norte` en `Invernadero 1` → `LOC-I1-BN`), y SHALL poder sobrescribirse. El selector de padre SHALL **excluir la propia localización y sus descendientes** al editar, de modo que el ciclo no sea ni ofrecible; el servidor lo rechaza igualmente. La retirada SHALL confirmarse, y un `409` del API SHALL explicarse por lo que significa —alberga ejemplares, contiene sublocalizaciones o figura en movimientos— y no como un fallo genérico.

#### Scenario: Alta de una localización

- **WHEN** se crea una localización con su nombre y su código
- **THEN** aparece en el catálogo y queda disponible para asignar a un ejemplar

#### Scenario: Alta dentro de otra

- **WHEN** se abre el alta desde «Añadir dentro» de `Bancada norte`
- **THEN** la posición ya es `Bancada norte`, la ruta resultante se muestra y la localización se crea dentro

#### Scenario: El código se propone

- **WHEN** se escribe el nombre `Bancada norte` sin tocar el código
- **THEN** el formulario propone un código y lo mantiene actualizado hasta que se edita a mano

#### Scenario: Un código escrito a mano no se pisa

- **WHEN** se edita el código a mano y luego se cambia el nombre
- **THEN** el código escrito se conserva

#### Scenario: Código ya usado

- **WHEN** el API responde `409` por un código repetido
- **THEN** el formulario lo dice junto al campo, sin perder lo escrito

#### Scenario: Nombre corregido

- **WHEN** se corrige el nombre de una localización desde su ficha
- **THEN** la ficha refleja el nombre nuevo y los ejemplares que alberga no cambian

#### Scenario: Edición completa

- **WHEN** se corrigen el nombre, el tipo y el padre desde su ficha
- **THEN** la ficha refleja los valores nuevos, la ruta nueva y los ejemplares que alberga no cambian

#### Scenario: El padre no puede ser un descendiente

- **WHEN** se abre el selector de padre al editar `Invernadero 1`
- **THEN** ni ella ni sus descendientes aparecen como opción

#### Scenario: Retirada confirmada

- **WHEN** se retira una localización vacía y se confirma
- **THEN** se vuelve al catálogo y la localización ya no aparece

#### Scenario: Retirada bloqueada por uso

- **WHEN** se intenta retirar una localización que alberga ejemplares o contiene sublocalizaciones
- **THEN** se explica cuál de las dos cosas lo impide, con la cifra, en lugar de un fallo genérico
- **AND** se ofrece verlos para moverlos, en lugar de dejar la acción sin salida

### Requirement: Catálogo de etiquetas

La aplicación SHALL mostrar el catálogo de etiquetas con la composición de la pantalla `tags` del prototipo: cabecera con el recuento y el alta, **resumen de salud del catálogo**, y el listado con el nombre, **el uso en la colección**, cuántas plantas tiene cada una y sus acciones. El listado SHALL ser paginado y ordenable, con navegación a la ficha de cada etiqueta y al alta de una nueva. Con el catálogo vacío SHALL explicarlo y ofrecer crear la primera.

El uso SHALL verse como **proporción sobre el inventario** además de leerse como cifra: una etiqueta con 286 plantas y otra con 12 se distinguen de un vistazo por su longitud, no comparando números. Una etiqueta **sin ninguna planta** SHALL aparecer igualmente, señalada como sin uso, porque es la que se puede retirar.

Lo que el prototipo muestra y el API todavía no sirve —los ejemplares de ejemplo de cada etiqueta, la fecha de la última modificación, la detección de posibles duplicados y la selección múltiple con acciones por lote— SHALL aparecer **marcado con su ticket en el sitio del layout que le corresponde**, nunca omitido ni simulado.

#### Scenario: El uso se ve, no solo se lee

- **WHEN** se muestra una etiqueta del catálogo
- **THEN** su uso aparece como proporción sobre el inventario, además de como número de plantas

#### Scenario: Etiqueta sin plantas

- **WHEN** una etiqueta no la tiene ninguna planta
- **THEN** aparece en el listado señalada como sin uso, no se oculta

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre el catálogo
- **THEN** los ejemplares de muestra, la fecha de modificación, los posibles duplicados y las acciones por lote aparecen marcados con su ticket

#### Scenario: Catálogo con etiquetas

- **WHEN** el usuario abre el catálogo y el API devuelve etiquetas
- **THEN** se muestra una fila por etiqueta con su nombre y su número de plantas

#### Scenario: Etiqueta sin uso

- **WHEN** una etiqueta no la tiene ninguna planta
- **THEN** se muestra con cero, que es información, y no se oculta

### Requirement: Ficha de una etiqueta

La aplicación SHALL mostrar la ficha de una etiqueta con la composición de la pantalla `tag-detail` del prototipo: portada con su marca, su nombre normalizado, su estado de uso y sus tres acciones —ver sus plantas, renombrar y combinar—; columna principal con **la distribución en la colección** y las plantas que la tienen; y columna lateral con la ficha de la etiqueta, el impacto de renombrarla y el panel de administrar.

La distribución SHALL presentarse como **cifras destacadas** —cuántas plantas y qué parte del inventario representan—, que es lo que responde a si la etiqueta sigue siendo útil. El **nombre normalizado** SHALL estar a la vista en la portada, porque es lo que decide si un renombrado choca con otra etiqueta.

Lo que el prototipo muestra y el API todavía no sirve —el reparto por especies y por localizaciones, la descripción de la etiqueta, y sus fechas de creación y modificación— SHALL aparecer **marcado con su ticket y en su bloque**, nunca omitido ni simulado.

#### Scenario: Ficha de una etiqueta con plantas

- **WHEN** el usuario abre la ficha de una etiqueta que varias plantas tienen
- **THEN** se muestran esas plantas, con navegación a la ficha de cada una

#### Scenario: Ficha de una etiqueta sin plantas

- **WHEN** el usuario abre la ficha de una etiqueta que ninguna planta tiene
- **THEN** se explica que todavía no la tiene ninguna, y se ofrece retirarla

### Requirement: Administración de una etiqueta desde la interfaz

La aplicación SHALL permitir renombrar, combinar y retirar una etiqueta. La **combinación SHALL declarar cuántas plantas se verán afectadas antes de confirmarse** y advertir de que la etiqueta de origen desaparece. Cuando el API rechace una operación por conflicto —nombre ya usado, o etiqueta en uso—, la aplicación SHALL explicar esa causa concreta.

#### Scenario: Renombrado

- **WHEN** el usuario renombra una etiqueta a un nombre libre
- **THEN** el nombre cambia y las plantas que la tenían la conservan

#### Scenario: Nombre ya usado

- **WHEN** el usuario renombra una etiqueta a un nombre que ya existe
- **THEN** se le explica que ese nombre ya está en el catálogo, junto al campo, y el nombre no cambia

#### Scenario: Alcance de la combinación declarado

- **WHEN** el usuario elige combinar una etiqueta en otra
- **THEN** antes de confirmar se le indica cuántas plantas se verán afectadas y que la etiqueta de origen desaparecerá

#### Scenario: Combinación cancelada

- **WHEN** el usuario cierra la confirmación de la combinación sin aceptar
- **THEN** no se combina nada y ambas etiquetas permanecen

#### Scenario: Retirada de una etiqueta en uso

- **WHEN** el usuario intenta retirar una etiqueta que alguna planta tiene
- **THEN** se le explica que no puede retirarse mientras esté en uso, y se le ofrece combinarla en otra

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

### Requirement: Códigos de inventario a la vista

La aplicación SHALL mostrar el **código real** de cada ejemplar y de cada especie, tal y como lo devuelve el API, en las pantallas que el prototipo lo pinta: el inventario, la cabecera de la ficha de la planta, el formulario de edición, el catálogo de especies y la ficha de especie. Ningún código SHALL fabricarse en el cliente ni mostrarse como dato de ejemplo.

En el **alta** de una planta, al elegir la especie la aplicación SHALL enseñar **qué código llevará** la planta —el código de la especie y el número pendiente de asignar, `CAT-GRUSS-··`— y SHALL decir que el número se asigna al guardar, sin inventarlo. En la **edición**, el código del ejemplar SHALL verse de solo lectura.

El formulario de especie SHALL ofrecer el campo **Código**, **obligatorio**: sin él no se guarda y se señala el campo. En el **alta** SHALL **proponerlo a partir del nombre científico** mientras se escribe —el prefijo de la colección y las primeras letras del género— y dejar que el usuario lo cambie; en la **edición** nunca SHALL sugerirlo ni pisarlo. Si la especie ya tiene ejemplares, SHALL estar **deshabilitado y explicar por qué**. Un `409` por código ya usado SHALL explicarse junto al campo.

La ficha de especie SHALL mostrar su **recuento real de ejemplares**, que es el que decide si el código se puede corregir. Lo que el prototipo pinta junto al código y el API todavía no sirve —el recuento por fila del catálogo y la lista de ejemplares de la especie— SHALL seguir marcado con el ticket que lo sustituye (T-21).

#### Scenario: Código real en el inventario

- **WHEN** se abre el inventario
- **THEN** cada fila muestra el código que devuelve el API para esa planta

#### Scenario: Código real en la ficha y en la edición

- **WHEN** se abre la ficha de una planta o su edición
- **THEN** el código mostrado es el del API y en la edición no se puede modificar

#### Scenario: Código que llevará la planta en el alta

- **WHEN** el usuario elige una especie en el formulario de alta
- **THEN** ve el código que llevará la planta con el número pendiente de asignar, y que se asigna al guardar

#### Scenario: Código de la especie en el catálogo y en su ficha

- **WHEN** se abre el catálogo de especies o la ficha de una especie
- **THEN** se muestra el código real de la especie

#### Scenario: Código de la especie obligatorio

- **WHEN** el usuario intenta guardar una especie dejando el código vacío
- **THEN** se señala el campo Código como obligatorio, la sección que lo contiene se muestra y no se envía ninguna petición

#### Scenario: Código propuesto desde el nombre científico

- **WHEN** el usuario escribe el nombre científico en el alta de una especie y no ha tocado el código
- **THEN** el campo Código se rellena con la propuesta, como `CAT-ECHIN`, y dice que está propuesta y que se puede cambiar

#### Scenario: La propuesta sigue al nombre hasta que el usuario escribe el código

- **WHEN** el usuario cambia el nombre científico y no ha tocado el código
- **THEN** la propuesta se actualiza con el nombre nuevo

#### Scenario: Un código escrito a mano no se pisa

- **WHEN** el usuario escribe su propio código y después cambia el nombre científico
- **THEN** el código escrito se conserva y deja de aparecer como propuesto

#### Scenario: En la edición no se propone nada

- **WHEN** el usuario edita una especie y cambia su nombre científico
- **THEN** el código existente no cambia ni se muestra como propuesto

#### Scenario: Código bloqueado por tener ejemplares

- **WHEN** el usuario edita una especie que ya tiene ejemplares
- **THEN** el campo Código aparece deshabilitado con la explicación de que ya identifica plantas

#### Scenario: Código de especie ya usado

- **WHEN** el API rechaza el código de una especie por estar ya usado
- **THEN** se explica junto al campo y lo que el usuario había escrito no se pierde

#### Scenario: Lo que sigue pendiente, declarado

- **WHEN** se abre el catálogo o la ficha de una especie
- **THEN** el recuento por fila del catálogo y la lista de ejemplares de la especie siguen marcados como datos de ejemplo con su ticket, y el recuento de la ficha es el real

### Requirement: Búsqueda por código en el inventario

La caja de búsqueda del inventario SHALL **buscar por código de inventario** mientras se escribe, con un breve retardo para no lanzar una petición por tecla, y SHALL aparecer entre los filtros aplicados, de modo que se pueda quitar. Se combina con el filtro de localización y de etiqueta. Con una búsqueda activa, el listado SHALL volver a su primera página. La caja SHALL decir que buscar por apodo o por especie llega con su ticket (T-21): no presentarse como un buscador completo cuando solo busca códigos.

Una búsqueda sin resultados SHALL explicarlo, mencionando el texto buscado, y ofrecer quitar el filtro.

#### Scenario: Escribir un código

- **WHEN** el usuario escribe `gruss` en la caja de búsqueda del inventario
- **THEN** el listado muestra solo las plantas cuyo código lo contiene y la búsqueda aparece como filtro aplicado

#### Scenario: Una petición por pausa, no por tecla

- **WHEN** el usuario escribe varias letras seguidas
- **THEN** se hace una sola petición cuando deja de escribir

#### Scenario: Quitar la búsqueda

- **WHEN** el usuario quita el filtro de búsqueda aplicado
- **THEN** el listado vuelve a mostrar el inventario sin ese criterio y la caja queda vacía

#### Scenario: Combinada con la localización

- **WHEN** el usuario busca por código y además filtra por una localización
- **THEN** el listado cumple las dos condiciones

#### Scenario: Sin coincidencias

- **WHEN** la búsqueda no encuentra ninguna planta
- **THEN** se explica que ninguna planta tiene ese texto en su código y se ofrece quitar la búsqueda

#### Scenario: Lo que la caja no busca, declarado

- **WHEN** se abre el inventario
- **THEN** la caja indica que buscar por apodo o especie llega con T-21

#### Scenario: Búsqueda por teclado

- **WHEN** el usuario alcanza la caja con el teclado y escribe
- **THEN** puede buscar sin usar el ratón

### Requirement: Perfil real del ejemplar en las pantallas

La aplicación SHALL mostrar y permitir editar el **perfil real** del ejemplar —descripción, estado, germinación, adquisición y procedencia— con lo que devuelve el API, sin constantes de ejemplo.

El **formulario** de alta y edición SHALL habilitar la descripción, el año y el mes de germinación, la fecha de adquisición, la procedencia con su nota y, **solo en el alta**, el estado inicial (de entre los en curso). El mes SHALL poder quedar sin especificar y SHALL estar deshabilitado mientras no haya año. Un error del API SHALL explicarse sin perder lo escrito.

La **cabecera de la ficha** SHALL mostrar el **estado real** con su texto, y la germinación real: «Germinada 04/2021» si hay mes, y «Germinada en 2021 · ~5 años» si solo hay año, sin inventar un mes. Un ejemplar **archivado** (en un estado final) SHALL distinguirse por algo más que el color.

La ficha SHALL ofrecer **cambiar el estado**, con un motivo opcional y **obligatorio al volver a `activa` desde un estado final**, y SHALL mostrar el **historial de cambios** con su fecha, del más reciente al más antiguo, en la pestaña de datos. Solo SHALL ofrecer las transiciones que el dominio admite. El inventario y la ficha de localización SHALL mostrar el estado de cada ejemplar, y el inventario SHALL **filtrar por estado**: por defecto solo lo que está en curso, con la opción de incluir los archivados.

Lo que sigue sin tener datos —la exposición y el entorno (T-17), las fotografías (T-19), los cuidados propios por ejemplar (`cuidados-por-ejemplar`) y las tareas y alertas— SHALL seguir marcado con su ticket en su sitio.

#### Scenario: Estado real en la cabecera

- **WHEN** se abre la ficha de un ejemplar `cuarentena`
- **THEN** la cabecera muestra «Cuarentena» y no un estado de ejemplo

#### Scenario: Germinación con mes

- **WHEN** se abre la ficha de un ejemplar germinado en abril de 2021
- **THEN** la cabecera dice «Germinada 04/2021»

#### Scenario: Germinación solo con año

- **WHEN** se abre la ficha de un ejemplar con año de germinación y sin mes
- **THEN** la cabecera dice que germinó ese año con una edad aproximada, sin ningún mes

#### Scenario: Sin datos de germinación

- **WHEN** se abre la ficha de un ejemplar sin germinación
- **THEN** la cabecera no muestra ninguna germinación inventada

#### Scenario: Ejemplar archivado

- **WHEN** se abre la ficha de un ejemplar `vendida`
- **THEN** su estado se distingue con texto y forma, no solo con el color

#### Scenario: Alta con la ficha completa

- **WHEN** el usuario rellena descripción, germinación, procedencia y estado inicial y guarda
- **THEN** la planta se crea con esos datos y la ficha los muestra

#### Scenario: El mes depende del año

- **WHEN** el usuario no ha indicado el año de germinación
- **THEN** el mes está deshabilitado

#### Scenario: Estado inicial solo en el alta

- **WHEN** el usuario edita un ejemplar existente
- **THEN** el formulario no ofrece cambiar el estado, que tiene su propia acción

#### Scenario: Cambiar el estado

- **WHEN** el usuario cambia un ejemplar activo a cuarentena desde la ficha
- **THEN** la cabecera muestra el estado nuevo y el historial gana el cambio con su fecha

#### Scenario: Solo las transiciones válidas

- **WHEN** el usuario abre el cambio de estado de un ejemplar `muerta`
- **THEN** solo se ofrece volver a `activa`, y se exige el motivo

#### Scenario: Cambio rechazado por el API

- **WHEN** el API rechaza el cambio de estado
- **THEN** se explica el motivo, el estado mostrado no cambia y lo escrito no se pierde

#### Scenario: Historial de cambios

- **WHEN** se abre la pestaña de datos de un ejemplar con cambios de estado
- **THEN** se listan del más reciente al más antiguo, con su fecha, sus estados y su motivo

#### Scenario: Inventario sin archivados por defecto

- **WHEN** se abre el inventario
- **THEN** solo aparecen los ejemplares en curso, y hay una forma visible de incluir los archivados

#### Scenario: Filtrar por estado

- **WHEN** el usuario filtra el inventario por un estado
- **THEN** solo aparecen los ejemplares en ese estado y el filtro figura entre los aplicados

#### Scenario: Estado en el inventario y en la localización

- **WHEN** se abre el inventario o la ficha de una localización
- **THEN** cada ejemplar muestra su estado real

### Requirement: Cuidados propios y perfil efectivo en las pantallas

La sección de **cuidados efectivos** del formulario de alta y edición SHALL permitir personalizar la pauta del ejemplar: un interruptor abre el editor de los cinco conceptos —humedad, temperatura, horas de luz, riego y sustrato—, cada uno con **el valor heredado de la especie a la vista** como referencia. Solo lo que el usuario rellena se sobrescribe; lo que deja vacío se hereda. Un error del API SHALL explicarse sin perder lo escrito.

La **ficha** SHALL mostrar el **perfil efectivo** y **distinguir lo propio de lo heredado a simple vista**: cada valor lleva la marca «propio» o «de la especie» **en texto**, y lo propio se distingue además por su forma, no solo por el color. Sin cuidados propios, la ficha lo dice: «Hereda toda la pauta de su especie».

La exposición y el entorno propios SHALL seguir marcados con su ticket (T-17): la especie todavía no los tiene.

#### Scenario: Editor con el valor heredado a la vista

- **WHEN** el usuario activa la personalización de cuidados con una especie elegida
- **THEN** cada concepto muestra el valor de la especie como referencia, y los campos propios están vacíos

#### Scenario: Solo lo rellenado se sobrescribe

- **WHEN** el usuario rellena solo la pauta de riego y guarda
- **THEN** se envía únicamente esa pauta como cuidado propio

#### Scenario: Desactivar la personalización quita los cuidados propios

- **WHEN** el usuario desactiva la personalización en la edición de un ejemplar que tenía cuidados propios y guarda
- **THEN** el ejemplar vuelve a heredar toda la pauta de su especie

#### Scenario: Edición prellenada con lo propio

- **WHEN** el usuario abre la edición de un ejemplar con cuidados propios
- **THEN** la personalización aparece activa con sus valores, y lo no sobrescrito vacío

#### Scenario: La ficha distingue lo propio de lo heredado

- **WHEN** se abre la ficha de un ejemplar que sobrescribe la humedad
- **THEN** la humedad lleva la marca «propio» y el resto «de la especie», con texto y no solo color

#### Scenario: Sin cuidados propios

- **WHEN** se abre la ficha de un ejemplar que no sobrescribe nada
- **THEN** se dice que hereda toda la pauta de su especie

#### Scenario: Perfil incoherente rechazado por el API

- **WHEN** el API rechaza unos cuidados propios incoherentes
- **THEN** se explica qué rango falla, el usuario sigue en el formulario y lo escrito no se pierde

#### Scenario: Cambio de especie con cuidados que no encajan

- **WHEN** el API rechaza el cambio de especie porque los cuidados propios no encajan con la nueva
- **THEN** se explica el conflicto y el ejemplar conserva su especie

### Requirement: La ficha de especie muestra su ficha de cultivo y su año

La ficha de una especie SHALL mostrar con datos reales la descripción en la cabecera, la exposición y el entorno entre las condiciones, la rejilla «Año de cultivo» con una fila de crecimiento, otra de floración y otra de riego, y el perfil de floración con periodo, color, madurez, duración y notas. Un periodo que cruza el fin de año SHALL pintar los meses de diciembre y de enero seguidos. La intensidad del riego SHALL verse como intensidad y no solo como presencia, y el crecimiento máximo como un crecimiento más intenso. Un dato sin definir SHALL leerse como «Sin definir», no como un valor vacío ni inventado. La ficha SHALL seguir marcando con su ticket lo que no existe aún —fotografías, grupos de cultivo, lista de ejemplares— y el número de ejemplares SHALL ser el real.

#### Scenario: Año de cultivo con cruce de año

- **WHEN** se abre la ficha de una especie con reposo de noviembre a febrero
- **THEN** la fila correspondiente enciende noviembre, diciembre, enero y febrero

#### Scenario: Crecimiento máximo sobre el crecimiento

- **WHEN** se abre la ficha de una especie con crecimiento de marzo a junio y crecimiento máximo de abril a mayo
- **THEN** abril y mayo se pintan con más fuerza que marzo y junio

#### Scenario: Especie sin calendario

- **WHEN** se abre la ficha de una especie sin periodos
- **THEN** la rejilla se muestra sin actividad y la ficha dice que el calendario no está definido

#### Scenario: Exposición y entorno reales

- **WHEN** se abre la ficha de una especie con exposición `pleno_sol` y entorno `exterior`
- **THEN** la ficha muestra «Pleno sol» y «Exterior»

#### Scenario: Floración sin datos

- **WHEN** la especie no tiene color ni madurez de floración
- **THEN** esos datos muestran «Sin definir»

### Requirement: Alta y edición de la ficha de cultivo y del calendario

El formulario de especie SHALL permitir indicar la descripción, la exposición, el entorno, el calendario anual y los datos de floración. La exposición SHALL presentarse como cuatro opciones con **su definición funcional visible** bajo cada una, sin umbrales numéricos. El entorno SHALL ofrecer exactamente interior, exterior y ambos.

El calendario SHALL editarse **sobre la propia rejilla del año**, como la de la ficha, y no con selectores: cuatro pautas —crecimiento, reposo, floración y riego— por doce meses, donde cada mes es **pulsable** y cada pulsación sube su intensidad hasta el máximo de la pauta y a la siguiente lo apaga. El crecimiento tiene dos niveles (el segundo es el **crecimiento máximo**, superpuesto al crecimiento), el riego tres (de escaso a abundante), y reposo y floración uno. Los meses consecutivos se envían como **un** periodo; diciembre y enero marcados seguidos, como uno que cruza el fin de año. Como cada mes tiene un solo nivel por pauta, el formulario no puede producir periodos solapados ni un crecimiento máximo fuera del crecimiento. El formulario SHALL explicar cómo se usa la rejilla, conservar lo escrito ante un error del API y precargar el calendario guardado en la edición.

#### Scenario: Elegir exposición con su definición a la vista

- **WHEN** se abre el formulario
- **THEN** cada opción de exposición muestra su definición y ninguna exige un número de horas

#### Scenario: Tres opciones de entorno

- **WHEN** se abre el formulario
- **THEN** el entorno ofrece interior, exterior y ambos, y no ofrece «estacional»

#### Scenario: Calendario como rejilla pulsable

- **WHEN** se abre la sección de crecimiento y floración
- **THEN** muestra una rejilla de cuatro pautas por doce meses cuyas casillas son botones, y ningún selector de periodo

#### Scenario: Marcar y quitar un mes

- **WHEN** se pulsa un mes de la floración, y se vuelve a pulsar
- **THEN** primero queda marcado y después vuelve a quedar sin marcar

#### Scenario: Segundo nivel de crecimiento

- **WHEN** se marcan de marzo a junio en crecimiento y se vuelve a pulsar abril y mayo
- **THEN** abril y mayo muestran el nivel máximo, y se envían un crecimiento de marzo a junio y un crecimiento máximo de abril a mayo

#### Scenario: Una tercera pulsación lo quita todo

- **WHEN** se pulsa tres veces un mes de crecimiento
- **THEN** el mes queda sin crecimiento ni crecimiento máximo

#### Scenario: Intensidad del riego

- **WHEN** se pulsa un mes de riego una, dos y tres veces
- **THEN** pasa por escaso, moderado y abundante, y se envía con esa intensidad

#### Scenario: Periodo que cruza el año

- **WHEN** se marcan noviembre, diciembre, enero y febrero en el reposo
- **THEN** se envía un solo reposo con inicio `11` y fin `2`

#### Scenario: La edición precarga

- **WHEN** se abre la corrección de una especie con calendario y floración
- **THEN** la rejilla muestra sus meses con su intensidad y los datos de floración tal como están guardados

#### Scenario: Error del API sin perder lo escrito

- **WHEN** el API rechaza el guardado
- **THEN** el formulario explica el motivo y conserva todo lo introducido

### Requirement: Mover ejemplares desde la interfaz

La aplicación SHALL permitir **mover ejemplares** a una localización desde dos puntos: la **lista de ejemplares de la ficha de una localización**, seleccionando uno o varios y eligiendo el destino en el árbol —«Mover a…»—, y la edición del ejemplar, donde cambiar la localización sigue siendo un movimiento. Antes de confirmar un movimiento por lote, la pantalla SHALL **declarar cuántos ejemplares se moverán, desde dónde y hacia dónde**, y el destino SHALL NOT poder ser la propia localización de origen, y la confirmación SHALL ser explícita. Al terminar SHALL decir cuántos se movieron y el listado de la localización SHALL reflejarlo sin recargar a mano.

La ficha del ejemplar SHALL mostrar su **historial de movimientos** (origen, destino, fecha); que aparezcan en su cronología unificada queda marcado con **T-20**.

#### Scenario: El lote declara su alcance antes de confirmar

- **WHEN** se seleccionan 12 ejemplares en la ficha de una localización y se elige `Bandeja B1` como destino
- **THEN** la pantalla dice que se moverán 12 ejemplares de la localización de origen a `Bandeja B1`, y no mueve nada hasta que se confirma

#### Scenario: El destino no puede ser el origen

- **WHEN** se elige el destino del movimiento
- **THEN** la propia localización de origen no es una opción

#### Scenario: Cancelar no mueve nada

- **WHEN** se cancela la confirmación
- **THEN** ningún ejemplar cambia de localización ni genera movimiento

#### Scenario: Movimiento hecho

- **WHEN** se confirma el movimiento
- **THEN** se indica cuántos ejemplares se movieron y la ficha de la localización muestra la carga y los movimientos nuevos

#### Scenario: Error del movimiento

- **WHEN** el API rechaza el movimiento
- **THEN** se muestra el error, no se da por hecho el movimiento y la selección se conserva

#### Scenario: Historial en la ficha del ejemplar

- **WHEN** se abre la ficha de un ejemplar que se ha movido
- **THEN** se muestran sus movimientos con origen, destino y fecha, y la cronología unificada aparece marcada con T-20

#### Scenario: Cambiar la localización al editar un ejemplar

- **WHEN** se guarda la edición de un ejemplar con otra localización
- **THEN** el historial de movimientos de la ficha tiene el movimiento nuevo

### Requirement: La ficha muestra la cronología real del ejemplar

La ficha del ejemplar SHALL pintar su cronología desde `GET /plants/{id}/timeline`, con los seis tipos, sin eventos de maqueta. Cada tipo SHALL tener su representación —la lectura con sus medidas y su recomendación, el comentario con su texto, la intervención con sus datos propios, la floración con su intervalo y estado, el cambio de estado con el motivo, el movimiento con origen y destino—, y un tipo desconocido SHALL mostrarse igualmente. El filtro por tipo SHALL pedirse al servidor y SHALL conservarse al cargar más. «Cargar registros anteriores» SHALL añadir la página siguiente sin repetir ni perder eventos y desaparecer al llegar al final. Un evento con `batchId` SHALL indicar que formó parte de una operación sobre varias plantas. Una cronología vacía SHALL decirlo y ofrecer añadir el primer comentario. Si la cronología falla, la ficha SHALL seguir mostrando la planta.

#### Scenario: Todos los tipos en una sola lista

- **WHEN** se abre la ficha de un ejemplar con eventos de los seis tipos
- **THEN** la cronología los muestra juntos, del más reciente al más antiguo, y ninguno está marcado como ejemplo

#### Scenario: Cada tipo con su cuerpo

- **WHEN** la cronología contiene una floración y un comentario
- **THEN** la floración muestra su intervalo y estado, y el comentario su texto

#### Scenario: Filtrar pide al servidor

- **WHEN** se pulsa el filtro «Floración»
- **THEN** se pide la cronología con ese tipo, y la lista y su recuento son los del filtro

#### Scenario: Cargar anteriores conserva el filtro

- **WHEN** hay un filtro activo y se pulsa «Cargar registros anteriores»
- **THEN** se pide la página siguiente con el mismo filtro y se añade sin repetir eventos

#### Scenario: Sin más páginas

- **WHEN** ya se cargó la última página
- **THEN** el botón de cargar anteriores no aparece

#### Scenario: Evento de un lote

- **WHEN** un evento trae `batchId`
- **THEN** su tarjeta dice que fue una operación sobre varias plantas

#### Scenario: Sin eventos

- **WHEN** el ejemplar no tiene ninguno
- **THEN** la cronología lo dice y ofrece añadir un comentario

#### Scenario: Un fallo no tumba la ficha

- **WHEN** la cronología falla
- **THEN** la ficha muestra la planta y un error en el panel del historial

### Requirement: Entran sin recargar

Los eventos nuevos SHALL aparecer en la cronología sin recargar la página: una lectura registrada, un cambio de estado y un comentario, una intervención o una floración creados desde la ficha. Corregir o retirar un evento SHALL actualizarlo o quitarlo en el momento. Con un filtro activo, un evento de otro tipo NO SHALL colarse en la lista filtrada.

#### Scenario: Registrar una lectura

- **WHEN** se registra una lectura
- **THEN** es la primera entrada de la cronología sin recargar

#### Scenario: Cambiar el estado

- **WHEN** se cambia el estado de la planta
- **THEN** el cambio aparece en la cronología

#### Scenario: Con filtro, no se cuela

- **WHEN** el filtro es «Floración» y se anota un comentario
- **THEN** el comentario no aparece en la lista filtrada

### Requirement: Comentarios, intervenciones y floraciones desde la ficha

La ficha SHALL ofrecer «＋ Añadir» con comentario, intervención y floración, cada uno con su formulario en un diálogo. **El comentario** pide texto y permite fijar la fecha; **la intervención** pide el tipo y muestra solo los campos del tipo elegido —maceta en el trasplante, mezcla en el cambio de sustrato, producto en el tratamiento y la fertilización—; **la floración** pide inicio y permite fin, estado, número de flores y notas, con el fin solo cuando está finalizada. Los errores del API SHALL explicarse sin perder lo escrito. Las tarjetas de comentario, intervención y floración SHALL ofrecer corregir y retirar; **retirar SHALL pedir confirmación**, y un comentario corregido SHALL mostrar «editado».

#### Scenario: Elegir el tipo de intervención

- **WHEN** se elige «Trasplante» y luego «Poda»
- **THEN** el campo de maceta aparece solo con el trasplante y el de producto solo con tratamiento y fertilización

#### Scenario: Anotar un comentario

- **WHEN** se escribe un texto y se guarda
- **THEN** el diálogo se cierra y el comentario aparece en la cronología

#### Scenario: Comentario vacío

- **WHEN** se intenta guardar sin texto
- **THEN** el formulario lo señala junto al campo y no envía nada

#### Scenario: Floración abierta y cerrada

- **WHEN** se elige el estado «Finalizada»
- **THEN** el formulario pide la fecha de fin, y con «En flor» no la muestra

#### Scenario: Corregir un comentario

- **WHEN** se corrige y se guarda
- **THEN** la tarjeta muestra el texto nuevo y «editado»

#### Scenario: Retirar con confirmación

- **WHEN** se pulsa retirar
- **THEN** se pide confirmación, y solo al confirmar se retira; cancelar no cambia nada

#### Scenario: Error del API sin perder lo escrito

- **WHEN** el API rechaza el guardado
- **THEN** el diálogo explica el motivo y conserva lo introducido

### Requirement: Pestaña Floración y última floración real

La pestaña «Floración» de la ficha SHALL listar las floraciones **observadas** del ejemplar, la más reciente primero, con su recuento junto al nombre de la pestaña, y permitir registrar una nueva y cerrar o corregir una abierta. «Última floración» de «de un vistazo» SHALL salir de la última floración real —su mes y cuánto duró, o que sigue abierta— y dejar de ser un dato de ejemplo; sin ninguna, SHALL decirlo. Los datos de floración esperada de la especie NO SHALL mezclarse en esta pestaña.

#### Scenario: Listar las floraciones

- **WHEN** se abre la pestaña con tres floraciones
- **THEN** las muestra de la más reciente a la más antigua y la pestaña lleva el número 3

#### Scenario: Última floración real

- **WHEN** la última floración fue de mayo de 2026 y duró 4 días
- **THEN** «de un vistazo» dice «Mayo de 2026» y «Duró 4 días», sin marca de ejemplo

#### Scenario: Floración en curso

- **WHEN** la última floración sigue abierta
- **THEN** «de un vistazo» dice que está en curso

#### Scenario: Sin floraciones

- **WHEN** el ejemplar nunca ha florecido
- **THEN** «de un vistazo» dice que no hay floraciones registradas y la pestaña ofrece registrar la primera

### Requirement: El inventario busca, filtra y ordena como el prototipo

La pantalla `/plants` SHALL reproducir la composición de `data-screen="plants"`: cabecera con el recuento, **barra de herramientas** con la búsqueda, los desplegables Localización, Especie y Estado, «Más filtros» y la configuración de columnas; debajo, los **criterios aplicados** con «Limpiar filtros»; después, la tabla paginada. La caja SHALL decir «Código, apodo o especie» y buscar por `q` tras una pausa. El desplegable de **Especie** SHALL ofrecer las especies reales y dejar de ser maqueta. «Más filtros» SHALL ofrecer exposición y entorno de la especie, además de etiqueta. Cada criterio aplicado SHALL poder retirarse por separado.

#### Scenario: Buscar por apodo

- **WHEN** la persona escribe «suegra» en la caja de búsqueda
- **THEN** tras la pausa la tabla muestra los ejemplares que lo contienen y aparece el criterio «Búsqueda: suegra»

#### Scenario: Filtrar por especie

- **WHEN** elige una especie en el desplegable
- **THEN** la tabla se limita a sus ejemplares y aparece «Especie: …», que se puede quitar

#### Scenario: Más filtros

- **WHEN** abre «Más filtros» y elige una exposición
- **THEN** el filtro se aplica a la especie del ejemplar y aparece como criterio

#### Scenario: Quitar un criterio

- **WHEN** retira el criterio de especie y deja los demás
- **THEN** la tabla recarga sin ese filtro y conserva el resto

#### Scenario: Ningún resultado

- **WHEN** los filtros no admiten ningún ejemplar
- **THEN** la pantalla dice que nada coincide y ofrece limpiar los filtros, sin confundirlo con un inventario vacío

### Requirement: Filtros, orden y columnas del inventario viven en la URL

El estado de `/plants` —los filtros, el orden y las columnas visibles— SHALL reflejarse en la *query string*, y al abrir la pantalla con una URL SHALL reproducirse ese estado. Cambiar un criterio SHALL actualizar la URL sin añadir una entrada de historial por cada tecla. Un parámetro desconocido o inválido en la URL SHALL ignorarse sin romper la pantalla.

#### Scenario: Recargar conserva el estado

- **WHEN** hay un filtro por especie, orden por localización y una columna oculta, y se recarga la página
- **THEN** reaparecen los tres

#### Scenario: Enlace compartido

- **WHEN** se abre `/plants?species=<id>&sort=species,asc`
- **THEN** la tabla ya viene filtrada y ordenada, y el criterio de especie se ve como aplicado

#### Scenario: Parámetro inválido

- **WHEN** la URL trae `?status=resucitada`
- **THEN** la pantalla carga sin ese filtro y no muestra un error

### Requirement: Las columnas ordenan por el API con claves públicas

Las columnas «Planta», «Especie» y «Localización» de `/plants` SHALL ordenar enviando `sort` al API con las claves `nickname`, `species` y `location`; la tabla SHALL NOT reordenar la página en el cliente. Los criterios de orden «Última revisión» (T-20) y «Atención» (T-23) SHALL figurar como **no disponibles, con su ticket**, en el sitio que les corresponde.

#### Scenario: Ordenar por especie

- **WHEN** se pulsa la cabecera «Especie»
- **THEN** se pide `sort=species,asc` y se pinta lo que el API devuelve

#### Scenario: Invertir

- **WHEN** se pulsa otra vez
- **THEN** se pide `sort=species,desc`

#### Scenario: Orden no disponible

- **WHEN** se mira el selector de orden
- **THEN** «Última revisión» y «Atención» aparecen deshabilitados con «T-20» y «T-23»

### Requirement: El catálogo de especies filtra y ordena como el prototipo

La pantalla `/species` SHALL reproducir, en la barra de herramientas de `data-screen="species"`, la búsqueda («Nombre científico, común o código») y los desplegables Exposición, Temperatura y Crecimiento, con los criterios aplicados retirables uno a uno, la nota «Mostrando N de M especies» y el orden por columna enviado al API. Los filtros y el orden SHALL vivir en la URL como en el inventario. La fila de **grupos de cultivo** del prototipo SHALL figurar marcada con el change que la levanta (`vistas-guardadas-y-grupos-de-especies`) y no omitirse. El desplegable «Riego» SHALL figurar como no disponible: el riego orientativo es texto libre.

#### Scenario: Filtrar por exposición

- **WHEN** se elige «Semisombra»
- **THEN** la tabla muestra solo esas especies y la nota dice «Mostrando N de M especies»

#### Scenario: Crecimiento

- **WHEN** se elige un intervalo de meses de crecimiento
- **THEN** se piden `growthMonth` repetidos y se muestran las especies que lo cubren

#### Scenario: Ordenar por nombre científico

- **WHEN** se pulsa la cabecera «Especie»
- **THEN** se pide `sort=scientificName,asc`

#### Scenario: Grupos marcados

- **WHEN** se abre la pantalla
- **THEN** la fila de grupos aparece con su marca y sin simular especies agrupadas

#### Scenario: Estado de la URL

- **WHEN** se recarga con filtros aplicados
- **THEN** se reproducen filtros y orden
