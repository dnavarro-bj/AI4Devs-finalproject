# catalogs Specification

## Purpose

Catálogos de soporte reutilizables del inventario —localizaciones y tags— expuestos como API REST, para que las plantas se clasifiquen mediante valores seleccionables y consistentes en lugar de texto libre.

## Requirements

### Requirement: Alta de localizaciones

El sistema SHALL permitir crear una localización indicando su **nombre**, su **código** y, opcionalmente, la **localización que la contiene** (`parentId`), y SHALL devolver la localización creada con su identificador. Una localización sin padre es una **raíz**: el catálogo plano anterior es el caso de un solo nivel.

Además SHALL admitir, todos opcionales: descripción, tipo (`bancada`, `bandeja`, `invernadero`, `zona_exterior`, `estanteria`, `otro`), capacidad orientativa (entero positivo), notas operativas, entorno (`interior`, `cubierto`, `exterior`) y exposición (`sombra`, `semisombra`, `soleado`, `pleno_sol`). El nombre y el código son obligatorios, no pueden estar en blanco y se guardan sin espacios al principio ni al final. El **código es único sin distinguir mayúsculas**. Un valor fuera del vocabulario, una capacidad no positiva o un padre inexistente SHALL responder `400`, nunca `500`.

#### Scenario: Localización creada correctamente

- **WHEN** se solicita crear una localización con el nombre `Invernadero 1` y el código `LOC-I1`
- **THEN** la respuesta es `201 Created`, incluye el identificador asignado, el nombre, el código, y no tiene padre

#### Scenario: Localización creada dentro de otra

- **WHEN** se crea `Bancada norte` indicando como padre a `Invernadero 1`
- **THEN** la respuesta es `201 Created` y su ruta es `Invernadero 1 / Bancada norte`

#### Scenario: Localización con su ficha completa

- **WHEN** se crea una localización con tipo `bancada`, capacidad `250`, entorno `cubierto`, exposición `semisombra` y notas operativas
- **THEN** la consulta posterior devuelve esos valores

#### Scenario: Localización sin nombre

- **WHEN** se solicita crear una localización con el nombre vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nombre es obligatorio, y no se crea ninguna localización

#### Scenario: Localización sin código

- **WHEN** se solicita crear una localización con el código vacío o ausente
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el código es obligatorio

#### Scenario: Código ya usado

- **WHEN** se crea una localización con el código `loc-i1` existiendo `LOC-I1`
- **THEN** la respuesta es `409 Conflict` con el cuerpo de error uniforme y no se crea nada

#### Scenario: Padre inexistente

- **WHEN** se crea una localización con un `parentId` que no existe
- **THEN** la respuesta es `400 Bad Request` con el cuerpo de error uniforme

#### Scenario: Valor fuera del vocabulario o capacidad no positiva

- **WHEN** se crea una localización con tipo `almacen`, o con capacidad `0`
- **THEN** la respuesta es `400 Bad Request`, no un error interno

### Requirement: Listado de localizaciones

El sistema SHALL exponer el catálogo de localizaciones registradas, de forma que puedan seleccionarse al registrar una planta y que el frontend pueda montar el árbol. Cada fila SHALL incluir su `parentId`, su **ruta completa**, su código, su tipo y su capacidad, y **cuántos ejemplares alberga**: los **directos** y los **totales**, contando los de todos sus descendientes.

Los recuentos y la ruta SHALL resolverse **sin una consulta por fila**: con un número de consultas independiente del de filas de la página. Son el dato sobre el que se apoya el mapa del vivero —una localización sin su carga no dice nada—, así que servirlos es más barato que recortar la pantalla. El listado SHALL admitir filtrar por `parentId` para pedir los hijos de un nodo, y por `root=true` para pedir solo las raíces.

#### Scenario: Catálogo con localizaciones

- **WHEN** existen `Invernadero 1` y, dentro, `Bancada norte`, y se consulta el catálogo
- **THEN** la respuesta es `200 OK` y contiene ambas con su identificador, nombre, código, padre, ruta y recuentos

#### Scenario: Localización recién creada aparece en el catálogo

- **WHEN** se crea una localización y a continuación se consulta el catálogo
- **THEN** la localización creada está presente, con cero ejemplares directos y cero totales

#### Scenario: El recuento total incluye a los descendientes

- **WHEN** `Bancada norte` tiene 4 ejemplares, y sus dos bandejas 31 y 27
- **THEN** `Bancada norte` figura con 4 directos y 62 totales, y cada bandeja con los suyos

#### Scenario: La ruta completa de cada fila

- **WHEN** `Bandeja A3` cuelga de `Bancada norte`, que cuelga de `Invernadero 1`
- **THEN** su ruta es `Invernadero 1 / Bancada norte / Bandeja A3`

#### Scenario: Los hijos de un nodo o solo las raíces

- **WHEN** se consulta el catálogo con `parentId` de `Invernadero 1`, o con `root=true`
- **THEN** la respuesta contiene respectivamente solo sus hijos directos o solo las localizaciones sin padre

#### Scenario: El recuento no multiplica las consultas

- **WHEN** se consulta una página del catálogo con varias localizaciones a distinta profundidad
- **THEN** recuentos y rutas se obtienen con un número de consultas que no depende del de filas

### Requirement: Consulta de una localización con su uso

El sistema SHALL exponer la consulta de una localización por su identificador, con todos sus campos, su **ruta completa** como lista de ancestros (identificador y nombre, de la raíz hacia abajo, para los breadcrumbs), sus **sublocalizaciones directas** —cada una con su recuento directo y total— y **cuántos ejemplares alberga**, directos y totales. Una localización inexistente SHALL responder `404`.

#### Scenario: Consulta de una localización

- **WHEN** se consulta una localización existente por su identificador
- **THEN** la respuesta incluye su nombre, su código, sus campos opcionales, su ruta y el número de ejemplares que alberga, directos y totales

#### Scenario: Ruta como lista de ancestros

- **WHEN** se consulta `Bandeja A3`, dentro de `Bancada norte`, dentro de `Invernadero 1`
- **THEN** su lista de ancestros es `Invernadero 1`, `Bancada norte`, en ese orden, cada uno con su identificador

#### Scenario: Sublocalizaciones

- **WHEN** se consulta `Bancada norte`, con dos bandejas
- **THEN** la respuesta lista las dos bandejas con su recuento directo y total

#### Scenario: Localización vacía

- **WHEN** se consulta una localización sin ningún ejemplar ni sublocalización
- **THEN** la respuesta indica cero ejemplares y una lista vacía de sublocalizaciones, no las omite

#### Scenario: Localización inexistente

- **WHEN** se consulta un identificador que no corresponde a ninguna localización
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

### Requirement: Edición de una localización

El sistema SHALL permitir modificar una localización existente. La petición es un **reemplazo completo** de nombre, código, padre y campos opcionales —no un parche— y la respuesta SHALL ser la localización ya actualizada. La edición SHALL ser **sin efecto sobre los ejemplares**: siguen siendo los mismos, conservan su identificador y su localización. **Cambiar el padre mueve la localización con todo su contenido** sin tocar a nadie más: su ruta y los recuentos de sus ancestros se recalculan solos y no se registra ningún movimiento de ejemplares, porque ninguno cambia de localización.

Un nombre o un código en blanco SHALL responder `400`, un código ya usado por otra localización `409`, y un padre inexistente `400`. **Hacer a una localización hija de sí misma o de cualquiera de sus descendientes SHALL rechazarse con `409 Conflict`** explicándolo, sin cambiar nada.

#### Scenario: Localización renombrada

- **WHEN** se corrige el nombre de una localización
- **THEN** la respuesta refleja el nombre nuevo, los ejemplares que alberga no cambian y la ruta de sus descendientes lo muestra

#### Scenario: Código corregido

- **WHEN** se cambia el código de una localización con ejemplares y sublocalizaciones
- **THEN** la respuesta refleja el código nuevo y todo lo demás sigue igual

#### Scenario: Mover una localización con contenido

- **WHEN** `Bancada norte`, con dos bandejas y 62 ejemplares, pasa de `Invernadero 1` a `Invernadero 2`
- **THEN** la ruta de la bancada y de sus bandejas cuelga de `Invernadero 2`, los recuentos totales de ambos invernaderos cambian en consecuencia y ningún ejemplar cambia de localización ni genera movimiento

#### Scenario: Ser su propio padre

- **WHEN** se edita una localización indicándose a sí misma como padre
- **THEN** la respuesta es `409 Conflict` con el cuerpo de error uniforme y la localización conserva su padre

#### Scenario: Ser hija de un descendiente

- **WHEN** se edita `Invernadero 1` indicando como padre a `Bandeja A3`, que desciende de ella
- **THEN** la respuesta es `409 Conflict` y la jerarquía no cambia

#### Scenario: Pasar a raíz

- **WHEN** se edita una localización con padre sin indicar padre
- **THEN** pasa a ser una raíz

#### Scenario: Nombre en blanco

- **WHEN** se intenta dejar el nombre de una localización vacío o solo con espacios
- **THEN** la respuesta es `400 Bad Request` con el cuerpo de error uniforme, no un `500`

#### Scenario: Código de otra localización

- **WHEN** se intenta usar el código de otra localización
- **THEN** la respuesta es `409 Conflict` y la localización conserva el suyo

#### Scenario: Localización inexistente

- **WHEN** se intenta modificar una localización que no existe
- **THEN** la respuesta es `404 Not Found`

### Requirement: Retirada de una localización

El sistema SHALL permitir retirar una localización **que no albergue ningún ejemplar ni contenga otras localizaciones**. Una localización con ejemplares directos, o con sublocalizaciones —aunque estén vacías—, SHALL responder `409` y seguir existiendo: la planta no puede quedarse sin sitio y la jerarquía no puede quedarse sin padre. El mensaje SHALL decir cuál de las dos cosas lo impide.

El historial de movimientos no impide la retirada de una localización vacía si ningún movimiento la referencia; **una localización que aparece en movimientos SHALL responder `409`** para no dejar el historial sin origen o destino.

#### Scenario: Retirada de una localización vacía

- **WHEN** se retira una localización que no alberga ningún ejemplar ni tiene hijas ni aparece en movimientos
- **THEN** la operación se acepta y la localización deja de aparecer en el catálogo

#### Scenario: Retirada de una localización con ejemplares

- **WHEN** se intenta retirar una localización que alberga al menos un ejemplar
- **THEN** la respuesta es `409 Conflict` con el cuerpo de error uniforme
- **AND** la localización sigue existiendo y sus ejemplares conservan su localización

#### Scenario: Retirada de una localización con sublocalizaciones

- **WHEN** se intenta retirar una localización sin ejemplares directos pero con una sublocalización
- **THEN** la respuesta es `409 Conflict`, el mensaje habla de sublocalizaciones, y nada cambia

#### Scenario: Retirada de una localización con movimientos

- **WHEN** se intenta retirar una localización vacía que fue origen o destino de algún movimiento
- **THEN** la respuesta es `409 Conflict` y el historial conserva su origen y destino

#### Scenario: Retirada de una localización inexistente

- **WHEN** se intenta retirar un identificador que no corresponde a ninguna localización
- **THEN** la respuesta es `404 Not Found`

### Requirement: Alta de tags con nombre normalizado

El sistema SHALL permitir crear un tag indicando su nombre, almacenándolo sin espacios al principio ni al final. El nombre es obligatorio y no puede estar en blanco.

#### Scenario: Tag creado correctamente

- **WHEN** se solicita crear un tag con el nombre `globular`
- **THEN** la respuesta es `201 Created` e incluye el identificador asignado y el nombre `globular`

#### Scenario: Nombre con espacios sobrantes

- **WHEN** se solicita crear un tag con el nombre ` globular `
- **THEN** el tag queda registrado con el nombre `globular`

#### Scenario: Tag sin nombre

- **WHEN** se solicita crear un tag con el nombre vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el nombre es obligatorio, y no se crea ningún tag

### Requirement: Unicidad de los nombres de tag en el catálogo

El sistema SHALL rechazar la creación de un tag cuyo nombre ya exista en el catálogo, considerando iguales los nombres que solo difieren en mayúsculas/minúsculas o en espacios al principio y al final. El rechazo SHALL ser un error controlado del cliente, nunca un error interno del servidor.

#### Scenario: Tag duplicado exacto

- **WHEN** existe el tag `globular` y se solicita crear otro tag `globular`
- **THEN** la respuesta es `409 Conflict` con un cuerpo de error que indica que el tag ya existe, y el catálogo sigue teniendo un único tag `globular`

#### Scenario: Tag duplicado con distinta capitalización o espacios

- **WHEN** existe el tag `globular` y se solicita crear el tag ` Globular `
- **THEN** la respuesta es `409 Conflict` y no se crea un segundo tag

### Requirement: Listado de tags

El sistema SHALL exponer el catálogo de tags registrados, de forma que puedan asignarse a una planta, y SHALL incluir en cada fila **cuántas plantas la tienen**.

El recuento SHALL resolverse en **una sola consulta** para toda la página, no con una consulta por fila: el catálogo existe para decidir qué etiquetas sobran y cuáles se combinan, y esa decisión se toma comparando usos.

#### Scenario: Catálogo con tags

- **WHEN** existen tags registrados y se consulta el catálogo
- **THEN** la respuesta es `200 OK` y contiene cada tag con su identificador, su nombre y su número de plantas

#### Scenario: Tag sin uso en el listado

- **WHEN** un tag no lo tiene ninguna planta
- **THEN** aparece igualmente en el listado, con cero plantas

#### Scenario: El recuento no multiplica las consultas

- **WHEN** se consulta una página del catálogo con varios tags
- **THEN** los recuentos se obtienen en una sola consulta, sea cual sea el número de filas de la página

### Requirement: Paginación de los listados de catálogo

Los listados de localizaciones y de tags SHALL devolverse siempre paginados, nunca como una colección completa sin límite, con la misma forma de respuesta que el listado de inventario: contenido de la página, total de elementos, total de páginas, número de página y tamaño de página aplicado. La página y el tamaño SHALL poder indicarse en la petición; en su ausencia se aplica el tamaño de página por defecto configurado, y el tamaño solicitado SHALL quedar limitado al máximo configurado.

#### Scenario: Catálogo paginado por defecto

- **WHEN** se consulta el catálogo de tags sin indicar página ni tamaño
- **THEN** la respuesta devuelve la primera página con el tamaño de página por defecto configurado, e incluye el total de elementos, el total de páginas, el número de página y el tamaño aplicado

#### Scenario: Catálogo con tamaño de página explícito

- **WHEN** existen 5 localizaciones y se consulta el catálogo pidiendo la primera página con tamaño 2
- **THEN** la respuesta contiene 2 localizaciones, el total de elementos es 5 y el total de páginas es 3

#### Scenario: Tamaño de página por encima del máximo

- **WHEN** se consulta un catálogo pidiendo un tamaño de página mayor que el máximo configurado
- **THEN** la respuesta se sirve con el tamaño máximo configurado, y el tamaño de página indicado en la respuesta es ese máximo

### Requirement: Consulta de una etiqueta con su uso

El sistema SHALL exponer la consulta de una etiqueta por su identificador, incluyendo **cuántas plantas la tienen asignada**. Una etiqueta inexistente SHALL responder `404`.

#### Scenario: Consulta de una etiqueta

- **WHEN** se consulta una etiqueta existente por su identificador
- **THEN** la respuesta incluye su nombre y el número de plantas que la tienen

#### Scenario: Etiqueta sin uso

- **WHEN** se consulta una etiqueta que ninguna planta tiene asignada
- **THEN** la respuesta indica cero plantas, no la omite

#### Scenario: Etiqueta inexistente

- **WHEN** se consulta un identificador que no corresponde a ninguna etiqueta
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme

### Requirement: Renombrado de una etiqueta

El sistema SHALL permitir cambiar el nombre de una etiqueta existente, **conservando sus asignaciones**: las plantas que la tenían la siguen teniendo. El nombre nuevo SHALL respetar la unicidad normalizada del catálogo.

#### Scenario: Etiqueta renombrada

- **WHEN** se renombra una etiqueta a un nombre libre
- **THEN** la respuesta refleja el nombre nuevo y las plantas que la tenían la conservan

#### Scenario: Renombrado a un nombre ya usado

- **WHEN** se renombra una etiqueta a un nombre que ya existe en el catálogo, aunque difiera en mayúsculas o espacios
- **THEN** la respuesta es `409 Conflict` y la etiqueta conserva su nombre

#### Scenario: Renombrado al mismo nombre

- **WHEN** se renombra una etiqueta al nombre que ya tenía
- **THEN** la operación se acepta y no se considera un conflicto consigo misma

#### Scenario: Nombre en blanco

- **WHEN** se renombra una etiqueta a un nombre vacío
- **THEN** la respuesta es `400 Bad Request` y la etiqueta conserva su nombre

### Requirement: Combinación de etiquetas duplicadas

El sistema SHALL permitir combinar dos etiquetas: las plantas que tienen la etiqueta **de origen** pasan a tener la de **destino**, y la de origen se retira del catálogo. Una planta que ya tuviera ambas SHALL conservar la de destino **una sola vez**, sin duplicarse. La operación SHALL informar de cuántas plantas se han visto afectadas.

#### Scenario: Combinación de dos etiquetas

- **WHEN** se combina una etiqueta de origen en una de destino
- **THEN** las plantas de la de origen pasan a tener la de destino, la de origen desaparece del catálogo, y la respuesta indica cuántas plantas se vieron afectadas

#### Scenario: Planta que ya tenía ambas

- **WHEN** una planta tiene tanto la etiqueta de origen como la de destino y se combinan
- **THEN** esa planta conserva la de destino una sola vez y la operación no falla

#### Scenario: Combinar una etiqueta consigo misma

- **WHEN** el origen y el destino son la misma etiqueta
- **THEN** la respuesta es `400 Bad Request` y no se retira nada

#### Scenario: Combinación con una etiqueta inexistente

- **WHEN** el origen o el destino no corresponden a ninguna etiqueta
- **THEN** la respuesta es `404 Not Found` y no se retira nada

### Requirement: Retirada de una etiqueta en uso

El sistema SHALL permitir retirar una etiqueta del catálogo **salvo que alguna planta la tenga asignada**. En ese caso SHALL responder `409 Conflict` explicando la causa, y la etiqueta SHALL permanecer.

#### Scenario: Retirada de una etiqueta sin uso

- **WHEN** se retira una etiqueta que ninguna planta tiene
- **THEN** la respuesta es `204 No Content` y deja de aparecer en el catálogo

#### Scenario: Retirada de una etiqueta en uso

- **WHEN** se retira una etiqueta que alguna planta tiene asignada
- **THEN** la respuesta es `409 Conflict` explicando que está en uso, y la etiqueta permanece

### Requirement: Búsqueda de texto en localizaciones y etiquetas

`GET /locations` SHALL aceptar `q`: coincidencia parcial, sin distinguir mayúsculas, sobre el **nombre** y el **código** de la localización. `GET /tags` SHALL aceptar `q` sobre el **nombre** de la etiqueta. En ambos el texto SHALL tratarse como literal (`%` y `_` no son comodines) y uno en blanco SHALL no filtrar. El resultado SHALL seguir paginado con `PageResponse` (ADR-009) y conservar el recuento por fila que ya traen.

#### Scenario: Localización por nombre

- **WHEN** se pide `GET /locations?q=invernadero`
- **THEN** devuelve las localizaciones cuyo nombre contiene «invernadero»

#### Scenario: Localización por código

- **WHEN** se pide `GET /locations?q=loc-inv`
- **THEN** devuelve la de código `LOC-INV…`

#### Scenario: Etiqueta por nombre

- **WHEN** se pide `GET /tags?q=glob`
- **THEN** devuelve «globular» y «globulares» con su recuento de plantas

#### Scenario: Comodines como texto

- **WHEN** se pide `GET /tags?q=_`
- **THEN** devuelve solo las etiquetas con un guion bajo literal en el nombre

#### Scenario: En blanco

- **WHEN** `q` solo tiene espacios
- **THEN** el resultado es el del listado sin `q`

### Requirement: Una localización con tareas no se retira

`DELETE /locations/{id}` SHALL responder `409` si alguna tarea —en cualquier estado— apunta a esa localización, y la localización SHALL conservarse. El mensaje SHALL decir que hay tareas que la usan. Las tareas dirigidas a plantas expresas SHALL NOT impedir retirar la localización donde estén las plantas, que sigue gobernada por las reglas de ejemplares y sublocalizaciones.

#### Scenario: Con una tarea pendiente

- **WHEN** una tarea pendiente apunta a una localización y se intenta retirar
- **THEN** responde `409` y la localización sigue existiendo

#### Scenario: Con una tarea completada

- **WHEN** solo hay tareas completadas dirigidas a esa localización
- **THEN** responde `409` igualmente, porque la historia conserva la referencia

#### Scenario: Sin tareas

- **WHEN** ninguna tarea apunta a la localización y no tiene ejemplares ni sublocalizaciones
- **THEN** se retira

### Requirement: Alertas abiertas de una localización

Cada localización de `GET /locations` y de `GET /locations/{id}` SHALL traer **`openAlerts`**: el número de alertas **abiertas** (`nueva` o `revisada`) **totales** —las propias, las de sus sublocalizaciones y las de los ejemplares que están en ellas— y la **mayor severidad** entre ellas, ausente si no hay ninguna. El recuento por fila SHALL resolverse con una consulta agregada y no con una por fila, y SHALL seguir la jerarquía como los recuentos de ejemplares (consultas recursivas, sin ruta materializada). La ficha SHALL traer además las **propias** (solo las de la localización y las de sus ejemplares directos) para distinguirlas de las de dentro.

#### Scenario: Recuento con descendientes

- **WHEN** una localización tiene una alerta propia, una sublocalización con un ejemplar con alerta y otra alerta ya resuelta
- **THEN** `openAlerts` cuenta 2 y su mayor severidad es la más alta de esas dos

#### Scenario: Sin alertas

- **WHEN** ninguna alerta abierta afecta a la localización ni a lo que contiene
- **THEN** `openAlerts` es 0 y no trae severidad

#### Scenario: Una consulta para todo el listado

- **WHEN** se lista una página de 25 localizaciones
- **THEN** el recuento de alertas se obtiene con una consulta agregada, no una por localización

#### Scenario: Una alerta cerrada no cuenta

- **WHEN** una alerta se descarta
- **THEN** deja de contar en `openAlerts` de su localización y de sus ancestros
