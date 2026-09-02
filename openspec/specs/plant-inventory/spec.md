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

El sistema SHALL rechazar el alta de una planta cuya especie o localización no exista, devolviendo un error controlado del cliente que identifique la referencia inválida. En ningún caso SHALL responderse con un error interno del servidor (`5xx`) ante una referencia inexistente.

#### Scenario: Especie inexistente

- **WHEN** se solicita crear una planta cuyo identificador de especie no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la especie como referencia inválida, y no se crea ninguna planta

#### Scenario: Localización inexistente

- **WHEN** se solicita crear una planta cuyo identificador de localización no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la localización como referencia inválida, y no se crea ninguna planta

#### Scenario: Identificador con formato inválido

- **WHEN** se solicita crear una planta con un identificador de especie que no es un identificador válido
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

El sistema SHALL exponer el listado de plantas del inventario y SHALL admitir dos filtros opcionales, combinables entre sí: por localización, y por tag. El filtro de tag es repetible y su semántica es conjuntiva: solo se devuelven las plantas que tienen **todos** los tags indicados. Sin filtros, el listado SHALL devolver el inventario completo, paginado según el requisito de paginación.

#### Scenario: Listado sin filtros

- **WHEN** se consulta el listado de plantas sin indicar ningún filtro
- **THEN** la respuesta es `200 OK` y su contenido son las plantas del inventario, hasta completar el tamaño de página

#### Scenario: Filtro por localización

- **WHEN** se consulta el listado filtrando por una localización concreta
- **THEN** la respuesta contiene únicamente las plantas registradas en esa localización

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
