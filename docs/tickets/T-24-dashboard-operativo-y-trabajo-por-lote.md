# T-24 - Dashboard operativo y trabajo por lote

**Área:** Backend + Frontend
**Historia relacionada:** [F.2](../user-stories/F.2-registrar-cuidados-por-lote.md), [F.3](../user-stories/F.3-consultar-cuidados-pendientes.md)
**Bloque:** 2 — organización del trabajo

## Descripción

Cerrar el bloque conectando el Dashboard con datos reales y permitiendo aplicar una acción a muchas plantas de una vez, que es lo que hace manejable una colección de 2000 ejemplares.

## Alcance

* Dashboard con alertas abiertas, tareas vencidas y de hoy, plantas sin revisar en el intervalo configurado, incidencias por localización y actividad reciente.
* Cada cifra agregada abre el conjunto que representa, ya filtrado.
* Aplicar una acción a plantas seleccionadas, a todas las de una localización o al resultado de un filtro guardado, con confirmación explícita del alcance.
* El número exacto de plantas afectadas se muestra **antes** de guardar.
* Cada planta afectada recibe su evento, conservando que fue una sola operación.

## Criterios de aceptación

* Ninguna cifra del Dashboard es un callejón sin salida: todas navegan a su listado filtrado.
* Una acción por lote declara cuántos elementos afecta antes de ejecutarse.
* Tras una acción sobre 31 plantas, las 31 fichas la muestran en su historial.
* El Dashboard no añade tablas nuevas al modelo.

## Reparto en changes

T-24 se parte en dos changes, en este orden:

1. **`trabajo-por-lote`** — **hecho**. Acciones por lote sobre un alcance de plantas, de una localización o del resultado de un filtro, con el número exacto declarado antes de guardar y un evento por planta con su `batch_id`. Entran **lectura (riego), intervención y comentario**; mover y etiquetar quedan fuera, y «Completar varias» tareas sigue marcado.
2. **`dashboard-operativo`** — **hecho**. El Dashboard con cuatro cifras navegables, carga por zona con tareas y alertas, actividad reciente y acciones rápidas. «Plantas sin revisar» sale de las alertas de T-23; sin tablas nuevas.

Decisiones tomadas: la operación por lote se persiste en una tabla `batch` mínima; la «actividad reciente» es lo que se hizo (lotes, tareas completadas, comentarios e intervenciones, cada lote en una línea); y las lecturas de un lote o de una tarea abren alertas como la individual.

## Resolución

**Cerrado** con dos changes: `trabajo-por-lote` (migración `V17`, `/batches`, [ADR-016](../adr/ADR-016-filtros-y-orden-en-los-listados.md) para el alcance por consulta) y `dashboard-operativo` (sin migración: `GET /activity` y `pendingTasks` por localización). Las decisiones que resolvieron lo pendiente:

* **Acciones por lote**: lectura (riego), intervención y comentario; **mover y etiquetar quedan fuera** y «Completar varias» tareas sigue marcado. Los tres alcances del ticket entran: plantas seleccionadas, una localización y el resultado de un filtro (la consulta del inventario, que es lo que es una vista guardada).
* **La operación se persiste** como una fila `batch` mínima (tipo, alcance, número real de plantas e instante); los eventos llevan su `batch_id`. Las lecturas de un lote y las de completar una tarea **abren alertas** como la individual.
* **«Plantas sin revisar»** sale de las alertas de `sin_revisar` de T-23: una sola definición de «revisión».
* **«Actividad reciente»** es lo que se hizo: lotes (una línea cada uno), tareas completadas, comentarios e intervenciones sueltos; sin tabla nueva.

Apartados del prototipo, con su motivo: el Dashboard tiene **cuatro** cifras en vez de tres (1.16), «Para hoy» dice cuántas **tareas** y no cuántas plantas, y el panel de actividad y la fila de acciones rápidas son nuevos. **No entra** el resumen de plantas por estado (§4.1).
