# Proposal: dashboard-operativo

**Ticket:** [T-24](../../../docs/tickets/T-24-dashboard-operativo-y-trabajo-por-lote.md) — **2 de 2**: el Dashboard operativo. **Depende de** `alertas-con-ciclo-de-vida` (T-23) y de `trabajo-por-lote`, ambos archivados.
**Historias:** [1.16](../../../docs/user-stories/1.16-consultar-el-dashboard-operativo.md), [F.3](../../../docs/user-stories/F.3-consultar-cuidados-pendientes.md)
**Pantalla del prototipo:** `dashboard` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §4.1 y §4.2 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

El Dashboard abre la aplicación y debe responder «¿qué requiere mi atención?». Tras T-22 y T-23 sus tareas y sus alertas son reales; lo que sigue siendo maqueta, o directamente no existe, es lo que el ticket pide para cerrarlo: **las tareas y las incidencias por zona**, **«plantas sin revisar»**, **la actividad reciente** y **las acciones rápidas**, incluida la del cuidado por lote que estrena `trabajo-por-lote`. Mientras tanto la carga por zona declara «lo habilita T-22» y el número de tareas de cada zona está marcado T-24.

El criterio del ticket es de producto: **ninguna cifra es un callejón sin salida**; todas navegan a su listado ya filtrado. Y no añade tablas: es una pantalla que lee lo que otros módulos ya guardan.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **«Actividad reciente»** es el feed de **lo que se hizo**: lotes, tareas completadas, comentarios e intervenciones; **cada lote es una sola línea**, no una por planta. Un endpoint `GET /activity` que une fuentes, **sin tabla nueva**.
* **«Plantas sin revisar»** sale de **las alertas** de `alertas-con-ciclo-de-vida`, que ya detectan `sin_revisar` con su intervalo: el Dashboard cuenta esas alertas abiertas. **Una sola definición de «revisión»** y ninguna lógica duplicada.

## What Changes

**Backend**

* **`GET /activity`**, paginado (ADR-009) y del más reciente al más antiguo: entradas de tipo `lote` (su acción y su número de plantas), `tarea` (la tarea completada y las plantas afectadas), `comentario` e `intervencion` (con su planta). **Un comentario o intervención que pertenece a un lote o a una tarea no aparece solo**: ya lo representa su lote o su tarea.
* **`GET /locations` y `GET /locations/{id}`** traen **`pendingTasks`**: las tareas pendientes que afectan a esa localización —dirigidas a ella o a plantas que están en ella—, **totales** con sus sublocalizaciones, con una consulta agregada y no una por fila, como ya hacen el recuento de plantas y `openAlerts`.

**Frontend** — la pantalla `dashboard`, ya sin ninguna marca de maqueta:

* **Cuatro cifras navegables**: vencidas, para hoy, alertas abiertas y **plantas sin revisar**; cada una abre su listado ya filtrado y quitable.
* **Carga por zona** con las plantas, las **tareas pendientes** y las **alertas abiertas** de cada localización, con la barra proporcional; cada zona abre su ficha.
* **Actividad reciente**, un panel nuevo en la columna lateral, con cada lote colapsado en una línea.
* **Acciones rápidas**: añadir planta, crear tarea, **registrar un cuidado por lote**, abrir la agenda, abrir las localizaciones y revisar alertas.

## Non-goals

* **Resumen de plantas por estado** (§4.1): no está en el ticket ni en el prototipo; se puede pedir con una historia propia.
* **«N plantas afectadas» bajo «Para hoy»** (el prototipo lo muestra): exigiría calcular el alcance de cada tarea del día, una por una; la cifra dice cuántas tareas.
* **«Registrar una observación o cuidado» individual** como acción rápida: necesita elegir una planta primero y esa búsqueda ya existe en el inventario.
* **Una pantalla de actividad o historial general**: el historial pertenece a la ficha de cada planta (§2 del producto); el Dashboard solo resume.
* **Actualizar solo, notificaciones y personalizar el Dashboard.**
* **Filtrar la actividad por tipo** y abrir un lote desde ella: sin pantalla de lotes (`trabajo-por-lote`).
* **Una tabla nueva** de actividad o de estadísticas.
