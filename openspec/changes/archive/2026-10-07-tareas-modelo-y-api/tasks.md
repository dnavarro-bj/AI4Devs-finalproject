# Tasks: tareas-modelo-y-api

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisitos previos:** ninguno pendiente (`cronologia-del-ejemplar`, T-20, y `vistas-guardadas-y-grupos-de-especies`, V14, archivados). Migración `V15`.

## 1. Esquema y dominio

- [x] 1.1 Tests de esquema (`TaskSchemaTest`): `CHECK`s de tipo, prioridad, estado y origen; título no en blanco; `due_to ≥ due_from`; `completed_at` solo en completadas; `closed_reason` solo en omitidas o canceladas; `task_plant` con clave compuesta y cascada al borrar la tarea; `plant_event` admite `tarea`; `plant_task_event` exige tarea; `task_id` en `care_record` y `plant_intervention` con FK; localización protegida por `RESTRICT`; datos previos intactos
- [x] 1.2 Migración `V15__tasks.sql`: `task`, `task_plant`, `plant_task_event`, `task_id` nulable en `care_record` y `plant_intervention` con índice parcial, `CHECK plant_event_type_valid` ampliado a `tarea`, e índices por estado y periodo
- [x] 1.3 Tests de dominio de los enums (`TaskType`, `TaskPriority`, `TaskStatus`, `TaskOrigin`) y de `TimelineType.Task`: `value` explícito, `invoke()`, desconocido
- [x] 1.4 Enums y convertidores (ADR-007)
- [x] 1.5 Tests de dominio de `Task`: título recortado y acotado, periodo invertido, destino exclusivo, 1–500 plantas sin repetir, transiciones (completar, omitir y cancelar solo desde pendiente), edición solo en pendiente, rechazo que no cambia nada, motivo acotado
- [x] 1.6 `Task`, `TaskId`, `TaskTarget` y `PlantTaskEvent` (herencia `JOINED`, ADR-008 y ADR-011) con validación antes de asignar; `TaskRepository` y `JpaTaskRepository` (ADR-006, paginado, `findOneByIdForUpdate`)
- [x] 1.7 Tests y soporte para `task_id` en `CareRecord.record` y `PlantIntervention.record` (parámetro opcional); las altas directas no lo aceptan

## 2. Alta, consulta, edición y listado

- [x] 2.1 Tests de API del alta (`TaskCreationApiTest`): día, periodo, prioridad por defecto, periodo invertido, título en blanco, fecha pasada, tipo desconocido, **crear no escribe en historial ni lecturas**
- [x] 2.2 Tests de destino (`TaskTargetApiTest`): localización, plantas con código y apodo en el detalle, las dos cosas, ninguna, referencias inexistentes `400`, planta archivada, 501 plantas
- [x] 2.3 Tests de consulta y edición (`TaskDetailApiTest`, `TaskUpdateApiTest`): detalle de pendiente y de completada, `404`, reemplazo completo, cambiar el destino, reprogramar conservando el resto, no pendiente `409`, edición inválida sin cambios
- [x] 2.4 `TaskService` (mapeo a DTO dentro de la transacción) y `TaskController` con `POST/GET /tasks`, `GET/PUT /tasks/{id}` y `PUT /tasks/{id}/schedule`; excepciones y su traducción en `ApiExceptionHandler`
- [x] 2.5 Tests de «vencida se calcula» (`TaskOverdueApiTest`): pendiente pasada, hoy como último día, periodo que contiene hoy, lo cerrado no vence, `today` del cliente, fecha inválida `400`
- [x] 2.6 Tests del listado (`TaskListApiTest`, `TaskFilterApiTest`): pendientes por defecto, varios estados, intervalo que se solapa, localización con y sin descendientes (destino directo y plantas expresas), planta (expresa y por ascendientes), especie, texto con `%` literal, orden `due` estable, clave ajena, valores inválidos, paginación
- [x] 2.7 `TaskSpecs`, `TaskSortKeys` (clave con varias rutas) y los parámetros de `GET /tasks`; `ADR-016` anota la clave con varias rutas
- [x] 2.8 Suite completa del backend en verde

## 3. Alcance y cierre de una tarea

- [x] 3.1 Tests de alcance (`TaskScopeApiTest`): localización con sublocalizaciones, una planta que se mudó, una que llegó, archivadas fuera, paginado, `404`
- [x] 3.2 `TaskScope` y `GET /tasks/{id}/scope`
- [x] 3.3 Tests de completar (`TaskCompletionApiTest`): una planta, grupo con excepciones, planta que llegó después, exclusión ajena, alcance vacío, ya cerrada `409`, fecha futura, atomicidad con fallo inyectado, evento solo en las incluidas
- [x] 3.4 Tests de concurrencia (`TaskCompletionConcurrencyTest`): dos finalizaciones simultáneas dejan una y un evento por planta
- [x] 3.5 Tests del registro opcional (`TaskCompletionRecordApiTest`): lectura con agua, trasplante, sin registro, lectura sin medidas `400` y tarea sigue pendiente, dato ajeno al tipo, el mismo registro en cada planta, `taskId` en la respuesta
- [x] 3.6 Tests de omitir y cancelar (`TaskSkipCancelApiTest`): con y sin motivo, ya cerrada `409`, sin eventos ni lecturas
- [x] 3.7 `complete`, `skip` y `cancel` en el servicio y el controller, con la fila bloqueada y escritura en bloques de 100 (sin `flush`/`clear` explícitos: `application` no usa `EntityManager`, ADR-006)
- [x] 3.8 Suite completa del backend en verde

## 4. Cronología y enlaces

- [x] 4.1 Tests de la cronología (`PlantTimelineTaskApiTest`): el tipo `tarea` y su detalle `task`, filtro `?type=tarea`, orden estable, omitida y cancelada sin rastro, siete tipos juntos, el evento no se edita por los endpoints de comentarios, intervenciones ni floraciones (`404`)
- [x] 4.2 `TimelineType.Task`, la rama en `PlantTimelineService`, en `toEntry()` y `TimelineTaskResponse`; tests de enums ampliados. Las tareas de una página se cargan por lotes (`@BatchSize` en `Task`), así que no hay una consulta por entrada
- [x] 4.3 `taskId` en `CareRecordResponse` y en el detalle de intervención; las altas directas lo ignoran
- [x] 4.4 Actualizar `clearPlants()` y los helpers de test para las tablas nuevas

## 5. Localizaciones y cierre

- [x] 5.1 Tests de retirada (`LocationWithTasksApiTest`): con tarea pendiente `409`, con completada `409`, sin tareas se retira
- [x] 5.2 `LocationHasTasksException` y su `409`; el mensaje dice que hay tareas que la usan
- [x] 5.3 Suite completa del backend en verde (`./gradlew test --rerun-tasks`)
- [x] 5.4 Actualizar el ticket T-22 (primera parte), `CLAUDE.md`, el README de tickets y el modelo de datos (`docs/diagramas/modelo-datos-actual.md`); archivar en la misma PR
