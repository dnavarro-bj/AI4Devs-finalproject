## RENAMED Requirements

- FROM: `### Requirement: Corrección del nombre de una localización`
- TO: `### Requirement: Edición de una localización`

## MODIFIED Requirements

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
