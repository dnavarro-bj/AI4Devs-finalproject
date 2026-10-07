## ADDED Requirements

### Requirement: Una tarea puede nacer de una alerta

`POST /tasks` SHALL admitir un `originAlertId` opcional. Con él, la tarea SHALL quedar con origen `alerta` y enlazada a esa alerta, que SHALL poder tener **varias** tareas; el destino, el tipo, el título y la prioridad siguen siendo los del cuerpo (la pantalla los precompleta desde la alerta, pero el API no los deduce). Una alerta inexistente SHALL responder `400` (es una referencia del cuerpo) y una alerta **cerrada** (`resuelta` o `descartada`) SHALL responder `409`. Crear la tarea NO SHALL cambiar el estado de la alerta ni resolverla. El listado SHALL admitir `?alert=` para pedir las tareas de una alerta, y la respuesta de una tarea SHALL traer `originAlertId` cuando lo tenga.

#### Scenario: Crear una tarea desde una alerta

- **WHEN** se envía una tarea con `originAlertId` de una alerta `nueva`
- **THEN** la respuesta es `201 Created`, el origen es `alerta`, la tarea trae el identificador de la alerta y la alerta sigue `nueva`

#### Scenario: Varias tareas para una alerta

- **WHEN** se crean dos tareas con la misma alerta de origen
- **THEN** `GET /alerts/{id}` las lista las dos y `GET /tasks?alert=…` las devuelve

#### Scenario: Alerta inexistente

- **WHEN** el `originAlertId` no existe
- **THEN** la respuesta es `400` y no se crea la tarea

#### Scenario: Alerta cerrada

- **WHEN** el `originAlertId` es de una alerta resuelta o descartada
- **THEN** la respuesta es `409` y no se crea la tarea

#### Scenario: Una tarea sin alerta

- **WHEN** se crea una tarea sin `originAlertId`
- **THEN** su origen sigue siendo `manual` y no trae enlace

### Requirement: Completar una tarea con alerta de origen propone resolverla

La respuesta de `POST /tasks/{id}/complete` SHALL traer, cuando la tarea tenga una alerta de origen **todavía abierta**, un **`suggestedAlertResolution`** con el identificador de la alerta y su estado, y SHALL omitirlo en cualquier otro caso. Completar la tarea NO SHALL resolver, revisar ni ocultar la alerta: resolverla es una llamada explícita aparte. Omitir o cancelar la tarea NO SHALL proponer nada.

#### Scenario: Se propone resolver

- **WHEN** se completa una tarea nacida de una alerta `revisada`
- **THEN** la respuesta trae la alerta como resolución sugerida y la alerta sigue `revisada`

#### Scenario: La alerta ya estaba cerrada

- **WHEN** se completa una tarea cuya alerta se resolvió mientras tanto
- **THEN** la respuesta no trae ninguna resolución sugerida

#### Scenario: Una tarea sin alerta

- **WHEN** se completa una tarea manual
- **THEN** la respuesta no trae resolución sugerida

#### Scenario: Omitir no propone

- **WHEN** se omite o se cancela una tarea nacida de una alerta
- **THEN** la respuesta no propone resolver y la alerta no cambia

### Requirement: El enlace con la alerta no bloquea nada

Una alerta **cerrada** SHALL conservar sus tareas enlazadas, y una tarea SHALL conservar su enlace aunque su alerta se cierre. El enlace NO SHALL impedir ninguna operación sobre la tarea ni sobre la alerta.

#### Scenario: Cerrar una alerta con tareas pendientes

- **WHEN** se resuelve una alerta que tiene una tarea pendiente
- **THEN** la alerta se resuelve, la tarea sigue pendiente y conserva su `originAlertId`

#### Scenario: Reprogramar una tarea de alerta cerrada

- **WHEN** se reprograma una tarea cuya alerta de origen está cerrada
- **THEN** se acepta
