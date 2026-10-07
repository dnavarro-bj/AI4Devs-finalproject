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
2. **`dashboard-operativo`** — el Dashboard con cuatro cifras navegables, carga por zona con tareas y alertas, actividad reciente y acciones rápidas. «Plantas sin revisar» sale de las alertas de T-23; sin tablas nuevas.

Decisiones tomadas: la operación por lote se persiste en una tabla `batch` mínima; la «actividad reciente» es lo que se hizo (lotes, tareas completadas, comentarios e intervenciones, cada lote en una línea); y las lecturas de un lote o de una tarea abren alertas como la individual.
