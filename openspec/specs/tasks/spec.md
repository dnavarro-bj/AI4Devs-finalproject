# tasks Specification

## Purpose
TBD - created by archiving change tareas-modelo-y-api. Update Purpose after archive.

## Requirements

### Requirement: Alta de una tarea

`POST /tasks` SHALL crear una tarea con un **tipo** (`riego`, `proteccion_frio`, `proteccion_sol`, `poda_raices`, `cambio_maceta`, `otra`), un **título** obligatorio y no en blanco (máximo 120 caracteres), una **prioridad** (`alta`, `normal`, `baja`; por defecto `normal`), un **periodo previsto** con `dueFrom` y `dueTo` (fechas sin hora; si falta `dueTo` vale lo mismo que `dueFrom`; `dueTo` no puede ser anterior a `dueFrom`), unas **notas** opcionales (máximo 2.000 caracteres) y un **destino**. La tarea SHALL nacer `pendiente`, con origen `manual`, y SHALL devolverse con su `id`. Una fecha ya pasada SHALL admitirse: la tarea nace vencida. **Crear una tarea no escribe nada en el historial de ninguna planta ni en ninguna lectura.** Un tipo o una prioridad desconocidos SHALL responder `400`.

#### Scenario: Una tarea de un día

- **WHEN** se crea una tarea de riego con `dueFrom` `2026-10-15` y sin `dueTo`
- **THEN** responde `201`, `status` es `pendiente`, `origin` es `manual` y `dueTo` es `2026-10-15`

#### Scenario: Una tarea con periodo

- **WHEN** se crea con `dueFrom` `2026-10-12` y `dueTo` `2026-10-18`
- **THEN** se guarda el periodo tal cual

#### Scenario: Periodo invertido

- **WHEN** `dueTo` es anterior a `dueFrom`
- **THEN** responde `400` y no se crea nada

#### Scenario: Título en blanco

- **WHEN** el título está vacío o son espacios
- **THEN** responde `400`

#### Scenario: Una fecha pasada

- **WHEN** se crea con `dueFrom` y `dueTo` anteriores a hoy
- **THEN** se crea y aparece como vencida en el listado `?due=overdue`

#### Scenario: Crear no escribe en el historial

- **WHEN** se crea una tarea de riego sobre una planta
- **THEN** la cronología y las lecturas de esa planta no cambian

#### Scenario: Tipo desconocido

- **WHEN** el tipo es `fumigar`
- **THEN** responde `400`

### Requirement: Destino de una tarea

El destino de una tarea SHALL ser **una localización** (`locationId`) **o un conjunto expreso de plantas** (`plantIds`, de 1 a 500, sin repetidas), nunca los dos ni ninguno. Una localización o una planta inexistente SHALL responder `400`, no `404`. Las plantas expresas SHALL estar en un estado **en curso**; una planta archivada (cedida, vendida, muerta o perdida) SHALL rechazarse con `400`. Más de 500 plantas SHALL responder `400`. La respuesta SHALL describir el destino: para una localización, su id, nombre y ruta; para plantas, su número y, en el detalle, las plantas (id, código y apodo).

#### Scenario: Una localización

- **WHEN** se crea con `locationId` de «Invernadero 2»
- **THEN** el destino es esa localización y no se guarda ninguna lista de plantas

#### Scenario: Varias plantas

- **WHEN** se crea con tres `plantIds`
- **THEN** el detalle de la tarea lista esas tres plantas con su código y apodo

#### Scenario: Las dos cosas a la vez

- **WHEN** se envían `locationId` y `plantIds`
- **THEN** responde `400`

#### Scenario: Ninguna

- **WHEN** no se envía ninguno
- **THEN** responde `400`

#### Scenario: Referencias inexistentes

- **WHEN** alguna planta o la localización no existe
- **THEN** responde `400` y no se crea la tarea

#### Scenario: Planta archivada

- **WHEN** una de las plantas está `vendida` o `muerta`
- **THEN** responde `400`

#### Scenario: Demasiadas plantas

- **WHEN** se envían 501 plantas
- **THEN** responde `400`

### Requirement: Consulta de una tarea

`GET /tasks/{id}` SHALL devolver la tarea con `id`, `type`, `title`, `priority`, `status`, `dueFrom`, `dueTo`, `notes`, `origin`, su destino y las marcas de auditoría. Una tarea **completada** SHALL traer además `completion` con `completedAt` y el número de plantas afectadas; una **omitida** o **cancelada**, su `closedReason` si lo tiene. Una tarea inexistente SHALL responder `404`.

#### Scenario: Detalle de una tarea pendiente

- **WHEN** se pide una tarea pendiente
- **THEN** trae sus datos y su destino y no trae `completion`

#### Scenario: Detalle de una tarea completada

- **WHEN** se pide una tarea completada
- **THEN** trae `completion.completedAt` y `completion.affectedPlants`

#### Scenario: Tarea inexistente

- **WHEN** el id no existe
- **THEN** responde `404`

### Requirement: Editar y reprogramar una tarea pendiente

`PUT /tasks/{id}` SHALL **reemplazar por completo** los datos de una tarea **pendiente** (tipo, título, prioridad, periodo, notas y destino), con las mismas reglas que el alta. `PUT /tasks/{id}/schedule` SHALL cambiar solo `dueFrom` y `dueTo`. Una tarea que no esté pendiente SHALL responder `409` a ambas: **lo completado no se modifica en silencio**. Un rechazo no SHALL cambiar nada.

#### Scenario: Reprogramar

- **WHEN** se hace `PUT /tasks/{id}/schedule` con otro periodo
- **THEN** la tarea conserva todo lo demás y el nuevo periodo

#### Scenario: Cambiar el destino

- **WHEN** se edita una tarea de plantas para dirigirla a una localización
- **THEN** la tarea ya no tiene plantas expresas

#### Scenario: Una tarea completada no se edita

- **WHEN** se intenta editar o reprogramar una tarea completada
- **THEN** responde `409` y la tarea no cambia

#### Scenario: Una edición inválida no cambia nada

- **WHEN** el título del reemplazo está en blanco
- **THEN** responde `400` y la tarea sigue como estaba

### Requirement: Vencida se calcula

Una tarea SHALL considerarse **vencida** cuando está `pendiente` y su `dueTo` es anterior a la fecha de referencia. «Vencida» SHALL NOT ser un estado almacenado ni elegible. `GET /tasks?due=overdue` SHALL devolver las vencidas y `?due=today` las pendientes cuyo periodo contiene la fecha de referencia. La fecha de referencia SHALL ser el parámetro `today` (`AAAA-MM-DD`) si se envía y, si no, la fecha del reloj inyectado en UTC. Una tarea omitida, cancelada o completada SHALL NOT ser vencida nunca.

#### Scenario: Pendiente con fecha pasada

- **WHEN** una tarea pendiente termina ayer y se pide `?due=overdue`
- **THEN** figura en el resultado sin que nadie la haya marcado

#### Scenario: Hoy es el último día

- **WHEN** una tarea pendiente termina hoy
- **THEN** no está vencida y figura en `?due=today`

#### Scenario: Un periodo que contiene hoy

- **WHEN** una tarea va del lunes al domingo y hoy es miércoles
- **THEN** figura en `?due=today` y no en `?due=overdue`

#### Scenario: Lo cerrado no vence

- **WHEN** una tarea pasada está completada, omitida o cancelada
- **THEN** no figura en `?due=overdue`

#### Scenario: El cliente declara qué día es

- **WHEN** se pide `?due=overdue&today=2026-10-20`
- **THEN** la comparación usa esa fecha y no la del servidor

### Requirement: Listado de tareas con filtros combinables

`GET /tasks` SHALL devolver las tareas paginadas con el envelope `PageResponse` (ADR-009). Los filtros SHALL combinarse con `AND`: `status` (repetible; por defecto, solo `pendiente`), `type` y `priority` (repetibles), `q` (coincidencia parcial sobre el título), `from` y `to` (las tareas cuyo periodo **se solapa** con el intervalo), `due` y `today`, `location` con `includeDescendants`, `plant` y `species`. `location` SHALL admitir las tareas dirigidas a esa localización **o a sus sublocalizaciones** (con `includeDescendants=true`) **y** las dirigidas a plantas expresas que estén ahora en ella. `plant` SHALL admitir las tareas que apuntan a esa planta de forma expresa **o** a la localización donde está o a cualquiera de sus ascendientes. `species` SHALL admitir las tareas con alguna planta expresa de esa especie. El orden SHALL ser `sort=<clave>,<dir>` con las claves públicas `due`, `createdAt` y `title`, estable por identificador, y por defecto `due`. Un valor, una clave o una fecha inválidos SHALL responder `400`.

#### Scenario: Por defecto, las pendientes

- **WHEN** hay tareas pendientes y completadas y se pide `GET /tasks`
- **THEN** solo vienen las pendientes

#### Scenario: Varios estados

- **WHEN** se pide `?status=completada&status=omitida`
- **THEN** vienen las de cualquiera de los dos estados

#### Scenario: El calendario de un mes

- **WHEN** se pide `?from=2026-10-01&to=2026-10-31`
- **THEN** vienen las tareas cuyo periodo toca octubre, incluida una que empieza el 28 de septiembre y acaba el 2 de octubre

#### Scenario: Tareas de una localización con sus sublocalizaciones

- **WHEN** hay una tarea dirigida a una bandeja dentro de «Invernadero 2» y una tarea de plantas expresas que están en ella, y se pide `?location=<Invernadero 2>&includeDescendants=true`
- **THEN** vienen las dos

#### Scenario: Tareas que afectan a una planta

- **WHEN** una planta está en una bandeja y existe una tarea sobre el invernadero que la contiene, otra sobre ella misma y otra sobre un invernadero distinto, y se pide `?plant=<id>`
- **THEN** vienen las dos primeras

#### Scenario: Por especie

- **WHEN** se pide `?species=<id>`
- **THEN** vienen las tareas con alguna planta expresa de esa especie

#### Scenario: Texto

- **WHEN** se pide `?q=raíces`
- **THEN** vienen las tareas cuyo título lo contiene, sin distinguir mayúsculas y con `%` como texto

#### Scenario: Orden por periodo

- **WHEN** se pide `?sort=due,asc`
- **THEN** vienen de la que acaba antes a la que acaba después, con el identificador como desempate

#### Scenario: Clave de orden ajena

- **WHEN** se pide `?sort=notes,asc`
- **THEN** responde `400`

#### Scenario: Valor inválido

- **WHEN** se pide `?type=fumigar` o `?from=ayer`
- **THEN** responde `400`

### Requirement: Alcance de una tarea

`GET /tasks/{id}/scope` SHALL devolver, paginadas, **las plantas que la tarea afectaría ahora**: las plantas expresas que estén en estado en curso o, si el destino es una localización, **las plantas en curso que hay en ella y en sus sublocalizaciones en este momento**. Cada planta SHALL traer id, código, apodo, especie y ruta de su localización. El resultado SHALL ordenarse por código. Una tarea inexistente SHALL responder `404`.

#### Scenario: Una localización con sublocalizaciones

- **WHEN** la tarea apunta a «Invernadero 2» y hay 6 plantas en curso entre el invernadero y sus bandejas
- **THEN** el alcance trae las 6 y su total es 6

#### Scenario: Una planta que se mudó

- **WHEN** una planta se movió a otro invernadero después de crear la tarea
- **THEN** ya no figura en el alcance

#### Scenario: Una planta que llegó después

- **WHEN** una planta se movió a «Invernadero 2» después de crear la tarea
- **THEN** figura en el alcance

#### Scenario: Plantas archivadas

- **WHEN** una planta de una tarea de plantas expresas pasó a `muerta`
- **THEN** no figura en el alcance

#### Scenario: Paginado

- **WHEN** el alcance tiene 300 plantas y se pide `?size=100`
- **THEN** trae 100 y `totalElements` es 300

### Requirement: Completar una tarea

`POST /tasks/{id}/complete` SHALL completar una tarea **pendiente**, con `completedAt` opcional (por defecto, ahora; no futuro) y `excludedPlantIds` opcional. En **una sola transacción** SHALL calcular el alcance de ese instante, quitarle las plantas excluidas y escribir **un evento `tarea` en la cronología de cada planta incluida**, con el instante de la finalización, y **ninguno en las excluidas**; y SHALL pasar la tarea a `completada` con su `completedAt` y el número de plantas afectadas. Una exclusión que no pertenece al alcance SHALL responder `400`. Un alcance que quede vacío SHALL responder `400`: no se completa una tarea que no afecta a ninguna planta. Completar una tarea que no está pendiente SHALL responder `409` y no escribir nada; dos finalizaciones simultáneas SHALL dejar una sola. Si algo falla, no SHALL quedar ni la tarea completada ni un evento suelto.

#### Scenario: Completar una tarea de una planta

- **WHEN** se completa una tarea dirigida a una planta
- **THEN** la tarea queda `completada` y la cronología de esa planta trae un evento `tarea` enlazado a ella

#### Scenario: Una tarea de grupo con excepciones

- **WHEN** una tarea apunta a una localización con 6 plantas y se completa excluyendo 2
- **THEN** las 4 restantes reciben su evento, las 2 excluidas no, y la tarea dice 4 plantas afectadas

#### Scenario: Una planta que llegó después de crear la tarea

- **WHEN** se mueve una planta a la localización de la tarea y luego se completa
- **THEN** la planta recibe su evento

#### Scenario: Una exclusión ajena

- **WHEN** `excludedPlantIds` contiene una planta que no está en el alcance
- **THEN** responde `400` y no se escribe nada

#### Scenario: Se excluye a todas

- **WHEN** las exclusiones dejan el alcance vacío
- **THEN** responde `400` y la tarea sigue pendiente

#### Scenario: Ya completada

- **WHEN** se completa una tarea que ya está completada, omitida o cancelada
- **THEN** responde `409` y no se escribe ningún evento

#### Scenario: Dos finalizaciones a la vez

- **WHEN** llegan dos peticiones simultáneas de completar la misma tarea
- **THEN** una completa y la otra responde `409`, y cada planta tiene un solo evento

#### Scenario: Fecha futura

- **WHEN** `completedAt` es posterior al ahora
- **THEN** responde `400`

#### Scenario: Atomicidad

- **WHEN** falla la escritura del evento de una de las plantas
- **THEN** no queda ninguna planta con evento ni la tarea completada

### Requirement: Completar puede registrar el hecho concreto

`POST /tasks/{id}/complete` SHALL admitir opcionalmente `reading` (una lectura de cultivo con las medidas habituales) y/o `intervention` (una intervención con su tipo y los datos que ese tipo admite), y SHALL registrar **el mismo registro en cada planta incluida**, con la misma finalización como instante, **enlazado a la tarea** (`taskId`). Las reglas de cada registro SHALL ser las de su propio alta: una lectura sin ninguna medida, o una intervención con un dato que su tipo no admite, SHALL responder `400` **y no completar la tarea**. Sin `reading` ni `intervention`, completar SHALL escribir solo el evento de tarea.

#### Scenario: Un riego con agua entregada

- **WHEN** se completa una tarea de riego con `reading.waterAmountMl` 200 sobre 3 plantas
- **THEN** cada una tiene su evento de tarea y su lectura de 200 ml enlazada a la tarea

#### Scenario: Un cambio de maceta

- **WHEN** se completa con `intervention` de tipo `trasplante` y `potSize` 12
- **THEN** cada planta incluida tiene su intervención de trasplante enlazada a la tarea

#### Scenario: Sin registro

- **WHEN** se completa una tarea de protección frente al frío sin registro
- **THEN** cada planta tiene solo su evento de tarea

#### Scenario: Una lectura sin medidas

- **WHEN** `reading` no trae ninguna medida
- **THEN** responde `400` y la tarea sigue pendiente

#### Scenario: Un dato ajeno al tipo

- **WHEN** `intervention` es de tipo `poda` y trae `potSize`
- **THEN** responde `400` y la tarea sigue pendiente

### Requirement: Omitir y cancelar una tarea

`POST /tasks/{id}/skip` y `POST /tasks/{id}/cancel` SHALL pasar una tarea **pendiente** a `omitida` o `cancelada`, con un `reason` opcional (máximo 500 caracteres). SHALL conservar la tarea y su planificación y **no escribir ningún evento ni ninguna lectura** en las plantas. Una tarea que no está pendiente SHALL responder `409`.

#### Scenario: Omitir con motivo

- **WHEN** se omite una tarea con el motivo «lluvia»
- **THEN** queda `omitida`, conserva «lluvia» y las plantas no tienen ningún evento nuevo

#### Scenario: Cancelar sin motivo

- **WHEN** se cancela sin `reason`
- **THEN** queda `cancelada` y sigue consultable

#### Scenario: Ya cerrada

- **WHEN** se cancela una tarea completada
- **THEN** responde `409` y no cambia

#### Scenario: No cuenta como cuidado

- **WHEN** se omite una tarea de riego
- **THEN** no existe ninguna lectura de esa planta enlazada a la tarea

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
