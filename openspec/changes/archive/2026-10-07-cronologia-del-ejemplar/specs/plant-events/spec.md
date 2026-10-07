## ADDED Requirements

### Requirement: Comentarios cronológicos

El sistema SHALL permitir anotar un comentario sobre un ejemplar con `POST /plants/{id}/comments`: texto **obligatorio** (no en blanco, recortado) y fecha opcional, que por defecto es el instante actual del reloj único del sistema. La fecha NO SHALL ser futura. El comentario es distinto de la descripción del ejemplar, que no cambia. La respuesta SHALL ser la entrada de la cronología ya montada. Una planta inexistente SHALL responder `404`.

#### Scenario: Anotar un comentario

- **WHEN** se envía `{"text": "Pequeña marca en el lado oeste"}`
- **THEN** la respuesta es `201 Created` con una entrada `comentario` cuyo instante es el actual, y aparece la primera en la cronología

#### Scenario: Comentario con fecha pasada

- **WHEN** se envía un comentario con una fecha de hace tres semanas
- **THEN** se guarda con esa fecha y aparece en su lugar temporal de la cronología, no al principio

#### Scenario: Comentario sin texto

- **WHEN** se envía un texto vacío o en blanco, o se omite
- **THEN** la respuesta es `400` y no se guarda nada

#### Scenario: Comentario con fecha futura

- **WHEN** se envía una fecha posterior al instante actual
- **THEN** la respuesta es `400`

#### Scenario: El comentario no cambia la descripción

- **WHEN** se anota un comentario
- **THEN** la descripción del ejemplar queda como estaba

### Requirement: Corregir y retirar un comentario

`PUT /plants/{id}/comments/{commentId}` SHALL reemplazar el texto del comentario, conservar su instante y **marcarlo como editado** con el instante de la edición, que la entrada SHALL exponer como `editedAt`. `DELETE` SHALL retirarlo del historial. Un comentario que no pertenezca a la planta de la URL o no exista SHALL responder `404`.

#### Scenario: Corregir el texto

- **WHEN** se corrige el texto de un comentario
- **THEN** la entrada conserva su instante, trae el texto nuevo y un `editedAt`

#### Scenario: Un comentario sin editar no lo marca

- **WHEN** se consulta un comentario que nunca se ha corregido
- **THEN** su entrada no trae `editedAt`

#### Scenario: Corregir con texto en blanco

- **WHEN** se envía un texto en blanco
- **THEN** la respuesta es `400` y el comentario conserva su texto

#### Scenario: Retirar un comentario

- **WHEN** se retira un comentario
- **THEN** la respuesta es `204` y deja de aparecer en la cronología

#### Scenario: Comentario de otra planta

- **WHEN** se corrige o retira por la URL de una planta un comentario de otra
- **THEN** la respuesta es `404` y el comentario no cambia

### Requirement: Registrar intervenciones

El sistema SHALL permitir registrar una intervención con `POST /plants/{id}/interventions`: tipo `trasplante`, `sustrato`, `tratamiento`, `fertilizacion`, `poda` o `revision`, fecha opcional (por defecto el instante actual, nunca futura) y notas opcionales. **Cada tipo admite solo los datos que le son propios**: `potSize` (la maceta) solo en el trasplante, `soilMixId` solo en el cambio de sustrato y `product` solo en el tratamiento y la fertilización. Un dato que no corresponde a su tipo SHALL rechazarse con `400`. Una mezcla inexistente SHALL responder `400` (una referencia del cuerpo, no un `404`). Registrar una intervención NO SHALL requerir una tarea previa ni crear una lectura.

#### Scenario: Un trasplante con su maceta

- **WHEN** se registra un trasplante con `potSize` «12 cm»
- **THEN** la respuesta es `201 Created` con una entrada `intervencion` con tipo `trasplante` y esa maceta

#### Scenario: Un cambio de sustrato con su mezcla

- **WHEN** se registra un cambio de sustrato con una mezcla existente
- **THEN** la entrada trae la mezcla con su identificador y su nombre

#### Scenario: Una fertilización con su producto

- **WHEN** se registra una fertilización con producto «NPK 10-10-10»
- **THEN** se guarda como intervención con ese producto, sin tocar ninguna lectura

#### Scenario: Un dato ajeno al tipo

- **WHEN** se registra una poda con `potSize`, o un trasplante con `product`
- **THEN** la respuesta es `400` indicando qué dato no corresponde

#### Scenario: Mezcla inexistente

- **WHEN** se registra un cambio de sustrato con una mezcla que no existe
- **THEN** la respuesta es `400` y no se guarda nada

#### Scenario: Tipo desconocido

- **WHEN** se envía el tipo `riego`
- **THEN** la respuesta es `400` con los tipos válidos

#### Scenario: Se registra sin tarea previa

- **WHEN** se registra una intervención sobre un ejemplar sin ninguna tarea
- **THEN** se acepta

#### Scenario: Fecha futura

- **WHEN** se envía una fecha posterior al instante actual
- **THEN** la respuesta es `400`

### Requirement: Corregir y retirar una intervención

`PUT /plants/{id}/interventions/{interventionId}` SHALL reemplazar por completo la intervención —tipo incluido— con las mismas reglas que el alta, y `DELETE` SHALL retirarla. Una corrección rechazada NO SHALL dejar la intervención a medias. Una intervención ajena o inexistente SHALL responder `404`.

#### Scenario: Corregir el tipo y sus datos

- **WHEN** se corrige un tratamiento convirtiéndolo en trasplante con su maceta
- **THEN** la entrada es un trasplante y ya no trae producto

#### Scenario: Una corrección inválida no cambia nada

- **WHEN** se corrige con un dato ajeno al tipo
- **THEN** la respuesta es `400` y la intervención conserva lo que tenía

#### Scenario: Retirar una intervención

- **WHEN** se retira
- **THEN** la respuesta es `204` y desaparece de la cronología

### Requirement: Floraciones observadas

El sistema SHALL permitir registrar una floración con `POST /plants/{id}/blooms`: fecha de inicio **obligatoria** (no futura), fecha de fin opcional, estado `boton`, `en_flor` o `finalizada`, número aproximado de flores opcional (no negativo) y notas. **Una floración es un intervalo y puede seguir abierta.** El fin SHALL ser posterior o igual al inicio y no futuro. El estado `finalizada` SHALL exigir fecha de fin y solo `finalizada` SHALL admitirla. El instante de la floración en la cronología SHALL ser su inicio. La floración observada NO SHALL confundirse con la esperada de la especie: son datos distintos y la una no modifica la otra.

#### Scenario: Una floración abierta

- **WHEN** se registra una floración `en_flor` con inicio y sin fin
- **THEN** se acepta, sigue abierta y aparece en la cronología en su fecha de inicio

#### Scenario: Una floración finalizada

- **WHEN** se registra una floración `finalizada` con inicio y fin
- **THEN** se acepta y la entrada trae el intervalo

#### Scenario: Finalizada sin fin

- **WHEN** se registra una floración `finalizada` sin fecha de fin
- **THEN** la respuesta es `400`

#### Scenario: Fin con la floración todavía abierta

- **WHEN** se registra una floración `en_flor` con fecha de fin
- **THEN** la respuesta es `400`

#### Scenario: Fin anterior al inicio

- **WHEN** el fin es anterior al inicio
- **THEN** la respuesta es `400`

#### Scenario: Número de flores negativo

- **WHEN** se envía `flowerCount` negativo
- **THEN** la respuesta es `400`

#### Scenario: Cerrar una floración

- **WHEN** una floración abierta se corrige con estado `finalizada` y su fecha de fin
- **THEN** la entrada pasa a `finalizada` con ese intervalo

#### Scenario: La floración esperada de la especie no cambia

- **WHEN** se registra una floración observada
- **THEN** el calendario y los datos de floración de la especie quedan como estaban

### Requirement: Retirar una floración y reglas de pertenencia

`PUT /plants/{id}/blooms/{bloomId}` SHALL reemplazar la floración por completo con las reglas del alta, y `DELETE` SHALL retirarla. Una floración ajena o inexistente SHALL responder `404`. Los eventos NO SHALL bloquear el cambio de estado, la edición ni la retirada de la planta: registrar un comentario sobre un ejemplar archivado SHALL aceptarse.

#### Scenario: Retirar una floración

- **WHEN** se retira
- **THEN** la respuesta es `204` y desaparece de la cronología y de su recuento

#### Scenario: Floración de otra planta

- **WHEN** se corrige o retira por la URL de una planta una floración de otra
- **THEN** la respuesta es `404` y no cambia

#### Scenario: Comentar un ejemplar archivado

- **WHEN** se anota un comentario sobre un ejemplar `muerta` o `cedida`
- **THEN** se acepta
