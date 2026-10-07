# plant-batches Specification

## Purpose
TBD - created by archiving change trabajo-por-lote. Update Purpose after archive.

## Requirements

### Requirement: Alcance de un lote

Un lote SHALL aplicarse a un **alcance**, que SHALL ser exactamente uno de: una **lista de plantas** (`kind: plants`, de 1 a 2.000 identificadores sin repetir), **una localización** (`kind: location`, con `locationId` y `includeDescendants`, por defecto `false`) o **una consulta de inventario** (`kind: query`, con la *query string* del listado de plantas). Una consulta SHALL validarse con los mismos criterios que `GET /plants` —un valor inválido o un parámetro desconocido responden `400`— y SHALL ignorar `page`, `size` y `sort`. Solo SHALL contarse y afectarse a las plantas **en curso**: las archivadas (cedida, vendida, muerta o perdida) quedan fuera aunque el alcance las incluya. Una planta o una localización inexistente SHALL responder `400`.

#### Scenario: Una lista de plantas

- **WHEN** el alcance es una lista de tres plantas en curso
- **THEN** las tres forman el alcance

#### Scenario: Una localización con sublocalizaciones

- **WHEN** el alcance es una localización con `includeDescendants` y hay 24 plantas en curso entre ella y sus bandejas
- **THEN** el alcance son esas 24

#### Scenario: Una localización sin descendientes

- **WHEN** el alcance es una localización sin `includeDescendants`
- **THEN** solo cuentan las plantas que están directamente en ella

#### Scenario: El resultado de un filtro

- **WHEN** el alcance es la consulta `status=cuarentena&species=<id>`
- **THEN** el alcance son las plantas que `GET /plants` devolvería con esos parámetros, todas y no solo una página

#### Scenario: Las archivadas no entran

- **WHEN** una planta del alcance está `vendida`
- **THEN** no se cuenta ni recibe ningún evento

#### Scenario: Una consulta inválida

- **WHEN** la consulta trae `status=resucitada`
- **THEN** responde `400`

#### Scenario: Más de una forma

- **WHEN** el alcance trae `plantIds` y `locationId` a la vez
- **THEN** responde `400`

### Requirement: Cuántas plantas afectaría un lote

`POST /batches/preview` SHALL aceptar un alcance y devolver **el número exacto de plantas** que un lote con él afectaría, **sin escribir nada**, de modo que la interfaz pueda declararlo antes de guardar. Con `excludedPlantIds` SHALL descontar las exclusiones. Un alcance que supere `BATCH_MAX_PLANTS` SHALL responder `422` con el número de plantas y el máximo. El número SHALL coincidir con el de plantas a las que luego se escribe.

#### Scenario: El número antes de guardar

- **WHEN** se previsualiza una localización con 24 plantas en curso
- **THEN** responde `count` 24 y no se crea ningún evento

#### Scenario: Con exclusiones

- **WHEN** se previsualiza un alcance de 24 plantas excluyendo 3
- **THEN** responde `count` 21

#### Scenario: Una exclusión ajena

- **WHEN** `excludedPlantIds` contiene una planta que no está en el alcance
- **THEN** responde `400`

#### Scenario: Coincide con lo que se escribe

- **WHEN** se previsualiza un alcance y luego se aplica un lote con él
- **THEN** el número de plantas afectadas es el mismo

#### Scenario: Demasiado grande

- **WHEN** el alcance son 3.000 plantas y el máximo es 2.000
- **THEN** responde `422` con «3000 plantas superan el máximo de 2000: acota el alcance» y no escribe nada

### Requirement: Registrar una lectura por lote

`POST /batches` con la acción `reading` SHALL crear **una lectura de cultivo por planta incluida**, con las mismas medidas, el mismo instante (`occurredAt`, por defecto ahora, no futuro) y el mismo `batch_id`. Las reglas SHALL ser las del alta individual de una lectura: al menos una medida, cada una en su rango. Una lectura inválida SHALL responder `400` y **no escribir ninguna**. Cada lectura SHALL aparecer en la cronología de su planta con su `batchId`.

#### Scenario: Un riego en una bandeja

- **WHEN** se registra una lectura con `waterAmountMl` 200 sobre 31 plantas
- **THEN** cada una de las 31 tiene su lectura de 200 ml, todas con el mismo instante y el mismo `batchId`

#### Scenario: Las excluidas no la tienen

- **WHEN** se excluyen 2 plantas
- **THEN** esas 2 no reciben ninguna lectura

#### Scenario: Sin ninguna medida

- **WHEN** la lectura no trae ninguna medida
- **THEN** responde `400` y ninguna planta recibe nada

#### Scenario: Fecha futura

- **WHEN** `occurredAt` es posterior al ahora
- **THEN** responde `400`

#### Scenario: Aparece en cada ficha

- **WHEN** se aplica un lote a 31 plantas y se abre la cronología de una de ellas
- **THEN** la lectura está la primera, con su `batchId` y `batchSize` 31

### Requirement: Registrar una intervención o un comentario por lote

`POST /batches` con la acción `intervention` o `comment` SHALL crear **un evento de ese tipo por planta incluida**, con los mismos datos, el mismo instante y el mismo `batch_id`, con las reglas del alta individual: cada tipo de intervención admite solo sus datos, y un comentario lleva un texto no en blanco. Un dato inválido SHALL responder `400` y **no escribir ninguno**.

#### Scenario: Una poda en 12 plantas

- **WHEN** se registra una intervención de tipo `poda` sobre 12 plantas
- **THEN** cada una tiene su intervención de poda con el mismo `batchId`

#### Scenario: Un trasplante con maceta

- **WHEN** se registra un `trasplante` con `potSize` 12
- **THEN** cada planta incluida lo tiene con esa maceta

#### Scenario: Un dato ajeno al tipo

- **WHEN** una `poda` trae `potSize`
- **THEN** responde `400` y ninguna planta recibe nada

#### Scenario: Un comentario

- **WHEN** se añade el comentario «movidas por la ola de frío» a 31 plantas
- **THEN** cada una tiene ese comentario, sin marca de editado, con el mismo `batchId`

#### Scenario: Comentario en blanco

- **WHEN** el texto está vacío
- **THEN** responde `400`

### Requirement: Un lote es una sola operación atómica

`POST /batches` SHALL escribir **todos** los registros y la fila de la operación en **una transacción**: o quedan todos o no queda ninguno. SHALL registrar el tipo de acción, el tipo de alcance, el número de plantas afectadas y el instante. El número de plantas afectadas SHALL ser el de plantas realmente incluidas. Un lote sin plantas afectadas —alcance vacío o todas excluidas— SHALL responder `400`. La respuesta SHALL traer el `id` de la operación, y `GET /batches/{id}` SHALL devolverla; una operación inexistente SHALL responder `404`.

#### Scenario: Todo o nada

- **WHEN** falla la escritura del registro de una de las plantas
- **THEN** ninguna planta queda con registro y no existe la fila de la operación

#### Scenario: El número real

- **WHEN** se aplica un lote a 24 plantas excluyendo 3
- **THEN** la operación dice `plantCount` 21

#### Scenario: Sin plantas

- **WHEN** el alcance está vacío o se excluyen todas
- **THEN** responde `400` y no se crea nada

#### Scenario: Consultar la operación

- **WHEN** se pide `GET /batches/{id}` de un lote hecho
- **THEN** devuelve su tipo, su alcance, su número de plantas y su instante

#### Scenario: Operación inexistente

- **WHEN** el id no existe
- **THEN** responde `404`

#### Scenario: Una gran operación

- **WHEN** se aplica un lote a 1.500 plantas
- **THEN** se completa en una sola transacción con un registro por planta

### Requirement: Una lectura de lote evalúa las alertas como cualquier lectura

Cada lectura creada por un lote SHALL pasar por la **detección de medición** de las alertas, en la misma transacción que la escribe, igual que una lectura individual: una medida de humedad, temperatura o luz fuera del rango efectivo de **esa planta** SHALL abrir o actualizar su alerta. Una lectura dentro de rango SHALL NOT abrir nada, una planta excluida SHALL NOT recibir alerta, y un lote rechazado SHALL NOT dejar ninguna.

#### Scenario: Fuera de rango en cada planta

- **WHEN** se registra por lote una temperatura de 2 °C en 3 plantas cuyo mínimo es mayor
- **THEN** cada una de las 3 tiene su alerta abierta

#### Scenario: Dentro de rango

- **WHEN** la lectura de lote está dentro del rango de cada planta
- **THEN** no se abre ninguna alerta

#### Scenario: Una excluida

- **WHEN** una planta se excluye del lote
- **THEN** no recibe alerta

#### Scenario: Un lote rechazado

- **WHEN** el lote se rechaza por una lectura inválida
- **THEN** no queda ninguna alerta
