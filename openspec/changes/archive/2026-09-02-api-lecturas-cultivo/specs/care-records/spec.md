## Purpose

Registro y consulta de las lecturas de cultivo de una planta —humedad, temperatura, horas de luz, cantidad de riego y acidez del sustrato— anotadas manualmente por el usuario, fechadas en el momento en que se tomaron o, si el cliente no lo indica, en el de su registro, para poder seguir el estado de cada ejemplar y alimentar el análisis de IA.

## ADDED Requirements

### Requirement: Alta de una lectura de cultivo

El sistema SHALL permitir registrar una lectura de cultivo asociada a una planta existente, con los valores de humedad, temperatura, horas de luz, cantidad de riego y acidez del sustrato. Todos los valores son opcionales por separado, pero una lectura SHALL contener al menos uno: una lectura sin ningún valor no se acepta.

#### Scenario: Lectura registrada con los cinco valores

- **WHEN** se solicita registrar una lectura sobre una planta existente con humedad `35`, temperatura `24`, horas de luz `8`, riego `150` ml y acidez `6.2`
- **THEN** la respuesta es `201 Created`, incluye el identificador asignado y devuelve los cinco valores tal y como se enviaron

#### Scenario: Lectura parcial

- **WHEN** se solicita registrar una lectura indicando únicamente la humedad
- **THEN** la respuesta es `201 Created` y los demás valores quedan vacíos en la lectura registrada

#### Scenario: Lectura sin ningún valor

- **WHEN** se solicita registrar una lectura sin ninguno de los cinco valores
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que la lectura debe llevar al menos un valor, y no se registra ninguna lectura

#### Scenario: La lectura queda asociada a su planta

- **WHEN** se registra una lectura sobre una planta y a continuación se consulta el listado de lecturas de esa planta
- **THEN** la lectura registrada está presente en el resultado, y no aparece en el listado de ninguna otra planta

### Requirement: Fecha de la lectura

El sistema SHALL admitir que la petición indique la fecha y hora en que se tomó la lectura, y SHALL asignarla automáticamente en el momento de registrarla cuando la petición no la indique. La fecha aportada por el cliente SHALL conservarse tal y como llega. La lectura creada SHALL devolver su fecha en la respuesta del alta, venga de donde venga.

#### Scenario: Fecha ausente en la petición

- **WHEN** se registra una lectura sin indicar la fecha
- **THEN** la respuesta incluye una fecha y hora de registro no vacía, asignada por el servidor

#### Scenario: Fecha aportada por el cliente

- **WHEN** se registra una lectura indicando una fecha del pasado
- **THEN** la respuesta es `201 Created` y devuelve esa misma fecha, no la del momento del registro

#### Scenario: Lectura aportada con fecha antigua entre otras más recientes

- **WHEN** una planta ya tiene lecturas registradas y se añade otra con una fecha anterior a todas ellas
- **THEN** la lectura añadida aparece en el listado en la posición que le corresponde por su fecha, no la primera

### Requirement: Rechazo de lecturas con fecha futura

El sistema SHALL rechazar una lectura cuya fecha esté por delante del momento actual más allá de un margen de tolerancia configurable, para absorber relojes ligeramente desincronizados sin admitir lecturas que aún no han ocurrido. El rechazo SHALL ser un error controlado del cliente, nunca un error interno del servidor.

#### Scenario: Fecha futura más allá del margen

- **WHEN** se solicita registrar una lectura con una fecha muy posterior al momento actual
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la fecha como el campo problemático, y no se registra ninguna lectura

#### Scenario: Fecha ligeramente futura dentro del margen

- **WHEN** se solicita registrar una lectura con una fecha posterior al momento actual pero dentro del margen de tolerancia configurado
- **THEN** la respuesta es `201 Created` y la lectura queda registrada con esa fecha

### Requirement: Validación de rangos de una lectura

El sistema SHALL rechazar una lectura cuyos valores estén fuera de los rangos admisibles: humedad entre `0` y `100`, horas de luz entre `0` y `24`, cantidad de riego mayor o igual que `0`, acidez del sustrato entre `0` y `14` y temperatura entre `-50` y `80`. El rechazo SHALL ser un error controlado del cliente, nunca un error interno del servidor.

#### Scenario: Humedad fuera de rango

- **WHEN** se solicita registrar una lectura con humedad `-5`
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica el campo problemático, y no se registra ninguna lectura

#### Scenario: Acidez del sustrato fuera de rango

- **WHEN** se solicita registrar una lectura con acidez del sustrato `15.0`
- **THEN** la respuesta es `400 Bad Request` y no se registra ninguna lectura

#### Scenario: Horas de luz por encima del día

- **WHEN** se solicita registrar una lectura con `25` horas de luz
- **THEN** la respuesta es `400 Bad Request` y no se registra ninguna lectura

#### Scenario: Cantidad de riego negativa

- **WHEN** se solicita registrar una lectura con una cantidad de riego negativa
- **THEN** la respuesta es `400 Bad Request` y no se registra ninguna lectura

### Requirement: Distinción entre riego no medido y riego nulo

El sistema SHALL conservar la diferencia entre una lectura en la que no se anotó la cantidad de riego y una en la que se anotó expresamente que no se regó: la primera deja el valor vacío y la segunda lo registra como `0`. Ambas SHALL poder distinguirse al consultar la lectura.

#### Scenario: Riego anotado como cero

- **WHEN** se registra una lectura con cantidad de riego `0`
- **THEN** la lectura consultada después devuelve la cantidad de riego `0`, y no un valor vacío

#### Scenario: Riego no anotado

- **WHEN** se registra una lectura sin indicar cantidad de riego
- **THEN** la lectura consultada después devuelve la cantidad de riego vacía, y no `0`

### Requirement: Lectura sobre una planta inexistente

El sistema SHALL rechazar el registro y la consulta de lecturas de una planta cuyo identificador no exista, devolviendo un error controlado que identifique el recurso ausente. En ningún caso SHALL responderse con un error interno del servidor.

#### Scenario: Alta sobre planta inexistente

- **WHEN** se solicita registrar una lectura sobre una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error, y no se registra ninguna lectura

#### Scenario: Listado sobre planta inexistente

- **WHEN** se consulta el listado de lecturas de una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error, y no una página vacía

#### Scenario: Identificador de planta con formato inválido

- **WHEN** se consulta el listado de lecturas indicando un identificador de planta que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

### Requirement: Listado de lecturas de una planta

El sistema SHALL exponer las lecturas de una planta ordenadas de la más reciente a la más antigua. El orden SHALL ser estable: dos lecturas con la misma fecha y hora SHALL devolverse siempre en el mismo orden relativo, de modo que ninguna se repita ni se omita al recorrer las páginas.

#### Scenario: Lecturas en orden descendente

- **WHEN** una planta tiene varias lecturas registradas en momentos distintos y se consulta su listado
- **THEN** la respuesta es `200 OK` y las lecturas llegan de la más reciente a la más antigua

#### Scenario: Planta sin lecturas

- **WHEN** se consulta el listado de lecturas de una planta existente que no tiene ninguna
- **THEN** la respuesta es `200 OK`, su contenido está vacío y el total de elementos es `0`

#### Scenario: Lecturas con la misma fecha y hora

- **WHEN** una planta tiene varias lecturas con la misma fecha y hora y se recorren sus páginas
- **THEN** cada lectura aparece exactamente una vez en el recorrido completo

### Requirement: Paginación del listado de lecturas

El listado de lecturas SHALL devolverse siempre paginado, nunca como una colección completa sin límite, con la misma forma de respuesta que el resto de listados del API: contenido de la página, total de elementos, total de páginas, número de página y tamaño de página aplicado. La página y el tamaño SHALL poder indicarse en la petición; en su ausencia se aplica el tamaño por defecto configurado, y el tamaño solicitado SHALL quedar limitado al máximo configurado.

#### Scenario: Listado paginado por defecto

- **WHEN** se consulta el listado de lecturas de una planta sin indicar página ni tamaño
- **THEN** la respuesta devuelve la primera página con el tamaño de página por defecto configurado, e incluye el total de elementos, el total de páginas, el número de página y el tamaño aplicado

#### Scenario: Tamaño de página explícito

- **WHEN** una planta tiene 5 lecturas y se consulta su listado pidiendo la primera página con tamaño 2
- **THEN** la respuesta contiene 2 lecturas, el total de elementos es 5 y el total de páginas es 3

#### Scenario: Página más allá del final

- **WHEN** se solicita una página cuyo índice supera el total de páginas disponibles
- **THEN** la respuesta es `200 OK` con contenido vacío y el total de elementos sigue siendo el real

#### Scenario: El total cuenta solo las lecturas de la planta consultada

- **WHEN** dos plantas tienen lecturas registradas y se consulta el listado de una de ellas
- **THEN** el total de elementos es el número de lecturas de esa planta, no el de todas las lecturas del sistema

### Requirement: Recomendación de IA asociada a cada lectura

El listado de lecturas SHALL incluir, para cada lectura, la recomendación de IA ya generada para ella, o un valor vacío cuando todavía no tenga ninguna. Consultar el listado SHALL ser una operación de solo lectura: **en ningún caso SHALL generarse una recomendación al consultarlo**, ni con ella ni sin ella.

#### Scenario: Lectura sin recomendación

- **WHEN** se consulta el listado de lecturas de una planta cuyas lecturas no tienen recomendación generada
- **THEN** la respuesta es `200 OK` y cada lectura llega con su recomendación vacía

#### Scenario: Lectura con recomendación ya generada

- **WHEN** una lectura tiene una recomendación de IA persistida y se consulta el listado de lecturas de su planta
- **THEN** esa lectura llega con el nivel de riesgo y el texto de su recomendación, sin necesidad de una consulta adicional por lectura

#### Scenario: Consultar el listado no genera recomendaciones

- **WHEN** se consulta el listado de lecturas de una planta cuyas lecturas no tienen recomendación
- **THEN** después de la consulta sigue sin existir ninguna recomendación asociada a esas lecturas
