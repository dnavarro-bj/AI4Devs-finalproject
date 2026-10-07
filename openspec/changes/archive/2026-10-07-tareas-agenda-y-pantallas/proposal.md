# Proposal: tareas-agenda-y-pantallas

**Ticket:** [T-22](../../../docs/tickets/T-22-tareas.md) — **2 de 2**: las pantallas. **Depende de** `tareas-modelo-y-api` (archivado): consume su API.
**Historias:** [1.10](../../../docs/user-stories/1.10-crear-y-programar-una-tarea.md), [1.11](../../../docs/user-stories/1.11-dirigir-una-tarea-a-varias-plantas.md), [1.12](../../../docs/user-stories/1.12-agenda-y-calendario-de-tareas.md), [1.13](../../../docs/user-stories/1.13-completar-una-tarea.md), [1.14](../../../docs/user-stories/1.14-reprogramar-omitir-o-cancelar-una-tarea.md)
**Pantallas del prototipo:** `tasks` (agenda, calendario y completadas, con el diálogo `#task-dialog`), y los bloques de tareas de `plant-detail`, `location-detail` y `dashboard` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §14.4, §14.5 y §14.6 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

La pantalla `/tasks` tiene la composición completa del prototipo —pestañas, filtros, agenda agrupada, calendario— pero todo lo que hace es maqueta: lee `tasks.mock.ts`, y crear, completar y editar solo muestran un aviso «lo habilita T-22». Con el API de tareas (change 1) la maqueta se vuelve herramienta de trabajo. Además hay tres sitios que muestran «próximo trabajo» inventado —ficha de la planta, ficha de la localización y Dashboard— y una **fecha de referencia fija** (`MOCK_TODAY = 2026-09-03`) que `referenceDate.mock.ts` pide expresamente borrar cuando las tareas sean reales.

## Decisiones de partida

Las del change 1 (§24.14, §24.15, §24.17 y §24.18), de las que dependen estas pantallas:

* **Sin hora**: el prototipo trae un campo «Hora (opcional)» en el diálogo; **se aparta** de él porque el modelo es de periodos de días. Es un apartado del prototipo por una decisión de producto, no por falta de pieza.
* **El alcance es el de completar**: el diálogo de completar lo muestra y deja excluir.
* **Completar siempre deja un evento; el hecho concreto es opcional**, según el tipo de tarea.

## What Changes

**Pantalla `/tasks`** — agenda, calendario y completadas con datos reales; filtros por localización, tipo y prioridad que viven en la URL (`useUrlState`); `?due=overdue|today` desde el Dashboard.

**Formularios y diálogos**

* **Crear / editar** (`TaskForm`, ya existente, reescrito): tipo, prioridad, título, **destino** —localización o plantas concretas con buscador—, periodo de días y notas; sin hora.
* **Completar**: diálogo nuevo que **muestra el alcance exacto**, pagina las plantas, deja **excluir** y pide la fecha; con el registro opcional de lectura de agua, trasplante o poda según el tipo. **No existe en el prototipo**: se diseña desde §14.4 y el ticket, y se compone sobre piezas del kit.
* **Reprogramar**, **omitir** (motivo opcional) y **cancelar** (con confirmación), desde un menú de acciones por tarea.

**Otros sitios** — la **ficha del ejemplar** muestra su próximo trabajo real y «Crear tarea» con la planta como destino; la **ficha de la localización** activa «Crear tarea aquí», cuenta sus tareas y lista el próximo trabajo; la **cronología** reconoce el tipo `tarea`; el **Dashboard** lee tareas reales (su agenda y las cifras de vencidas y de hoy) y conserva marcadas las alertas (T-23) y las tareas por zona (T-24). `referenceDate.mock.ts` se borra y la fecha de referencia pasa a ser el día real.

**Kit** — `UiActionMenu` (menú «•••» con acciones nombradas): lo necesitan la fila de tarea y, a partir de ahora, cualquier fila con acciones, y hoy ya hay un panel parecido a mano en las vistas guardadas.

## Non-goals

* **Acciones por lote sobre varias tareas** («Completar varias») y crear tareas desde la selección del inventario: T-24; siguen marcadas.
* **Crear tareas desde una alerta o desde una recomendación de la IA**: T-23; siguen marcadas. El formulario admite valores iniciales precisamente para que lleguen sin rehacerlo.
* **Recurrencia, reglas y sugerencias automáticas** (§14.8) y **tareas configurables**.
* **Hora del día y notificaciones.**
* **Registrar un hecho distinto por planta al completar**: el mismo registro se aplica a todas las incluidas; si una necesita otro, se excluye y se registra aparte.
* **Tareas por zona del Dashboard** (T-24) y el resto de su operativa.
* **Una pantalla de detalle de tarea**: el prototipo no la tiene; se edita en el diálogo.
