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

El mapa SHALL presentar las localizaciones como **árbol recorrible**, cada una con su nombre y la carga que soporta, encabezado por la colección completa; no como una tabla de filas sueltas. La vista general SHALL presentar cada localización como **tarjeta de zona** con su carga expresada además como **proporción ocupada**, y SHALL ofrecer salida al inventario completo.

Mientras el esquema sea plano, el árbol SHALL mostrar las localizaciones colgando de la colección completa, y la ausencia de niveles SHALL declararse con su ticket en el propio mapa, en lugar de sustituir el mapa por otra cosa.

#### Scenario: El catálogo es un mapa, no una lista

- **WHEN** se abre el catálogo con localizaciones registradas
- **THEN** se muestran el mapa del vivero como árbol y la vista general con una tarjeta por localización

#### Scenario: Cada localización dice la carga que soporta

- **WHEN** se muestra una localización, en el mapa o como tarjeta
- **THEN** aparece cuántos ejemplares alberga, y en la tarjeta también como proporción ocupada

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
- **THEN** la jerarquía del prototipo —zonas, bancadas y bandejas— aparece marcada con su ticket dentro del propio mapa

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el mapa no aparece a medias

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su identidad y sus acciones; **fila de métricas** del espacio; columna principal con lo que contiene y los ejemplares que alberga; y columna lateral con las características del espacio, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta**, que es lo que identifica una localización, y las métricas SHALL presentarse como **cifras destacadas** con su matiz —no como una lista de campos—, porque son la respuesta a «cuánto hay aquí y cuánto trabajo tiene».

Lo que el prototipo muestra y el API todavía no sirve —la jerarquía y la ruta completa, el código del espacio, las características, los movimientos, las tareas y las alertas— SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

#### Scenario: Ficha con ejemplares

- **WHEN** se abre la ficha de una localización que alberga ejemplares
- **THEN** se muestran su portada, sus métricas y esos ejemplares, cada uno navegable a su ficha
- **AND** se ofrece ver el inventario filtrado por esa localización

#### Scenario: Las métricas abren la pantalla

- **WHEN** se abre la ficha
- **THEN** cuántos ejemplares alberga aparece como cifra destacada junto al resto de métricas del espacio

#### Scenario: Ficha de una localización vacía

- **WHEN** se abre la ficha de una localización sin ejemplares
- **THEN** se indica que está vacía y se ofrece retirarla

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre la ficha de una localización
- **THEN** la jerarquía, el código del espacio, las características, los movimientos y las tareas aparecen marcados con su ticket, cada uno en el bloque del layout que ocupan en el prototipo

#### Scenario: Localización inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la localización no existe, con salida al catálogo, y no una pantalla en blanco

### Requirement: Administración de una localización

La aplicación SHALL permitir crear una localización, corregir su nombre y retirarla desde su ficha. La retirada SHALL confirmarse, y un `409` del API SHALL explicarse por lo que significa —la localización alberga ejemplares— y no como un fallo genérico.

#### Scenario: Alta de una localización

- **WHEN** se crea una localización con su nombre
- **THEN** aparece en el catálogo y queda disponible para asignar a un ejemplar

#### Scenario: Nombre corregido

- **WHEN** se corrige el nombre de una localización desde su ficha
- **THEN** la ficha refleja el nombre nuevo y los ejemplares que alberga no cambian

#### Scenario: Retirada confirmada

- **WHEN** se retira una localización vacía y se confirma
- **THEN** se vuelve al catálogo y la localización ya no aparece

#### Scenario: Retirada bloqueada por uso

- **WHEN** se intenta retirar una localización que alberga ejemplares
- **THEN** se explica que no puede retirarse mientras albergue ejemplares, indicando cuántos son
- **AND** se ofrece ver esos ejemplares para moverlos, en lugar de dejar la acción sin salida

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
