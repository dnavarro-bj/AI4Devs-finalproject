## MODIFIED Requirements

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
