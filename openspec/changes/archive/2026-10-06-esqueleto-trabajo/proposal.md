# Proposal: esqueleto-trabajo

**Ticket:** [T-14](../../../docs/tickets/T-14-esqueleto-de-las-pantallas-de-trabajo.md) — cierra el bloque 0
**Historias:** [F.3](../../../docs/user-stories/F.3-consultar-cuidados-pendientes.md); las de tareas y alertas están sin escribir (§14, §17 del [documento de producto](../../../docs/producto/definicion-funcional-y-ux.md))
**Pantallas del prototipo:** `dashboard`, `tasks`, `alerts`, `transfer`, `settings` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)

## Why

Es lo único que falta del bloque 0. Hoy `tasks`, `alerts`, `import-export` y `settings` montan `PendingSection`, y **el Dashboard no existe**: `/` redirige al inventario, cuando el prototipo abre la aplicación en «Trabajo de hoy».

Son las pantallas que organizan el trabajo y administran la aplicación, y las que más dependen de entidades que todavía no existen (tareas, alertas, importaciones, ajustes). Construirlas ahora, contra datos de ejemplo, sirve para lo mismo que en el resto del bloque: fijar la arquitectura de información y **descubrir lo que le falta al kit** antes de que T-22, T-23 y T-24 pongan backend debajo.

## What Changes

Solo frontend. Cinco pantallas que **reproducen la composición de su `data-screen`** y marcan con su ticket lo que el API no sirve:

* **`/` — Dashboard** («Trabajo de hoy»): cabecera con la fecha y «Crear tarea»; fila de **tres cifras navegables** (vencidas, para hoy, alertas abiertas); y dos columnas: **agenda** («Siguiente trabajo») en la principal, **alertas** y **carga por zona** en la lateral. Deja de redirigir al inventario y gana su entrada «Dashboard» al frente de la navegación.
* **`/tasks` — Tareas** en tres vistas que se alternan sin recargar —agenda, calendario y completadas— sobre **los mismos datos**, con la barra de filtros y los grupos «Vencidas / Hoy / Próximos 7 días».
* **`/alerts` — Alertas**: bandeja con severidad y estado del ciclo de vida por **texto y forma**, no solo color, con las acciones por alerta.
* **`/import-export` — Importar / exportar**: el asistente de importación en tres pasos con **revisión previa y errores por fila**, la exportación configurable, la frescura de la última copia y la actividad reciente.
* **`/settings` — Configuración** por ámbitos: colección, códigos, alertas y avisos, IA, usuarios y acceso.

Lo que sale de datos reales y lo que sale de ejemplo:

* **Real**: las localizaciones y su carga (`GET /locations` ya trae `plantCount`) para «Carga por zona» del Dashboard, y el total de plantas.
* **De ejemplo, marcado en pantalla con su ticket**: tareas ([T-22](../../../docs/tickets/T-22-tareas.md)), alertas ([T-23](../../../docs/tickets/T-23-alertas.md)), las cifras que dependen de ellas ([T-24](../../../docs/tickets/T-24-dashboard-operativo-y-trabajo-por-lote.md)), la exportación del resultado filtrado ([T-21](../../../docs/tickets/T-21-inventario-a-escala.md)) y los códigos y el QR de las etiquetas ([T-15](../../../docs/tickets/T-15-codigos-de-inventario.md)).
* **Sin ticket que lo recoja**: la importación CSV, el historial de transferencias y la configuración por ámbitos no están en ningún ticket del backlog. Se construyen como maqueta marcada «sin ticket» y se **propone abrir uno** (ver Non-goals); no se inventa a qué ticket pertenecen.

## Capabilities

### Modified Capabilities

- `plant-dashboard`: se añaden los requisitos de las cinco pantallas.
- `app-navigation`: el mapa de secciones gana el Dashboard como entrada propia y `/` deja de redirigir; las secciones pendientes dejan de ser cuatro.

## Non-goals

* **Ningún backend.** No hay endpoints de tareas, alertas, importación ni ajustes; son T-22, T-23, T-24 y el ticket por abrir. Los datos de ejemplo los sirve el service, tras su bandera ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)).
* **No se crea, edita ni completa una tarea de verdad.** «Crear tarea», completar y editar se muestran como acciones **marcadas con T-22**; el formulario de tarea del prototipo es de T-22. Completar tampoco escribe cuidados: tarea ≠ cuidado.
* **No se importa ni se exporta nada de verdad.** El asistente recorre sus tres pasos con un archivo de ejemplo y declara que es una simulación; no hay subida ni descarga reales.
* **La configuración no persiste** y, sobre todo, **no toca la configuración real** de la IA ni de los códigos. La clave de acceso no se muestra ni se pide.
* **No se resuelve ninguna pregunta abierta** del §24 (14 a 18 condicionan T-22; 10 condiciona T-23). La maqueta no las responde por la vía de los hechos: lo que dependa de ellas va marcado.
* **Los contadores de la navegación** (`1.284`, `13`, `4` del prototipo) **no se simulan**: quedan como están hasta que los sirva un endpoint real.
* **No se abre el ticket de importación/exportación/configuración** dentro de este change: se propone aparte, para decidirlo con quien prioriza.

## Impact

* `frontend/app/pages/` — `index.vue` (Dashboard, deja de redirigir), `tasks/`, `alerts/`, `import-export/`, `settings/`.
* `frontend/src/features/` — features nuevas `tasks`, `alerts`, `transfer`, `settings` y `dashboard`, con su service, su composable y sus mocks nombrando el ticket que los sustituye.
* `frontend/src/features/layout/navigation.ts` — la entrada «Dashboard».
* `frontend/app/components/ui/` — los componentes del kit que el contraste con el prototipo revele que faltan (ver design), con su test y su muestra en `/ui-kit`.
* Tests existentes que dan `/` por redirección o las cuatro secciones por pendientes (`pending-section`, `navigation-map`, `app-shell`) se actualizan.
* Sin cambios en backend, esquema ni infraestructura.
