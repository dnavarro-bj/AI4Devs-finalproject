# Design: esqueleto-trabajo

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-dashboard/spec.md).

De lo que se parte:

* Las cuatro secciones —`tasks`, `alerts`, `import-export`, `settings`— montan `PendingSection`; `/` redirige a `/plants`. No hay Dashboard.
* El kit ya trae lo que estas pantallas piden: `UiAgendaList`, `UiCalendarMonth`, `UiStatTile`, `UiPriority`, `UiStatus`, `UiTabs`/`UiSegmentedControl`, `UiFilterBar`, `UiStepper`, `UiSwitch`, `UiEditorNav`, `UiTable`, `UiProgressBar`, `UiEmptyState`, `UiNotice`. Es el resultado de T-11 y T-12.
* `GET /locations` ya devuelve `plantCount` por fila.
* Los mocks viven por feature (`src/features/<f>/mocks/`), nombran el ticket que los borra y **los consume el service**, nunca un componente ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)).
* Ningún componente consulta el reloj: la agenda y el calendario reciben la fecha por prop ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md), en espíritu).

## Goals / Non-Goals

**Goals:** las cinco pantallas con la composición del prototipo; que conectar cada una sea cambiar la fuente en su service; descubrir qué le falta al kit.

**Non-Goals:** los de la propuesta —sin backend, sin acciones reales, sin persistir ajustes—. A nivel de diseño: no se decide el modelo de tarea ni de alerta, solo el de la maqueta.

## Composición: qué se reproduce y qué se aparta

Contraste con cada `data-screen`, abierto antes de decidir.

| Pantalla | Se reproduce | Se aparta, y por qué |
|---|---|---|
| `dashboard` | Cabecera con fecha y acción; fila de tres cifras navegables; agenda a la izquierda; alertas y carga por zona a la derecha | Las cifras «43 plantas afectadas» y «una requiere atención inmediata» salen de ejemplo y van marcadas: dependen de T-22/T-23/T-24 |
| `tasks` | Selector de tres vistas, barra de filtros, grupos con su número, vista de lista y compacta | El selector de vista de lista/compacta se declara sin construir la compacta: es densidad, no contenido |
| `alerts` | Cabecera con recuento, barra de filtros, tarjeta por alerta con marca y acciones | El filtro «Origen» se declara con T-23: sin entidad no hay origen que filtrar |
| `transfer` | Frescura de la copia, dos paneles, asistente de tres pasos, actividad reciente | La subida real y la descarga son simulación declarada |
| `settings` | Cabecera con guardado, navegación de cinco ámbitos, panel activo | No persiste; el ámbito de IA no muestra la clave |

## Decisions

### Una sola fecha de referencia, inyectada

Dashboard, agenda y calendario reciben **la misma fecha** desde un composable que la fija una vez, no cada uno la suya.

**Por qué**: la maqueta usa fechas de ejemplo, y si cada pantalla consultara el reloj, «vencida» cambiaría de una a otra y los tests dependerían del día. Con una fecha única, T-22 solo sustituye la fuente por el reloj inyectado.

**Alternativa descartada**: que los mocks calculen fechas relativas a «hoy». Parece más viva, pero los tests dejan de ser deterministas.

### Las tres vistas de tareas comparten una sola carga

El composable pide las tareas **una vez** y las tres vistas leen ese estado; alternar no vuelve a pedir nada.

**Por qué**: el criterio de aceptación del ticket es que muestren los mismos datos. Tres consultas independientes pueden divergir, y con T-22 sería además triple tráfico.

### Los filtros se aplican en el composable, sobre los mocks

La barra filtra de verdad. Una barra que no filtra es decorado, y el kit ya sabe emitir el criterio.

**Por qué ahora**: con T-22 el filtro pasará al servidor (ADR-009); dejarlo en el composable hace que sea cambiar dónde se aplica, no rehacer la pantalla.

### El Dashboard mezcla real y ejemplo, y lo dice por bloque

La carga por zona es real (localizaciones con `plantCount`); agenda, alertas y cifras son de ejemplo. Cada bloque lleva su marca, no una global.

**Por qué**: una advertencia única arriba se lee una vez y se olvida; la marca en el bloque protege la conversación sobre el producto, como se decidió en la ficha de planta.

**Alternativa descartada**: todo de ejemplo por coherencia. Tira un dato real que ya existe.

### Importación como máquina de estados, no como tres pantallas

Un composable con los pasos `archivo → validación → aplicar`; **aplicar solo es alcanzable sin errores**, y esa regla vive en el composable, no en que el botón esté deshabilitado.

**Por qué**: el criterio es que no se descarte nada en silencio. Un botón deshabilitado en el componente se salta; una transición que no existe, no.

### La configuración es estado local por ámbito, con «sucio» calculado

Cada ámbito guarda su valor editado; «hay cambios sin guardar» se **calcula** comparando con el último guardado, no se marca a mano.

### El Dashboard entra en la navegación como entrada sin grupo

Es lo que hace el prototipo. Se declara en `navigation.ts` con una dirección raíz, y `isActiveSection` la trata aparte: con el prefijo, `/` coincidiría con todo.

### Qué entra al kit

Se decidió al contrastar. De los tres candidatos, **ninguno apareció en dos pantallas**: la tarjeta de alerta, la fila de regla con interruptor y la fila de actividad se quedan donde están ([ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)). Lo que sí se repetía:

* **La fila de tarea** (agenda de tareas y Dashboard) es de **dominio**, no del kit: sabe qué es una tarea. Vive en `features/tasks/components/TaskRow.vue` y la usan las dos pantallas.
* **El aviso de datos de ejemplo** (`MockNotice`) y **la acción pendiente** (`usePendingAction`) están en las cinco pantallas, pero son andamiaje de este momento del producto, como `PendingSection`: no entran al kit y desaparecen con sus tickets.
* **`UiAgendaList` gana el slot `entry`** para componer sus filas sin perder los grupos, y su grupo pasa a llamarse «Próximos 7 días», como en el kit del prototipo. **`UiNavGroup` admite no llevar etiqueta**, para el Dashboard suelto. El kit sigue en 36 componentes.

## Contraste final con el prototipo

Hecho en el navegador sobre la app levantada, pantalla a pantalla.

* **dashboard**: se reproducen cabecera con fecha, fila de tres cifras, agenda a la izquierda y alertas y carga por zona a la derecha. Se aparta la agrupación por día con «rail» de fecha (la agenda agrupa por vencimiento) y las tareas por zona, marcadas con T-22.
* **tasks**: se reproducen selector de tres vistas, filtros, grupos con su número, casilla, tipo, prioridad y editar. Se aparta la vista compacta (densidad, no contenido) y «Completar varias», que pasa de la cabecera del grupo a la barra de filtros porque el grupo lo pinta el kit.
* **alerts**: se reproducen cabecera con recuento, filtros y tarjeta con marca, severidad y acciones. «Origen», deshabilitado y marcado con T-23.
* **transfer**: se reproducen frescura de la copia, asistente de tres pasos, revisión con errores por fila, exportación y actividad. La subida real y la descarga son simulación declarada.
* **settings**: se reproducen cabecera con guardado, cinco ámbitos y panel activo. Los ámbitos van sin su subtítulo (`UiEditorNav` solo lleva etiqueta) y la clave de IA no se muestra.

## Risks / Trade-offs

* **Cinco pantallas en un change** → es la decisión tomada. Mitigación: el orden de tasks hace que cada pantalla sea un bloque cerrado, de modo que el change se pueda revisar por bloques.
* **Maqueta con aspecto de producto** → cada bloque de ejemplo lo declara en pantalla y el mock nombra su ticket.
* **Importación, exportación y configuración no tienen ticket** → se construyen marcadas «sin ticket» y se propone abrir uno aparte; si nadie lo abre, la maqueta queda huérfana.
* **Los tests de `/` y de las secciones pendientes cambian** → la redirección y las cuatro `PendingSection` desaparecen; hay que actualizarlos, no borrarlos sin sustituto.
* **La maqueta puede fijar un modelo de tarea que T-22 no quiera** → las preguntas 14–18 del §24 siguen abiertas; los tipos y campos del mock son provisionales y se declaran.
