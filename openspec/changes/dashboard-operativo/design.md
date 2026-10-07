# Design: dashboard-operativo

## Contexto

El Dashboard ya tiene, tras T-22 y T-23, su agenda y su carga por zona de localizaciones reales, la cifra de vencidas y de hoy con las tareas reales y las alertas del API. Lo que no tiene es lo que el ticket cierra: tareas e incidencias por zona, plantas sin revisar, actividad reciente y acciones rápidas. El criterio de T-24 es que **no añade tablas**: todo se lee de lo que otros módulos guardan. `trabajo-por-lote` deja la fila `batch` y el `batch_id` de los eventos; T-22, `task` y `plant_task_event`; T-23, `alert` y `openAlerts`.

**Dependencia y reconciliación de specs.** Este change se aplica tras **archivar** `alertas-con-ciclo-de-vida` y `trabajo-por-lote`. T-23 modifica el requisito «Dashboard de trabajo» y «Ficha de una localización»; el texto vigente de «Dashboard de trabajo» depende de que T-23 esté archivada, así que **este change lo añade como requisitos nuevos y no lo copia**; la primera tarea del apply es **reconciliar** el requisito vigente (marcas T-24 que desaparecen, composición con cuatro cifras) con un `MODIFIED` ya sobre el texto real.

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Prototipo `dashboard` | **Tres** cifras: vencidas, para hoy y alertas | **Cuatro**: se añade «plantas sin revisar» (1.16). Se aparta del prototipo por el ticket. |
| Prototipo `dashboard` | «Para hoy · 43 plantas afectadas» | Dice cuántas **tareas**, no cuántas plantas: el alcance de cada tarea habría que calcularlo una a una. Fuera de alcance. |
| Prototipo `dashboard` | Carga por zona con «486 plantas · 21 tareas» | Se reproduce, con `pendingTasks`, y se añade el número de alertas. |
| Prototipo `dashboard` | **No tiene** panel de actividad ni acciones rápidas (solo el botón «Crear tarea» de la cabecera) | Se añaden: actividad reciente en la columna lateral y una fila de acciones rápidas bajo la cabecera. Apartarse del prototipo por falta de pieza, y por §4.1, §4.2 y 1.16. |
| Producto §4.1 | Resumen de plantas por estado | **Fuera**: ni el ticket ni el prototipo lo piden. |
| Producto §4.2 | «Registrar una observación o cuidado» individual | **Fuera**: elige una planta, y esa elección ya existe en el inventario. |

## Decisiones

**1. La actividad es una lectura que une, como la cronología.** `GET /activity` es un `UNION ALL` nativo —igual que `NativePlantTimelineRepository`— sobre cuatro proyecciones `(tipo, id, instante)`: las filas de `batch`, las de `task` completadas (por `completed_at`), los comentarios y las intervenciones **sin `batch_id` y sin `task_id`**. Ese filtro es la regla de producto «un lote es una línea»: el comentario de una planta que es parte de un lote **no** compite con su lote. Una consulta devuelve la página de referencias y una segunda por tipo carga el detalle, como la cronología; no se copia nada ni hay tabla propia. Con índices por instante en las cuatro fuentes —`batch` y `task` los necesitan; los eventos ya tienen el suyo—, y 2.000 plantas, es una lectura barata y acotada por la página.

**2. `pendingTasks` se calcula como `openAlerts`.** Es el mismo patrón que ya resuelve el recuento de plantas y de alertas por localización: **una consulta agregada** para todo el listado, con los totales del subárbol (CTE recursiva de `LocationHierarchy`) y un `COUNT(DISTINCT task)` por localización, para que una tarea que alcanza la misma localización por dos vías cuente una. Es **la misma semántica** que `GET /tasks?location=&includeDescendants=true`, y un test las compara: el número del Dashboard y el del listado al que lleva no pueden discrepar.

**3. «Sin revisar» es una consulta a las alertas, no una definición nueva.** La cifra es `GET /alerts?origin=sin_revisar&status=nueva&status=revisada&size=1` y su `totalElements`. Duplicar la lógica de «sin ninguna observación en N días» habría dado dos números para lo mismo, uno en el Dashboard y otro en la bandeja a la que lleva. Si el proceso programado de T-23 se apagase por configuración, la cifra vale 0 —y se dice, no se oculta—.

**4. Una petición por bloque, y cada bloque falla solo.** El Dashboard pide en paralelo: tareas (agenda, vencidas y de hoy), alertas (lista y recuentos), localizaciones con sus recuentos y actividad. **Ningún bloque depende de otro ni del resto**: cada panel tiene su estado de carga y su error con reintento, y el fallo de uno no vacía los demás (es el comportamiento que ya tienen la carga por zona y la agenda). Las «vencidas hace más de una semana» se calculan sobre la lista de vencidas que ya se carga, sin petición extra.

**5. Las acciones rápidas son composición.** Una fila de botones del kit; «Crear tarea» abre el `TaskDialogs` de T-22 y «Registrar un cuidado por lote» el `BatchDialog` de `trabajo-por-lote` **sin alcance**: el diálogo gana un modo en el que primero se elige la localización (con el mismo selector y la misma previsualización), y así el alcance sigue siendo un valor y no una excepción. Las demás son enlaces.

**6. Las cifras son enlaces con filtro, no manejadores.** Cada cifra es un `UiStatTile` con su ruta, que ya incluye el filtro como parámetro de URL (`?due=overdue`, `?origin=sin_revisar&status=…`). La pantalla destino ya lee esos parámetros (tareas con `useUrlState`; la bandeja de alertas de T-23): el criterio del ticket «ninguna cifra es un callejón sin salida» se cumple por construcción y lo verifica un test por cifra.

## Riesgos / compromisos

* **La actividad puede inundarse de comentarios sueltos.** Con 2.000 plantas y mucho uso, los comentarios individuales pueden empujar fuera lo demás de las últimas ocho líneas. Es la lectura honesta de «lo que se hizo»; si molesta, filtrar por tipo es un parámetro, no un cambio de modelo (fuera de alcance hoy).
* **Un lote cuyos registros se borran sigue contando.** La actividad lee `batch.plant_count`, que es lo que **se hizo**, no lo que sobrevive (decisión 3 de `trabajo-por-lote`).
* **La cifra de «sin revisar» depende del proceso programado de T-23.** Sin él, vale 0 aunque haya plantas sin revisar; es una limitación de esa detección, declarada.
* **El panel de actividad y las acciones rápidas no están en el prototipo.** Su ubicación (panel lateral y fila bajo la cabecera) es una decisión de este design y fácil de mover.
* **`pendingTasks` en `GET /locations`** cambia el coste de ese listado, que usan el catálogo, el mapa y la ficha: se mide con 500 localizaciones antes de darlo por bueno.
