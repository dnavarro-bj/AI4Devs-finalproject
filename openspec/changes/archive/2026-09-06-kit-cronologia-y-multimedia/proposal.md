# Proposal: kit-cronologia-y-multimedia

**Ticket:** [T-12](../../../docs/tickets/T-12-kit-de-cronologia-calendario-y-multimedia.md) — bloque 0
**Historias:** [0.5](../../../docs/user-stories/0.5-consultar-historial-de-cuidados.md) y [F.3](../../../docs/user-stories/F.3-consultar-cuidados-pendientes.md) parcialmente; las consumirán T-13, T-20, T-22 y T-24.

## Why

T-11 sacó al kit los patrones de **mirar una tabla larga**. Falta el otro grupo: **contar lo que ha pasado** y **editar formularios largos**.

Sin ellos, la ficha de planta no se puede componer —necesita cronología y métricas—, ni el módulo de tareas —agenda y calendario—, ni la ficha de especie —pauta anual—, ni la de mezcla de sustrato —proporciones—. Son la última pieza del kit antes de que T-13 y T-14 construyan pantallas.

Igual que en T-11, se hacen antes que las pantallas porque es más barato tener la pieza que reconciliar cinco copias.

## What Changes

Ocho componentes nuevos:

* **`UiTimeline`** y su entrada — cronología descendente de eventos heterogéneos, con filtro por tipo. Una fotografía, un comentario breve y una alerta piden densidades distintas pero comparten el mismo orden temporal (§7.3).
* **`UiAgendaList`** — el trabajo agrupado en vencidas, hoy, próximos días y posteriores, que es la vista operativa por defecto (§14.5).
* **`UiCalendarMonth`** — planificación mensual, legible cuando un día acumula varias entradas.
* **`UiMediaGallery`** — galería con ampliación (§8).
* **`UiUploadArea`** — zona de subida que **no sube nada**: emite los ficheros elegidos. El almacenamiento es T-19.
* **`UiFormSection`** — bloques de formulario con significado para el usuario, no según la estructura de la base de datos (§2.1).
* **`UiMonthRange`** — pauta anual por meses, admitiendo un periodo que **cruza el fin de año** (§9.4).
* **`UiProportionBar`** — proporciones con validación visual, para la composición de las mezclas de sustrato.

Cada uno con su test de lo que `happy-dom` observa y su muestra en `/ui-kit`, según [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `design-system`: se añaden al catálogo la cronología de eventos, la agenda por vencimiento, el calendario mensual, la galería con ampliación, la zona de subida, la sección de formulario, el rango de meses y la barra de proporciones.

## Non-goals

* **No se construye ninguna pantalla.** La ficha es T-13, la agenda y el calendario reales son T-22.
* **No se sube ningún fichero**: `UiUploadArea` emite lo que el usuario elige y ahí termina su trabajo. Formatos, tamaño, miniaturas y almacenamiento son T-19, que necesita un ADR previo.
* **Ningún componente accede a datos** ni depende de una feature ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)).
* No se toca el backend ni se añade ninguna dependencia.
* No entra la vista semanal del calendario: el documento de producto la menciona pero la mensual es la que resuelve la estacionalidad, y una segunda vista sin pantalla que la use sería adivinar.

## Impact

* `frontend/app/components/ui/` — ocho componentes nuevos, más el nodo de entrada de la cronología.
* `frontend/app/pages/ui-kit.vue` — las muestras.
* `frontend/test/` — tests nuevos; ninguno existente se reescribe.
* Sin cambios en backend, esquema ni infraestructura.
