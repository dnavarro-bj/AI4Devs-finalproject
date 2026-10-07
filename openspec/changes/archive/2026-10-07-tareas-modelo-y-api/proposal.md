# Proposal: tareas-modelo-y-api

**Ticket:** [T-22](../../../docs/tickets/T-22-tareas.md) — **1 de 2**: el modelo, el ciclo de vida y el API. Lo sigue `tareas-agenda-y-pantallas`.
**Historias:** [1.10](../../../docs/user-stories/1.10-crear-y-programar-una-tarea.md), [1.11](../../../docs/user-stories/1.11-dirigir-una-tarea-a-varias-plantas.md), [1.13](../../../docs/user-stories/1.13-completar-una-tarea.md), [1.14](../../../docs/user-stories/1.14-reprogramar-omitir-o-cancelar-una-tarea.md); sirve los datos de [1.12](../../../docs/user-stories/1.12-agenda-y-calendario-de-tareas.md)
**Producto:** §14 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md); resuelve §24.14, §24.15, §24.17 y §24.18

## Why

Las tareas son hoy una maqueta: `tasks.mock.ts` con un modelo marcado **provisional** porque cuatro preguntas del §24 condicionaban el esquema. Con ellas resueltas se puede levantar el módulo que responde «qué trabajo tengo que hacer, cuándo y sobre qué plantas». Es el primer módulo del bloque 2 y de él dependen las alertas (que crearán tareas), el Dashboard operativo y el trabajo por lote (T-24).

El invariante que lo organiza es el de §14.1: **tarea ≠ cuidado**. Una tarea es una intención; un cuidado, un hecho. Crear no escribe en el historial; completar sí; omitir y cancelar conservan que estuvo planificada sin generar un cuidado.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **§24.14 — día o periodo, sin hora.** Fecha de inicio y de fin; un día exacto es inicio = fin. La hora se puede añadir después sin romper nada.
* **§24.15 — el alcance de una tarea de localización es el del momento de completar.** La tarea guarda la localización, no una lista de plantas; al completar se calcula el alcance de entonces y se puede excluir excepciones.
* **§24.17 — sin recurrencia** en la primera entrega. Una regla periódica será un *origen* más de tarea, sin tocar el modelo.
* **§24.18 — completar siempre deja un evento de tarea** en la cronología de cada planta incluida, y **opcionalmente** el registro concreto (lectura con agua, trasplante, poda…) enlazado como «cuidado asociado». No hay tareas «mudas», y no se fuerza una lectura sin medidas (regla de T-03).

## What Changes

**Esquema** — migración `V15`: `task`, `task_plant` (el destino cuando son plantas expresas) y `plant_task_event` (satélite de `plant_event` para el tipo `tarea`); `task_id` nulable en `care_record` y `plant_intervention`; el `CHECK` de tipos de `plant_event` admite `tarea`.

**Backend**

* **`POST/GET /tasks`, `GET/PUT /tasks/{id}`**: un tipo (`riego`, `proteccion_frio`, `proteccion_sol`, `poda_raices`, `cambio_maceta`, `otra`), título, prioridad (`alta`, `normal`, `baja`), periodo, notas y origen (`manual`). Destino: **una localización o un conjunto expreso de 1 a 500 plantas**, nunca las dos cosas. Editar solo se admite en una tarea pendiente.
* **Estados**: `pendiente`, `completada`, `omitida`, `cancelada`. **«Vencida» no se almacena**: es una tarea pendiente cuyo fin ya pasó, y se pide con `?due=overdue`.
* **`PUT /tasks/{id}/schedule`** reprograma; **`POST /tasks/{id}/skip`** omite con un motivo opcional; **`POST /tasks/{id}/cancel`** cancela. Ninguna escribe en el historial de las plantas.
* **`GET /tasks/{id}/scope`**: las plantas que se verían afectadas **ahora**, paginadas; es lo que el diálogo de completar muestra antes de confirmar.
* **`POST /tasks/{id}/complete`**: calcula el alcance de ese instante, descarta las exclusiones y escribe **un evento `tarea` por planta incluida** —y ninguno por las excluidas— en una sola transacción. Admite un registro opcional (`reading` y/o `intervention`) que se aplica a cada planta incluida y queda enlazado a la tarea. Completar una tarea que ya no está pendiente responde `409`.
* **Listado** con filtros combinables —estado, tipo, prioridad, localización (con `includeDescendants`), planta, especie, intervalo, `due` y texto— y orden por claves públicas (ADR-016), paginado (ADR-009).
* **Cronología**: `GET /plants/{id}/timeline` gana el tipo `tarea`, con el detalle `task`.
* **Localizaciones**: retirar una localización a la que apunta alguna tarea responde `409`.

## Non-goals

* **Las pantallas** (agenda, calendario, completadas, diálogos): `tareas-agenda-y-pantallas`.
* **Recurrencia, reglas automáticas, meteorología y notificaciones** (§14.8): fuera de la primera entrega.
* **Asignación a trabajadores**: no hay usuarios.
* **Acciones por lote sobre varias tareas** y el registro por lote que escribe `batch_id`: T-24. Completar una tarea de grupo **no** rellena `batch_id`; es el mismo concepto pero lo estrena T-24.
* **Tipos de tarea configurables** (§24.16): «Otra» con título libre basta por ahora.
* **Borrar tareas**: una tarea omitida o cancelada conserva que estuvo planificada; no hay `DELETE`.
* **Crear tareas desde alertas** (T-23) y **sugerencias de la IA**: llegan con sus tickets como nuevos orígenes.
* **Hora del día** y **zona horaria del usuario**: ver la decisión 6 del design.
