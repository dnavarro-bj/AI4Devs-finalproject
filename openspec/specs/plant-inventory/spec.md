# plant-inventory Specification

## Purpose

Gestión del inventario de plantas a través del API REST: alta de una planta asociada a una especie y una localización del catálogo, consulta del listado y del detalle con los cuidados heredados de su especie, etiquetado con tags y filtrado combinable por tag y localización.

## Requirements

### Requirement: Alta de una planta

El sistema SHALL permitir registrar una planta indicando un nickname, la localización y la especie, referenciadas por su identificador. El nickname es obligatorio y no puede estar en blanco. La planta creada SHALL quedar persistida con su identificador y su fecha de registro, y SHALL aparecer a partir de ese momento en el inventario.

#### Scenario: Planta creada con especie y localización válidas

- **WHEN** se solicita crear una planta con nickname `Bola 1`, una localización existente y una especie existente
- **THEN** la respuesta es `201 Created` e incluye el identificador asignado, el nickname, la localización y la especie indicadas

#### Scenario: La planta creada aparece en el inventario

- **WHEN** se crea una planta y a continuación se consulta el listado de inventario sin filtros
- **THEN** la planta creada está presente en el resultado

#### Scenario: Planta sin nickname

- **WHEN** se solicita crear una planta con el nickname vacío o solo espacios, con especie y localización válidas
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nickname es obligatorio, y no se crea ninguna planta

### Requirement: Validación de las referencias de una planta

El sistema SHALL rechazar el alta **y la edición** de una planta cuya especie o localización no exista, devolviendo un error controlado del cliente que identifique la referencia inválida. En ningún caso SHALL responderse con un error interno del servidor (`5xx`) ante una referencia inexistente. Una referencia inválida en la edición SHALL dejar la planta **exactamente como estaba**: no se aplica ningún cambio parcial, ni siquiera el del apodo.

La referencia a un recurso que viaja en el cuerpo se rechaza con `400`; el `404` queda para el recurso de la dirección (la planta).

#### Scenario: Especie inexistente

- **WHEN** se solicita crear una planta cuyo identificador de especie no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la especie como referencia inválida, y no se crea ninguna planta

#### Scenario: Localización inexistente

- **WHEN** se solicita crear una planta cuyo identificador de localización no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la localización como referencia inválida, y no se crea ninguna planta

#### Scenario: Identificador con formato inválido

- **WHEN** se solicita crear una planta con un identificador de especie que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

#### Scenario: Especie inexistente al editar

- **WHEN** se edita una planta indicando una especie que no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la especie como referencia inválida, y la planta conserva su apodo, su localización y su especie

#### Scenario: Localización inexistente al editar

- **WHEN** se edita una planta indicando una localización que no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la localización como referencia inválida, y la planta no cambia

#### Scenario: Referencia inválida junto a un apodo nuevo

- **WHEN** se edita una planta con un apodo nuevo y una especie inexistente
- **THEN** la respuesta es `400 Bad Request` y el apodo anterior se conserva, porque la edición no se aplica a medias

#### Scenario: Identificador de edición con formato inválido

- **WHEN** se edita una planta con un identificador de localización que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

### Requirement: Detalle de una planta

El sistema SHALL exponer el detalle de una planta por su identificador, incluyendo su nickname, su localización, los tags asignados y los datos de cuidado heredados de su especie: nombre científico, nombre común, rangos de humedad, temperatura y horas de luz, y pauta de riego.

#### Scenario: Detalle con cuidados heredados de la especie

- **WHEN** se consulta el detalle de una planta existente
- **THEN** la respuesta es `200 OK` e incluye el nickname, la localización, los tags asignados y los rangos de humedad, temperatura y horas de luz y la pauta de riego de su especie

#### Scenario: Detalle de una planta sin tags

- **WHEN** se consulta el detalle de una planta a la que no se ha asignado ningún tag
- **THEN** la respuesta es `200 OK` y la lista de tags está vacía

#### Scenario: Planta inexistente

- **WHEN** se consulta el detalle de una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error, y no se produce un error interno del servidor

### Requirement: Edición de una planta

El sistema SHALL permitir modificar una planta ya creada: su apodo, su localización y su especie. La petición es un **reemplazo completo** de esos tres campos —no un parche— y la respuesta SHALL ser el detalle de la planta ya actualizado.

La edición SHALL conservar la identidad del ejemplar: su identificador, su fecha de alta, sus tags, su historial de lecturas de cultivo y los análisis de IA de esas lecturas. **Cambiar la especie SHALL cambiar los cuidados efectivos de la planta** —que se heredan de ella— sin alterar nada de lo anterior. **Cambiar la localización SHALL registrar un movimiento** del sitio anterior al nuevo, según [`plant-movements`](../plant-movements/spec.md). El nombre se almacena sin espacios al principio ni al final, como en el alta.

#### Scenario: Apodo corregido

- **WHEN** se edita una planta enviando un apodo nuevo y conservando su localización y especie
- **THEN** la respuesta es `200 OK` con el apodo nuevo, y el detalle posterior y el listado del inventario lo reflejan

#### Scenario: Apodo con espacios sobrantes

- **WHEN** se edita una planta con el apodo ` Bola 2 `
- **THEN** la planta queda con el apodo `Bola 2`

#### Scenario: Cambio de localización

- **WHEN** se edita una planta indicando otra localización existente
- **THEN** el detalle posterior muestra la localización nueva y el inventario filtrado por la antigua ya no la incluye
- **AND** el historial de movimientos del ejemplar tiene un movimiento de la antigua a la nueva

#### Scenario: Cambio de especie

- **WHEN** se edita una planta indicando otra especie existente
- **THEN** el detalle posterior muestra la especie nueva y los cuidados efectivos de esa especie

#### Scenario: Cambiar la especie conserva la identidad y el historial

- **WHEN** una planta con tags y lecturas de cultivo cambia de especie
- **THEN** conserva su identificador, su fecha de alta, sus tags y todas sus lecturas con sus análisis de IA

#### Scenario: La edición no toca los tags

- **WHEN** se edita una planta que tiene tags
- **THEN** el detalle posterior conserva exactamente los mismos tags, porque su asignación tiene su propio endpoint

#### Scenario: Edición idempotente

- **WHEN** se edita dos veces seguidas una planta con los mismos valores
- **THEN** ambas peticiones terminan con éxito, la planta queda igual y no se registra ningún movimiento

#### Scenario: Apodo en blanco

- **WHEN** se edita una planta con el apodo vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el apodo es obligatorio, y la planta conserva el que tenía

#### Scenario: Edición de una planta inexistente

- **WHEN** se edita una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme, y no se produce un error interno del servidor

### Requirement: Asignación de tags a una planta

El sistema SHALL permitir reemplazar el conjunto completo de tags de una planta a partir de identificadores de tags ya existentes en el catálogo. La asignación SHALL ser idempotente: enviar el mismo conjunto varias veces deja la planta con ese mismo conjunto de tags, sin duplicados. Un conjunto vacío SHALL dejar la planta sin tags.

#### Scenario: Asignación de varios tags

- **WHEN** se asigna a una planta el conjunto de tags `globular` y `pequeño`, ambos existentes en el catálogo
- **THEN** la respuesta es `200 OK` y el detalle posterior de la planta muestra exactamente esos dos tags

#### Scenario: Reemplazo del conjunto de tags

- **WHEN** una planta tiene los tags `globular` y `pequeño` y se le asigna el conjunto formado solo por `híbrido`
- **THEN** el detalle posterior de la planta muestra únicamente el tag `híbrido`

#### Scenario: Vaciado de tags

- **WHEN** una planta tiene tags asignados y se le asigna un conjunto vacío
- **THEN** el detalle posterior de la planta no muestra ningún tag

#### Scenario: Asignación repetida del mismo conjunto

- **WHEN** se asigna dos veces seguidas a una planta el mismo conjunto de tags
- **THEN** ambas peticiones terminan con éxito y la planta queda con ese conjunto de tags sin duplicados

#### Scenario: Tag inexistente

- **WHEN** se asigna a una planta un conjunto que incluye un identificador de tag que no existe en el catálogo
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica el tag inválido, y los tags de la planta no se modifican

#### Scenario: Asignación sobre planta inexistente

- **WHEN** se asignan tags a una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error

### Requirement: Listado del inventario con filtros combinables

El sistema SHALL exponer el listado de plantas del inventario y SHALL admitir dos filtros opcionales, combinables entre sí: por localización, y por tag. El filtro de tag es repetible y su semántica es conjuntiva: solo se devuelven las plantas que tienen **todos** los tags indicados. **El filtro por localización SHALL admitir `includeDescendants=true`, que añade las plantas de todas las sublocalizaciones a cualquier profundidad**; sin él, devuelve solo las directas, como hasta ahora. Sin filtros, el listado SHALL devolver el inventario completo, paginado según el requisito de paginación.

#### Scenario: Listado sin filtros

- **WHEN** se consulta el listado de plantas sin indicar ningún filtro
- **THEN** la respuesta es `200 OK` y su contenido son las plantas del inventario, hasta completar el tamaño de página

#### Scenario: Filtro por localización

- **WHEN** se consulta el listado filtrando por una localización concreta
- **THEN** la respuesta contiene únicamente las plantas registradas directamente en esa localización

#### Scenario: Filtro por localización con descendientes

- **WHEN** se consulta el listado filtrando por `Bancada norte` con `includeDescendants=true`
- **THEN** la respuesta contiene las plantas de la bancada y las de sus bandejas, y su total coincide con el recuento total de la localización

#### Scenario: Filtro por un tag

- **WHEN** se consulta el listado filtrando por el tag `globular`
- **THEN** la respuesta contiene únicamente las plantas que tienen asignado el tag `globular`

#### Scenario: Filtro por varios tags con semántica AND

- **WHEN** se consulta el listado filtrando por los tags `globular` y `pequeño`
- **THEN** la respuesta contiene únicamente las plantas que tienen asignados **ambos** tags, y no las que solo tienen uno de ellos

#### Scenario: Filtros de tag y localización combinados

- **WHEN** se consulta el listado filtrando simultáneamente por el tag `globular` y por la localización `Bandeja A3`
- **THEN** la respuesta contiene únicamente las plantas que tienen el tag `globular` y están en la localización `Bandeja A3`

#### Scenario: Filtro sin coincidencias

- **WHEN** se consulta el listado con una combinación de filtros que ninguna planta satisface
- **THEN** la respuesta es `200 OK`, su contenido está vacío y el total de elementos es `0`

#### Scenario: Filtro por una referencia inexistente

- **WHEN** se consulta el listado filtrando por un identificador de tag o de localización que no existe
- **THEN** la respuesta es `200 OK` con contenido vacío, y no se produce un error interno del servidor

#### Scenario: El total refleja el filtro, no el inventario completo

- **WHEN** el inventario tiene más plantas de las que satisfacen un filtro y se consulta el listado con ese filtro
- **THEN** el total de elementos de la respuesta es el número de plantas que satisfacen el filtro, no el tamaño del inventario

### Requirement: Paginación del listado de inventario

El listado de inventario SHALL devolverse siempre paginado, nunca como una colección completa sin límite. La respuesta SHALL indicar, además del contenido de la página, el total de elementos que satisfacen la consulta, el total de páginas, el número de página devuelto y el tamaño de página aplicado. La página y el tamaño SHALL poder indicarse en la petición; en su ausencia se aplica el tamaño de página por defecto configurado. El tamaño de página solicitado SHALL quedar limitado al máximo configurado.

#### Scenario: Paginación por defecto

- **WHEN** se consulta el listado de plantas sin indicar página ni tamaño
- **THEN** la respuesta devuelve la primera página con el tamaño de página por defecto configurado, e incluye el total de elementos, el total de páginas, el número de página y el tamaño aplicado

#### Scenario: Tamaño de página explícito

- **WHEN** existen 5 plantas y se consulta el listado pidiendo la primera página con tamaño 2
- **THEN** la respuesta contiene 2 plantas, el total de elementos es 5 y el total de páginas es 3

#### Scenario: Página siguiente

- **WHEN** existen 5 plantas y se consulta el listado pidiendo la tercera página con tamaño 2
- **THEN** la respuesta contiene la planta restante y el número de página devuelto es el solicitado

#### Scenario: Página más allá del final

- **WHEN** se solicita una página cuyo índice supera el total de páginas disponibles
- **THEN** la respuesta es `200 OK` con contenido vacío y el total de elementos sigue siendo el real

#### Scenario: Tamaño de página por encima del máximo

- **WHEN** se consulta el listado pidiendo un tamaño de página mayor que el máximo configurado
- **THEN** la respuesta se sirve con el tamaño máximo configurado, y el tamaño de página indicado en la respuesta es ese máximo

#### Scenario: Paginación combinada con filtros

- **WHEN** se consulta el listado con un filtro de tag y un tamaño de página menor que el número de plantas que lo satisfacen
- **THEN** el contenido devuelto se limita al tamaño de página y el total de elementos es el número de plantas que satisfacen el filtro

### Requirement: Identificadores en el contrato del API

Todos los identificadores del API SHALL representarse en JSON como cadenas de texto, tanto en las respuestas como en los cuerpos de petición, para que un cliente JavaScript pueda manejarlos sin pérdida de precisión.

#### Scenario: Identificadores en las respuestas

- **WHEN** se consulta cualquier recurso del inventario o de los catálogos
- **THEN** todos los identificadores presentes en la respuesta son cadenas de texto, no números JSON

#### Scenario: Identificadores en las peticiones

- **WHEN** se crea una planta indicando la especie y la localización mediante identificadores en formato de cadena
- **THEN** la petición se procesa correctamente y la planta queda asociada a esa especie y localización

### Requirement: Formato uniforme de los errores del API

El sistema SHALL responder a los errores del API con un cuerpo JSON de formato uniforme que incluya, como mínimo, el código de estado HTTP y un mensaje legible que describa el problema. Ningún fallo de validación ni referencia inexistente SHALL propagarse como error interno del servidor.

#### Scenario: Error de validación

- **WHEN** una petición se rechaza por un dato obligatorio ausente o inválido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo JSON que contiene el código de estado y un mensaje describiendo el campo o la referencia problemática

#### Scenario: Recurso no encontrado

- **WHEN** una petición referencia por ruta un recurso que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo JSON en el mismo formato de error

### Requirement: Acceso al API desde un origen distinto

El API SHALL ser consumible por un cliente de navegador servido desde un origen distinto al suyo. Para ello SHALL responder a las peticiones de comprobación previa (`OPTIONS`) que el navegador emite antes de una petición con efectos, autorizando cualquier origen y los métodos y cabeceras que el API usa. Esta autorización SHALL aplicarse a todos los endpoints del API, no a un subconjunto, y NO SHALL exigir credenciales: el MVP no tiene autenticación ni cookies de sesión.

#### Scenario: Lectura desde otro origen

- **WHEN** un cliente servido desde un origen distinto solicita el listado de plantas
- **THEN** la respuesta autoriza a ese origen a leerla, y el cliente obtiene el cuerpo del listado

#### Scenario: Comprobación previa de una petición con cuerpo

- **WHEN** un cliente servido desde otro origen emite la comprobación previa de un `POST` con cuerpo JSON sobre cualquier endpoint del API
- **THEN** la respuesta autoriza el método y las cabeceras solicitadas, y la petición posterior se ejecuta con normalidad

#### Scenario: Comprobación previa que no interfiere con el resto del contrato

- **WHEN** se emite una comprobación previa sobre una ruta que el API no expone
- **THEN** la respuesta no es un error interno del servidor (`5xx`)

### Requirement: Código de inventario de una planta

Todo ejemplar SHALL tener un **código de inventario** compuesto por el código de su especie y un **número correlativo propio de esa especie**, con al menos dos cifras: `CAT-GRUSS-01`, `CAT-GRUSS-02`. SHALL asignarse al darlo de alta, ser **único** en toda la colección y viajar en el alta, el detalle y el listado del inventario. El número crece con naturalidad más allá de las dos cifras: tras el 99 viene el 100.

La asignación SHALL ser **segura ante altas simultáneas**: dos ejemplares de la misma especie dados de alta a la vez SHALL obtener códigos distintos y consecutivos, sin repetirse ni dejar huecos por el conflicto. Un número ya asignado **no se reutiliza** nunca.

#### Scenario: Primer ejemplar de una especie

- **WHEN** se da de alta el primer ejemplar de una especie con código `CAT-GRUSS`
- **THEN** la respuesta incluye el código `CAT-GRUSS-01`

#### Scenario: Ejemplares consecutivos

- **WHEN** se dan de alta tres ejemplares seguidos de la misma especie
- **THEN** reciben `CAT-GRUSS-01`, `CAT-GRUSS-02` y `CAT-GRUSS-03`

#### Scenario: Numeración independiente por especie

- **WHEN** se da de alta un ejemplar de otra especie con código `CAT-MAMMI`
- **THEN** recibe `CAT-MAMMI-01`, sin que influya la numeración de la primera especie

#### Scenario: Más de dos cifras

- **WHEN** una especie ya tiene 99 ejemplares y se da de alta otro
- **THEN** el nuevo recibe el código con el número `100`

#### Scenario: Altas simultáneas de la misma especie

- **WHEN** dos ejemplares de la misma especie se dan de alta a la vez
- **THEN** ambas altas terminan con éxito y los códigos son distintos y consecutivos

#### Scenario: El código viaja en el detalle y en el listado

- **WHEN** se consulta el detalle de una planta o el listado del inventario
- **THEN** cada planta incluye su código de inventario

### Requirement: El código de un ejemplar es inmutable

El código de un ejemplar SHALL **no cambiar nunca**: ni al editarlo, ni al cambiarle la especie, ni al corregir el código de su especie. Cambiar la especie de una planta conserva su código aunque ya no coincida con el de su especie actual, porque una etiqueta ya pegada en la maceta tiene que seguir siendo válida.

#### Scenario: Editar el apodo o la localización

- **WHEN** se edita el apodo o la localización de una planta
- **THEN** su código es el mismo que antes

#### Scenario: Cambiar la especie

- **WHEN** se cambia la especie de una planta
- **THEN** conserva su código y el siguiente ejemplar de la especie antigua no lo reutiliza

#### Scenario: El código no se envía al editar

- **WHEN** se edita una planta enviando en el cuerpo un código distinto
- **THEN** el código enviado se ignora y la planta conserva el suyo

### Requirement: Filtro del inventario por código

El listado de plantas SHALL admitir un filtro opcional por **código de inventario**, combinable con el de localización y el de tag y con la paginación. La coincidencia SHALL ser **parcial y sin distinguir mayúsculas ni minúsculas**: el texto buscado puede aparecer en cualquier parte del código, de modo que `gruss` encuentra `CAT-GRUSS-01`. El texto SHALL tratarse como literal: los caracteres que en una consulta de coincidencia valen de comodín no lo son. Un texto vacío o solo de espacios SHALL ignorarse, como si el filtro no se hubiera indicado. Un texto que no coincide con ningún código SHALL devolver una página vacía, nunca un error.

#### Scenario: Búsqueda por el código completo

- **WHEN** se consulta el listado filtrando por el código `CAT-GRUSS-01`
- **THEN** la respuesta contiene la planta con ese código

#### Scenario: Búsqueda parcial sin distinguir mayúsculas

- **WHEN** se consulta el listado filtrando por `gruss`
- **THEN** la respuesta contiene las plantas cuyo código incluye `GRUSS`, y no las de otras especies

#### Scenario: Búsqueda por el prefijo de una especie

- **WHEN** se consulta el listado filtrando por `CAT-GRUSS-`
- **THEN** la respuesta contiene todos los ejemplares de esa especie y ninguno de otra

#### Scenario: Combinado con otros filtros

- **WHEN** se filtra por código y por localización a la vez
- **THEN** la respuesta contiene solo las plantas que cumplen las dos condiciones

#### Scenario: Texto vacío

- **WHEN** se consulta el listado con el filtro de código vacío o en blanco
- **THEN** la respuesta es el listado completo, como sin filtro

#### Scenario: Sin coincidencias

- **WHEN** se filtra por un texto que no está en ningún código
- **THEN** la respuesta es `200 OK` con una página vacía y el total a cero

#### Scenario: Los comodines se buscan como texto

- **WHEN** se filtra por `%` o por `_`
- **THEN** la respuesta no contiene plantas, porque ningún código contiene esos caracteres

#### Scenario: Paginado

- **WHEN** el filtro por código coincide con más plantas que el tamaño de página
- **THEN** la respuesta declara el total de coincidencias y el resto llega en las páginas siguientes

### Requirement: Ficha ampliada del ejemplar

El sistema SHALL permitir indicar, al dar de alta y al editar un ejemplar, una **descripción**, el **año y el mes de germinación**, la **fecha de adquisición**, la **procedencia** —de una lista cerrada: vivero, intercambio, germinación propia, compra, regalo u otro— y una **nota** de procedencia. Todos son opcionales y SHALL viajar en el alta, el detalle y la edición; la edición, al ser reemplazo completo, SHALL borrar los que no se envíen.

La germinación SHALL admitir **año sin mes**, y SHALL rechazar un mes sin año y un mes fuera de 1 a 12 con `400 Bad Request`. Nunca se inventa un día ni un mes. La descripción y la nota se almacenan sin espacios al principio ni al final y, en blanco, equivalen a ausentes.

#### Scenario: Alta con la ficha completa

- **WHEN** se da de alta un ejemplar con descripción, germinación en abril de 2021, adquisición y procedencia `intercambio` con su nota
- **THEN** la respuesta es `201 Created` e incluye todos esos datos tal y como se enviaron

#### Scenario: Germinación solo con el año

- **WHEN** se guarda un ejemplar con año de germinación 2021 y sin mes
- **THEN** la respuesta lo devuelve con el año y sin mes, sin ningún mes inventado

#### Scenario: Mes sin año

- **WHEN** se intenta guardar un ejemplar con mes de germinación y sin año
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que lo explica, y no se guarda nada

#### Scenario: Mes fuera de rango

- **WHEN** se intenta guardar un ejemplar con mes de germinación 13
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Procedencia fuera de la lista

- **WHEN** se intenta guardar un ejemplar con una procedencia que no es de la lista
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

#### Scenario: Ejemplar sin ficha ampliada

- **WHEN** se da de alta un ejemplar sin ninguno de los campos opcionales
- **THEN** se crea y los campos opcionales se devuelven ausentes

#### Scenario: Edición con reemplazo completo

- **WHEN** se edita un ejemplar sin enviar la descripción que tenía
- **THEN** la descripción queda ausente

#### Scenario: Texto en blanco

- **WHEN** se guarda un ejemplar con la descripción en blanco
- **THEN** la descripción queda ausente

### Requirement: Estado de un ejemplar

Todo ejemplar SHALL tener un **estado**, uno de siete: `activa`, `cuarentena` y `enferma` —**en curso**— y `cedida`, `vendida`, `muerta` y `perdida` —**finales**—. Al darlo de alta SHALL ser `activa` si no se indica otro, y solo puede nacer en un estado en curso. El estado SHALL viajar en el alta, el detalle y el listado. La edición de la ficha (`PUT /plants/{id}`) SHALL NO cambiar el estado: tiene su propia operación, que deja constancia.

Un ejemplar en un estado final **no desaparece**: sigue existiendo, con su código y su historial.

#### Scenario: Estado por defecto

- **WHEN** se da de alta un ejemplar sin indicar estado
- **THEN** queda `activa`

#### Scenario: Estado inicial en curso

- **WHEN** se da de alta un ejemplar indicando `cuarentena`
- **THEN** queda en cuarentena y no hay ningún cambio de estado registrado

#### Scenario: No se puede nacer en un estado final

- **WHEN** se intenta dar de alta un ejemplar con estado `muerta`
- **THEN** la respuesta es `400 Bad Request` y no se crea ninguna planta

#### Scenario: Estado inexistente

- **WHEN** se intenta dar de alta o cambiar un ejemplar a un estado que no existe
- **THEN** la respuesta es `400 Bad Request`, no un error interno

#### Scenario: Editar la ficha no cambia el estado

- **WHEN** se edita un ejemplar enviando en el cuerpo un estado distinto
- **THEN** el estado enviado se ignora y el ejemplar conserva el suyo

#### Scenario: Un ejemplar archivado sigue consultable

- **WHEN** se consulta el detalle de un ejemplar `muerta`
- **THEN** la respuesta es `200 OK` con su código, su ficha y su estado

### Requirement: Cambio de estado y su historial

El sistema SHALL permitir cambiar el estado de un ejemplar con `PUT /plants/{id}/status`, indicando el estado nuevo y, opcionalmente, un **motivo**, y SHALL dejar constancia de cada cambio con el estado anterior, el nuevo, el motivo y **el instante en que ocurrió**. Las transiciones válidas son:

* entre estados **en curso**, cualquiera a cualquiera;
* de un estado en curso a uno **final**;
* de un estado **final** solo a `activa`, y en ese caso el **motivo es obligatorio**, porque es una corrección y no una resurrección silenciosa.

Cualquier otra transición, y pasar al estado que ya se tiene, SHALL rechazarse con `409 Conflict` explicando por qué, sin cambiar nada. `GET /plants/{id}/status-changes` SHALL devolver el historial **paginado, del más reciente al más antiguo**.

#### Scenario: Cambio entre estados en curso

- **WHEN** un ejemplar activo pasa a `cuarentena`
- **THEN** la respuesta es `200 OK` con el estado nuevo y el historial tiene un cambio de `activa` a `cuarentena` con su fecha

#### Scenario: Paso a un estado final

- **WHEN** un ejemplar activo pasa a `vendida` con el motivo `Vendida a un coleccionista`
- **THEN** queda `vendida` y el historial guarda el cambio con su motivo

#### Scenario: Motivo opcional

- **WHEN** un ejemplar pasa de `activa` a `enferma` sin motivo
- **THEN** el cambio se acepta y se registra sin motivo

#### Scenario: Corrección desde un estado final

- **WHEN** un ejemplar `muerta` vuelve a `activa` indicando el motivo `Era un error al marcarla`
- **THEN** queda `activa` y el historial conserva los dos cambios

#### Scenario: Corrección sin motivo

- **WHEN** se intenta volver a `activa` desde un estado final sin motivo
- **THEN** la respuesta es `400 Bad Request` que pide el motivo, y el ejemplar conserva su estado

#### Scenario: Transición no permitida

- **WHEN** se intenta pasar de `muerta` a `vendida`
- **THEN** la respuesta es `409 Conflict` explicando que desde un estado final solo se vuelve a `activa`, y el ejemplar no cambia

#### Scenario: Mismo estado

- **WHEN** se intenta pasar a un ejemplar al estado que ya tiene
- **THEN** la respuesta es `409 Conflict` y no se registra ningún cambio

#### Scenario: Ejemplar inexistente

- **WHEN** se cambia el estado de un ejemplar que no existe
- **THEN** la respuesta es `404 Not Found`

#### Scenario: Historial ordenado y paginado

- **WHEN** se consulta el historial de un ejemplar con varios cambios
- **THEN** la respuesta es el envelope paginado, del cambio más reciente al más antiguo, y un ejemplar sin cambios devuelve una página vacía

#### Scenario: El código no cambia con el estado

- **WHEN** un ejemplar pasa a un estado final y vuelve a `activa`
- **THEN** conserva el mismo código y no se asigna ninguno nuevo

### Requirement: Inventario por estado

El listado del inventario SHALL **no mezclar lo que está en curso con lo archivado**: sin filtro de estado devuelve solo los ejemplares en estado en curso. El filtro `status` SHALL ser repetible y devolver los ejemplares en **cualquiera** de los estados indicados, finales incluidos; un estado inexistente SHALL responder `400 Bad Request`. Se combina con el resto de filtros y con la paginación.

#### Scenario: Sin filtro, solo lo que está en curso

- **WHEN** existen ejemplares activos y uno vendido y se consulta el listado sin filtro de estado
- **THEN** la respuesta contiene los activos y no el vendido

#### Scenario: Pedir un estado final

- **WHEN** se consulta el listado con el filtro `status=vendida`
- **THEN** la respuesta contiene el ejemplar vendido y ninguno en curso

#### Scenario: Varios estados

- **WHEN** se consulta el listado con `status=activa` y `status=muerta`
- **THEN** la respuesta contiene los ejemplares activos y los muertos

#### Scenario: Estado inexistente

- **WHEN** se consulta el listado con un estado que no existe
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Combinado con otros filtros

- **WHEN** se filtra por estado y por localización
- **THEN** la respuesta cumple las dos condiciones

#### Scenario: El total refleja el filtro

- **WHEN** se consulta el listado sin filtro de estado
- **THEN** el total de elementos del envelope cuenta solo los ejemplares en curso

### Requirement: Cuidados propios del ejemplar

El sistema SHALL permitir que un ejemplar **sobrescriba** valores de la pauta de su especie: los rangos de humedad, de temperatura y de horas de luz, la pauta de riego y la mezcla de sustrato. Cada valor es independiente y **opcional**: lo que no se sobrescribe se hereda. Se indican en el objeto opcional `careOverrides` del alta y de la edición; la edición es **reemplazo completo**, de modo que los valores que no se envíen vuelven a heredarse y no enviar el objeto quita todos los cuidados propios.

El detalle del ejemplar SHALL devolver `careOverrides` —solo los valores que sobrescribe, y ausente si no tiene ninguno— y `effectiveCare`, el **perfil que se aplica**: el valor propio donde lo hay y el de la especie donde no, junto con la lista de los campos que se apartan de la especie. El cliente no tiene que combinar nada.

#### Scenario: Sobrescribir un solo valor

- **WHEN** se edita un ejemplar sobrescribiendo solo la pauta de riego
- **THEN** el perfil efectivo usa esa pauta, y la humedad, la temperatura, la luz y el sustrato siguen siendo los de la especie

#### Scenario: El perfil efectivo dice qué se aparta

- **WHEN** se consulta un ejemplar que sobrescribe el máximo de temperatura y el sustrato
- **THEN** la respuesta lista exactamente esos dos campos como propios, y el resto como heredados

#### Scenario: Sin cuidados propios

- **WHEN** se consulta un ejemplar que no sobrescribe nada
- **THEN** `careOverrides` está ausente y el perfil efectivo es el de su especie, sin campos propios

#### Scenario: Sobrescribir no altera el resto

- **WHEN** se sobrescribe la humedad de un ejemplar
- **THEN** la temperatura, la luz, el riego y el sustrato efectivos no cambian

#### Scenario: La pauta de la especie cambia lo heredado

- **WHEN** se actualiza la pauta de riego de una especie y un ejemplar suyo no la sobrescribe
- **THEN** el perfil efectivo de ese ejemplar refleja la pauta nueva

#### Scenario: La pauta de la especie no pisa lo propio

- **WHEN** se actualiza la pauta de riego de una especie y un ejemplar suyo la sobrescribe
- **THEN** el perfil efectivo de ese ejemplar conserva su valor propio

#### Scenario: Reemplazo completo

- **WHEN** se edita un ejemplar con la humedad propia sobrescrita enviando solo la temperatura
- **THEN** la humedad vuelve a heredarse y la temperatura queda sobrescrita

#### Scenario: Quitar todos los cuidados propios

- **WHEN** se edita un ejemplar sin enviar `careOverrides`
- **THEN** el ejemplar vuelve a heredar toda la pauta de su especie

#### Scenario: Mezcla de sustrato propia inexistente

- **WHEN** se sobrescribe la mezcla de sustrato con un identificador que no existe
- **THEN** la respuesta es `400 Bad Request` identificando la mezcla como referencia inválida, y el ejemplar no cambia

### Requirement: Coherencia del perfil efectivo

Los cuidados propios SHALL ser **coherentes con la especie**: el perfil efectivo resultante cumple las mismas reglas que una especie —en cada rango, el mínimo no supera al máximo—, y la humedad está entre 0 y 100 y la luz entre 0 y 24 horas. Sobrescribir solo un extremo se juzga contra el otro extremo **que se aplicaría**: si no está sobrescrito, el de la especie. Un perfil incoherente SHALL rechazarse con `400 Bad Request` explicando qué rango falla, sin cambiar nada del ejemplar.

#### Scenario: Mínimo propio por encima del máximo heredado

- **WHEN** se sobrescribe la humedad mínima con un valor superior al máximo de la especie
- **THEN** la respuesta es `400 Bad Request` indicando el rango de humedad, y el ejemplar no cambia

#### Scenario: Máximo propio por debajo del mínimo heredado

- **WHEN** se sobrescribe la temperatura máxima con un valor inferior al mínimo de la especie
- **THEN** la respuesta es `400 Bad Request` indicando el rango de temperatura

#### Scenario: Los dos extremos propios coherentes entre sí

- **WHEN** se sobrescriben a la vez el mínimo y el máximo de luz con un rango válido que se aparta de la especie
- **THEN** la respuesta es `200 OK` y el perfil efectivo usa ese rango

#### Scenario: Los dos extremos propios incoherentes

- **WHEN** se sobrescriben a la vez un mínimo de luz superior al máximo propio
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Valores fuera de escala

- **WHEN** se sobrescribe la humedad con 120 o las horas de luz con 30
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Una edición incoherente no cambia nada, ni siquiera el apodo

- **WHEN** se edita un ejemplar con un apodo nuevo y unos cuidados propios incoherentes
- **THEN** la respuesta es `400 Bad Request` y el apodo anterior se conserva

### Requirement: Cambiar la especie conserva los cuidados propios

Cambiar la especie de un ejemplar SHALL **conservar sus cuidados propios**: son decisiones sobre esa planta, no sobre su especie. Los valores no sobrescritos pasan a heredarse de la especie nueva. Si los valores propios ya **no encajan** con la especie nueva —el perfil efectivo sería incoherente—, el cambio SHALL rechazarse con `400 Bad Request` explicando el conflicto, sin cambiar nada.

#### Scenario: La herencia pasa a la especie nueva

- **WHEN** un ejemplar sin cuidados propios cambia de especie
- **THEN** su perfil efectivo es el de la especie nueva

#### Scenario: Lo propio se conserva

- **WHEN** un ejemplar que sobrescribe la pauta de riego cambia de especie
- **THEN** conserva su pauta de riego propia y hereda el resto de la especie nueva

#### Scenario: Valores propios que no encajan con la especie nueva

- **WHEN** un ejemplar con una humedad mínima propia de 60 cambia a una especie cuya humedad máxima es 40
- **THEN** la respuesta es `400 Bad Request` explicando que sus cuidados propios no encajan con la especie nueva, y el ejemplar conserva la suya
