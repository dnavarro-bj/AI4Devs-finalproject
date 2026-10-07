# Design: tareas-modelo-y-api

## Contexto

No hay nada de tareas en el backend. La cronología del ejemplar (T-20) une `care_record`, `plant_status_change`, `plant_movement` y la espina `plant_event` con sus satélites (`plant_comment`, `plant_intervention`, `plant_bloom`) mediante un `UNION ALL` nativo; `TimelineType` es el enum de tipos, `PlantTimelineService` carga el detalle con una consulta por tipo y `TimelineEntries.toEntry()` lo mapea. Las intervenciones y las lecturas se crean por `PlantEventService.addIntervention` y `CareRecord.record(...)`, con constructor privado y reloj inyectado. `LocationHierarchy` ya resuelve subárboles y ascendientes con consultas recursivas. El borrador de gestión de [docs/diagramas/](../../../docs/diagramas/README.md) esboza `TASK` y `TASK_TARGET`.

**Dependencia:** `plant_event.batch_id` existe desde T-20 pero solo es de lectura; **este change no lo escribe**.

## Contraste con el borrador, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| §14.3 | Estado: pendiente, completada, omitida o cancelada; «Vencida» calculada | Idem. `overdue` nunca se almacena. |
| §14.3 | «Fecha de finalización» y «Cuidado asociado» en la tarea | La finalización va en la tarea; el **cuidado asociado** es el `task_id` de la lectura o intervención, **por planta**: una tarea de grupo tiene un registro por planta, no uno. |
| §14.4 | Destino: planta, varias o localización | Idem, **exclusivo**: o localización o plantas expresas. Mezclar las dos obligaría a decidir qué gana al calcular el alcance. |
| §14.5 | Editar tipo, título, destinatarios, prioridad, fecha, hora y notas | **Sin hora** (decisión 1). Solo pendientes. |
| §14.5 | Filtros por tipo, estado, prioridad, localización, especie, planta, origen | Todos menos origen (hoy solo existe `manual`). |
| Ticket | Tipos: riego, frío, sol, poda de raíces, cambio de maceta y «otra» | Idem; sin tipos configurables (§24.16). |
| Ticket | «Completar crea o enlaza el registro» | Evento `tarea` siempre; registro concreto opcional y enlazado (decisión 4). |

## Decisiones

**1. El periodo son dos fechas de calendario, `DATE`.** `due_from` y `due_to`, con `due_to ≥ due_from` como `CHECK`; un día exacto es `due_from = due_to`. ADR-010 manda `Instant` para los *instantes*; una fecha prevista de trabajo no lo es (como la fecha de adquisición del ejemplar): es un día del calendario del usuario, y convertirla a instante obligaría a elegir una zona que no existe. El orden `due` usa `due_to` y luego `due_from`, que es lo que agenda y vencimiento necesitan.

**2. «Vencida» es una comparación contra una fecha de referencia que declara el cliente.** `overdue` = `status = 'pendiente' AND due_to < :today`. El servidor no conoce la zona del usuario —no hay usuarios—, así que `today` es un parámetro opcional del listado y, **solo si falta**, se toma la fecha del `Clock` inyectado en UTC. Es la misma regla que ya rige en el frontend (ningún componente consulta el reloj): quien pregunta dice qué día es, y entre medianoche UTC y la medianoche local no hay dos respuestas distintas para el mismo usuario. No se añade `overdue` a la respuesta: el cliente ya lo calcula con su fecha, y devolverlo calculado con la del servidor reintroduciría el desajuste.

**3. Un destino, dos formas, una tabla.** `task.location_id` nulable y `task_plant(task_id, plant_id)` para las plantas expresas, con **clave primaria compuesta** (como `plant_tag`). «O una cosa o la otra» es una regla de conjunto —un `CHECK` no puede mirar otra tabla— y vive en el dominio (ADR-011): `Task` construye su destino como un tipo cerrado (`TaskTarget.Location` o `TaskTarget.Plants`) y no existe una tarea sin él. Tope de 500 plantas expresas en el dominio, para que el detalle de una tarea sea acotado (ADR-009); una tarea más amplia se dirige a una localización. La FK de `location_id` es `RESTRICT`: lo que cuelga de una localización la protege (`409`), igual que movimientos y ejemplares.

**4. Completar escribe siempre un evento y, opcionalmente, el hecho.** El evento es un `PlantTaskEvent`, nuevo satélite de `plant_event` (`plant_task_event(event_id, task_id)`, tipo `tarea`), así que hereda sus reglas —instante no futuro, orden estable, índice por planta e instante— y la cronología lo recoge por la cuarta rama del `UNION` sin tocarla. Añadir el tipo exige: `TimelineType.Task("tarea")`, la rama en `PlantTimelineService.eventTypes`, la rama en `PlantEvent.toEntry()` y el `CHECK plant_event_type_valid` ampliado en la migración. El hecho concreto reutiliza `CareRecord.record(...)` y `PlantIntervention.record(...)` —**no se duplica ninguna regla**— con un `task_id` nulable para el enlace. Se aplica **el mismo registro a cada planta incluida**: una tarea de «cambio de maceta» de 12 cm se registra igual en todas; si en una el tamaño fue distinto, se excluye y se registra aparte. Es una limitación explícita, no un olvido: un registro distinto por planta es trabajo por lote y lo estrena T-24. El enlace **solo** lo establece completar: las altas directas ignoran `taskId`.

**5. El alcance se calcula al completar, y el cálculo se comparte.** `TaskScope` resuelve, para una tarea, las plantas **en curso** afectadas: las expresas con estado en curso, o las de `LocationHierarchy.subtreeIds(location)` con el filtro de estado de siempre (`PlantSpecs.byLocations` + `byStatuses(inProgress)`), ordenadas por código. `GET /tasks/{id}/scope` lo pagina para que el diálogo lo muestre; `complete` lo recorre entero en bloques de 100. **Es el mismo código**: lo que el usuario ve antes de confirmar es, por construcción, lo que se escribe, salvo que el inventario cambie entre el diálogo y la confirmación (el cuerpo de `complete` solo trae las **exclusiones**, no la lista de incluidas, justamente para que una planta que llegó entre medias no quede sin su evento). Ese margen es el que dice el spec: se completa con el alcance **de ese instante**.

**6. Completar es una transacción con la fila de la tarea bloqueada.** `findOneByIdForUpdate` serializa dos finalizaciones simultáneas: la segunda ve la tarea ya `completada` y responde `409`. Dentro: comprobar `pendiente`, calcular el alcance, validar exclusiones y registro, escribir los eventos y los registros, y cerrar la tarea. Cualquier excepción revierte todo, que es lo que exige «no queda ni la tarea completada ni un evento suelto». Con una localización de 2.000 plantas son 2.000 filas de `plant_event` y de `plant_task_event` en una transacción: se insertan en bloques con `flush`/`clear` cada 100, igual que cualquier carga masiva.

**7. El listado son `Specification`s, con el patrón de T-21.** `TaskSpecs` compone filtros nulos-si-no-aplican; `TaskSortKeys` extiende `SortKeys` con **una clave pública que mapea a varias rutas** (`due` → `dueTo`, `dueFrom`), y reutiliza `LikePattern` y la convención de ADR-016 (parámetros planos, repetibles = `OR`, `400` ante lo desconocido). El filtro por `location` es `task.location ∈ S OR EXISTS (task_plant ⋈ plant WHERE plant.location ∈ S)` y el de `plant`, `EXISTS(task_plant) OR task.location ∈ ancestros(plant.location)`: dos subconsultas y ningún `DISTINCT`. Un `?due=overdue` es una condición, no un estado, así que compone con el resto.

**8. Sin `DELETE`.** Una tarea omitida o cancelada **conserva que estuvo planificada** (§14.1); una completada es historia. Equivocarse al crear se resuelve cancelando. Un `DELETE` obligaría a decidir qué pasa con los eventos y registros enlazados, y la respuesta correcta es que no se borre.

## Riesgos / compromisos

* **El mismo registro para todas las plantas incluidas.** Documentado; la salida es excluir y registrar aparte, y el registro individual por planta llega con el trabajo por lote.
* **Completar una localización enorme es lento.** 2.000 plantas son 4.000 inserciones más los registros opcionales en una transacción; es del orden de segundos y bloquea la fila de la tarea, no el inventario. Si fuera un problema, el paso a hacer es escribir los eventos con una sentencia `INSERT … SELECT` en vez de por entidades; no se anticipa.
* **El alcance puede cambiar entre el diálogo y la confirmación.** Es deliberado (decisión 5) y la respuesta de `complete` dice cuántas plantas se afectaron realmente.
* **`today` por parámetro.** Un cliente que lo omita obtiene la fecha UTC y puede ver una tarea «de hoy» como vencida unas horas. El frontend lo envía siempre.
* **Una tarea a plantas expresas que luego se archivan.** Dejan de contar en el alcance y la tarea puede quedarse sin ninguna: completarla responde `400`; la salida es cancelarla.
