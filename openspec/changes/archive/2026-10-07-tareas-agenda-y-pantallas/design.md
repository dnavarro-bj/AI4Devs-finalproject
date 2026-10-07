# Design: tareas-agenda-y-pantallas

## Contexto

La pantalla `app/pages/tasks/index.vue` ya compone `UiTabs` → `UiFilterBar` → `UiAgendaList` / `UiCalendarMonth` / lista de completadas, con el modelo provisional de `src/features/tasks/` (tipos `watering…`, `due`, `time`, prioridades `high|normal|low`). El service solo hace `list()` y devuelve el mock tras una bandera; `useTasks` carga una vez y filtra en el cliente. El Dashboard (`useDashboard`) consume ese mismo service. Hay tareas de maqueta en `plantDetail.mock.ts` (`MOCK_TASKS`, `MOCK_NEXT_TASK`), en la ficha de la localización y en `plantGlance`.

**Dependencia:** se aplica **tras archivar** `tareas-modelo-y-api`. El modelo del frontend deja de ser provisional y pasa a ser el del API (`pendiente|completada|omitida|cancelada`, `dueFrom`/`dueTo`, tipos en español).

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Prototipo `tasks` | Pestañas, filtros, grupos de agenda, calendario | Se conserva la composición. La maqueta pasa a datos reales. |
| Prototipo `#task-dialog` | Campos tipo, prioridad, título, destino, fecha, **hora**, notas y texto de impacto | Igual **salvo la hora** (decisión de producto, §24.14). |
| Prototipo `tasks` | Botón «Completar varias» y casilla ○ sin diálogo | La casilla abre el diálogo de completar, **inexistente en el prototipo**. «Completar varias» sigue marcado T-24. |
| Prototipo `tasks` | Vista «lista / compacta» en la barra de filtros | Se conserva solo la lista; la compacta no aporta con las piezas de hoy y no tiene dato que la distinga. |
| §14.5 | Editar tipo, título, destinatarios, prioridad, fecha, hora y notas | Sin hora. |
| §14.4 | «La interfaz mostrará las plantas afectadas y permitirá excluir» | El diálogo de completar. |
| Prototipo `dashboard` | Agenda, cifras y tareas por zona | Agenda y dos cifras reales; tareas por zona sigue marcado T-24. |

## Decisiones

**1. El modelo del frontend es el del API, sin mapper de ficción.** `Task` pasa a `{ id, type, title, priority, status, dueFrom, dueTo, notes, origin, target, completion?, closedReason? }`. Los tipos y estados se muestran con **etiquetas** (`TASK_TYPE_LABELS`…), no con un segundo vocabulario. Lo único que se traduce es la prioridad al nivel del kit (`alta` → `immediate`, `normal` → `soon`, `baja` → `routine`), donde ya hay un componente que lo pide. El DTO no llega a un componente: un mapper convierte el `target` en el texto de destino («Invernadero 2 / Bandeja A3», «6 plantas») y los periodos en la entrada de la agenda.

**2. Agrupar es del kit; traer es del servidor.** `UiAgendaList` clasifica con la fecha de referencia que recibe, así que el composable no agrupa: pide al API **las pendientes ordenadas por `due`** (con los filtros y `today`), hasta el tamaño máximo de página. Si `totalElements` lo supera, la agenda **lo dice**: es el mismo criterio que el selector de especies del inventario, y pasar a cargar más sería un cambio de interacción, no de arquitectura. Una agenda que parece completa y no lo es, es peor que una que avisa. El **calendario** pide el mes visible con `from`/`to`; cambiar de mes es otra petición, no un filtro del cliente. **Completadas** pide los estados cerrados con orden por periodo descendente.

**3. El estado de la pantalla es la URL.** Vista, localización, tipo y prioridad van con `useUrlState`, como el inventario; `?due=overdue|today` es un parámetro más. Es el mismo mecanismo que ya hace enlazables las pantallas de listado y deja `due` quitable como cualquier criterio.

**4. La fecha de referencia deja de ser un mock.** `useReferenceDate` devuelve el día local real y **la envía como `today`**; `referenceDate.mock.ts` y `USE_MOCK_REFERENCE_DATE` se borran, como ya anunciaba su cabecera. Los tests que dependían de `2026-09-03` pasan a inyectar una fecha por el mismo `useState`. Los componentes del kit **no cambian**: ya la reciben por propiedad.

**5. Un solo formulario para crear y editar, con valores iniciales.** `TaskForm` acepta `initial` parcial (tipo, título, destino, fecha), de modo que lo abren sin rehacer: el botón de la cabecera, un día del calendario, la ficha de una planta y la de una localización —y mañana una alerta o la selección del inventario—. El **destino** es la parte nueva: un selector de dos modos. «Localización» reutiliza los datos de `useLocations`; «Plantas concretas» es un buscador sobre `GET /plants?q=` con chips y tope de 500, que es lo que el API acepta. Si el selector que ya hay en el kit (`UiEntityPicker`) basta, se usa; si no, se compone en la feature `tasks` y, solo si otra pantalla lo necesita, sube al kit.

**6. El diálogo de completar se compone, no se inventa un componente.** `UiDialog` con tres bloques: la **fecha**, el **alcance** —una lista paginada de `GET /tasks/{id}/scope` con una casilla «excluir» por fila y el contador «Se registrará en N de M»— y el **registro opcional** según el tipo. Las exclusiones se guardan como un conjunto de ids **en el composable**, de modo que cambiar de página las conserva. Con 2.000 plantas no se pide el alcance entero: se pagina, y solo viajan al API los ids **excluidos**, que son pocos. El registro opcional se limita a lo que el tipo admite (agua en ml para riego; tamaño de maceta para cambio de maceta; notas para poda) y avisa de que se aplica a todas las incluidas.

**7. `UiActionMenu` sube al kit (ADR-014).** Un menú «•••» con acciones lo piden la fila de tarea, y ya existe un panel desplegable a mano en `SavedViewMenu`; es un patrón que aparece en dos pantallas. Un solo elemento raíz, `aria-haspopup`/`aria-expanded`, Escape y clic fuera cierran devolviendo el foco, flechas y Enter. **No se refactoriza `SavedViewMenu`** sobre él en este change: es otra superficie (contiene formularios), y migrarlo es un cambio aparte si merece la pena.

**8. Las fichas consumen una consulta, no una copia.** «Próximo trabajo» de la planta es `GET /tasks?plant=<id>&sort=due,asc&size=5&today=…`; el de la localización, `?location=<id>&includeDescendants=true`. La métrica de tareas de la ficha de localización y la de `locations/index` salen del `totalElements` de esas consultas (`size=1`), sin endpoint de agregados. El API ya resuelve que una tarea sobre el invernadero afecta a las plantas que están en él.

**9. La cronología gana el tipo `tarea`.** Se añade a `TIMELINE_TYPES` y a `TIMELINE_KIT_TYPES` (los slots solo se generan para tipos de esa lista; sin entrada caería en la representación de reserva, que es correcta pero anónima), una rama en `entryTitle()` y otra en el cuerpo de la entrada. No es editable. El detalle trae el título y el tipo, no un enlace: no hay pantalla de detalle de tarea.

**10. El Dashboard no se rediseña.** `useDashboard` ya consume `tasksApiService.list()`: con el service real pasa a pedir las vencidas y las de hoy (`due=` y `size=1` para las cifras, y la agenda con `due`). Las alertas siguen mock (T-23) y las tareas por zona marcadas (T-24), porque agregar por localización es del Dashboard operativo.

## Riesgos / compromisos

* **La agenda trunca a una página (500).** Se avisa, no se oculta. Con 2.000 ejemplares y trabajo manual es un techo holgado; si no lo fuera, se cambia la forma de cargar.
* **El diálogo de completar no existe en el prototipo.** Es la pantalla con más decisión propia de este change; se dejan sus textos y composición fáciles de revisar.
* **El mismo registro para todas las plantas.** Visible en el diálogo; no hay atajo para registros distintos.
* **El alcance mostrado puede quedar viejo.** El API recalcula al completar y devuelve el número real; el diálogo lo muestra tras confirmar.
* **Specs que aún dicen «tareas (T-22)».** La frase genérica de «Perfil real del ejemplar» menciona tareas y alertas como marcadas; la ficha las sustituye y solo T-23 queda marcado. Se reconcilia al archivar.
