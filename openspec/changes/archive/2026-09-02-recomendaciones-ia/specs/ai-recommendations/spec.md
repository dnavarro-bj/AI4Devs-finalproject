## Purpose

Generación y consulta de la recomendación de cuidado que la IA produce a partir de una lectura de cultivo, interpretándola a la luz de los rangos de la especie y del último riego registrado, para que el usuario sepa si su planta está en riesgo y qué hacer al respecto.

## ADDED Requirements

### Requirement: Generación de la recomendación de una lectura

El sistema SHALL generar, a petición explícita, la recomendación de cuidado de una lectura existente, y SHALL persistirla asociada a esa lectura. La recomendación generada SHALL contener el nivel de riesgo, una explicación, la acción recomendada y la prioridad de actuación.

La generación SHALL apoyarse en los rangos recomendados de la especie de la planta, en los valores de la lectura y en el último riego registrado de esa planta. El sistema SHALL calcular por su cuenta las desviaciones respecto a los rangos y aportarlas ya resueltas: la IA interpreta esos datos, no decide cuáles son los rangos.

#### Scenario: Recomendación generada para una lectura

- **WHEN** se solicita generar la recomendación de una lectura existente que aún no tiene ninguna
- **THEN** la respuesta es `201 Created` e incluye el nivel de riesgo, la explicación, la acción recomendada y la prioridad

#### Scenario: La recomendación queda asociada a su lectura

- **WHEN** se genera la recomendación de una lectura y a continuación se consulta esa recomendación
- **THEN** la respuesta la devuelve, y es la misma que se generó

#### Scenario: Una lectura fuera de rango no se califica de riesgo bajo

- **WHEN** se genera la recomendación de una lectura cuya humedad está muy por debajo del mínimo recomendado de su especie
- **THEN** el nivel de riesgo devuelto no es el más bajo de la escala

#### Scenario: Planta sin ningún riego registrado

- **WHEN** se genera la recomendación de una lectura de una planta de la que no consta ningún riego
- **THEN** la recomendación se genera igualmente, y la ausencia de riego previo se traslada como tal al análisis

### Requirement: Una recomendación por lectura

Una lectura SHALL tener como mucho una recomendación. Solicitar la generación de una lectura que ya la tiene SHALL devolver la existente, sin volver a consultar al proveedor de IA. Dos solicitudes simultáneas sobre la misma lectura SHALL dejar una única recomendación persistida.

#### Scenario: Segunda solicitud sobre la misma lectura

- **WHEN** se solicita generar la recomendación de una lectura que ya tiene una
- **THEN** la respuesta es `200 OK` con la recomendación existente, y no se consulta al proveedor de IA

#### Scenario: Solicitudes simultáneas

- **WHEN** dos solicitudes de generación sobre la misma lectura se resuelven a la vez
- **THEN** ambas terminan con éxito devolviendo la misma recomendación, y la lectura queda con una sola

### Requirement: Consulta de la recomendación de una lectura

El sistema SHALL exponer la recomendación ya generada de una lectura. La consulta SHALL ser una operación de solo lectura: **en ningún caso SHALL generar una recomendación**.

#### Scenario: Lectura con recomendación

- **WHEN** se consulta la recomendación de una lectura que ya la tiene
- **THEN** la respuesta es `200 OK` con sus cuatro datos

#### Scenario: Lectura sin recomendación

- **WHEN** se consulta la recomendación de una lectura que no tiene ninguna
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error, y después de la consulta sigue sin existir ninguna recomendación para esa lectura

### Requirement: Referencias inválidas en la ruta

El sistema SHALL rechazar con un error controlado toda petición cuya planta o cuya lectura no existan, y también aquella en la que la lectura exista pero no pertenezca a la planta indicada. En ningún caso SHALL responderse con un error interno del servidor.

#### Scenario: Planta inexistente

- **WHEN** se solicita la recomendación indicando una planta que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error

#### Scenario: Lectura inexistente

- **WHEN** se solicita la recomendación indicando una lectura que no existe
- **THEN** la respuesta es `404 Not Found` con un cuerpo de error

#### Scenario: Lectura que pertenece a otra planta

- **WHEN** se solicita la recomendación de una lectura que existe pero cuelga de una planta distinta de la indicada en la ruta
- **THEN** la respuesta es `404 Not Found`, porque esa lectura no existe en esa ruta

#### Scenario: Identificador con formato inválido

- **WHEN** se solicita la recomendación indicando un identificador de lectura que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error

### Requirement: Fallo del proveedor de IA

Cuando el proveedor de IA no responde, tarda más de lo admitido o devuelve algo que el sistema no puede interpretar, el sistema SHALL responder con un error controlado que identifique el fallo como ajeno al cliente, y SHALL dejar la lectura sin recomendación persistida. El resto del flujo SHALL seguir funcionando.

#### Scenario: El proveedor no responde

- **WHEN** se solicita generar una recomendación y el proveedor de IA falla o agota el tiempo de espera
- **THEN** la respuesta es un error de la familia `5xx` con el cuerpo de error uniforme del API, y la lectura sigue sin recomendación

#### Scenario: Respuesta que no se puede interpretar

- **WHEN** el proveedor responde algo que no encaja con lo que el sistema espera —por ejemplo un nivel de riesgo desconocido—
- **THEN** la respuesta identifica el fallo como del proveedor y no como un dato inválido del cliente, y no se persiste ninguna recomendación

#### Scenario: El fallo no rompe el resto

- **WHEN** una generación ha fallado por culpa del proveedor
- **THEN** la lectura sigue consultándose con normalidad y se puede volver a solicitar su recomendación más tarde

### Requirement: Vocabulario del nivel de riesgo y de la prioridad

El nivel de riesgo y la prioridad de actuación SHALL tomar valores de un conjunto cerrado y conocido. Un valor fuera de ese conjunto SHALL rechazarse, tanto al recibirlo del proveedor como al persistirlo.

#### Scenario: Valores admitidos

- **WHEN** se consulta una recomendación
- **THEN** su nivel de riesgo es uno de los tres valores de la escala y su prioridad uno de los tres valores previstos

#### Scenario: Valor desconocido rechazado en persistencia

- **WHEN** se intenta persistir directamente una recomendación con un nivel de riesgo que no pertenece al conjunto
- **THEN** la operación se rechaza con un error de validación
