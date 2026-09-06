# Proposal: esqueleto-plantas

**Ticket:** [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md), primera mitad. La segunda —especies, localizaciones, sustratos y etiquetas— va en un change aparte.
**Historias:** [0.1](../../../docs/user-stories/0.1-registrar-cactus.md), [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md), [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md), [0.5](../../../docs/user-stories/0.5-consultar-historial-de-cuidados.md), [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md)

## Why

Las tres pantallas de plantas son las de T-05: una tabla sin filtros, una ficha en una sola columna con el formulario de lectura ocupándola de forma permanente, y un alta sin secciones. El [wireframe](../../../docs/wireframes/cactify-admin/index.html) define otra cosa, y la ficha es **la pantalla más usada del producto**: el centro operativo del ejemplar.

Además hay una historia sin cumplir con su API en verde: **[0.5](../../../docs/user-stories/0.5-consultar-historial-de-cuidados.md)**. `GET /plants/{id}/care-records` existe desde T-03 y el frontend nunca lo ha consumido, así que la ficha muestra la lectura que acabas de registrar y ninguna anterior. La cronología se puede montar sin tocar el backend.

El kit ya tiene todas las piezas —`UiTimeline`, `UiStatTile`, `UiTabs`, `UiDialog`, `UiTable`, `UiFilterBar`, `UiMediaGallery`—, así que esto es componer, no inventar.

## What Changes

**`/plants`** — el listado pasa a `UiTable` con ordenación y columnas configurables, `UiFilterBar` con los criterios aplicados, y la celda identificativa con miniatura y código como en el wireframe.

**`/plants/[id]`** — la ficha se rehace entera:

* Cabecera de ejemplar: zona de fotografía, identidad —código, estado, nombre, especie y localización—, contexto botánico y las tres acciones del wireframe.
* Aviso de revisión pendiente.
* Pestañas: Resumen e historial, Fotografías, Floración y Datos.
* «De un vistazo» con cuatro métricas.
* **Cronología de las lecturas registradas**, cada una con sus valores y su análisis de IA accesible desde la propia entrada.
* Paneles laterales: última recomendación, cuidados efectivos con su nota de herencia, y próximo trabajo.
* **El formulario de lectura pasa a un diálogo** en lugar de ocupar la columna.

**`/plants/new` y `/plants/[id]/edit`** — alta y edición **comparten formulario**, dividido en secciones con significado para el usuario.

**Datos reales frente a datos de ejemplo.** Lo que el API sirve —planta, especie, localización, tags, cuidados heredados, lecturas y recomendaciones— es real. Lo que no existe —fotografía, código de inventario, estado del ejemplar, contexto de exposición y germinación, avisos, tareas, floraciones y los eventos de la cronología que no son lecturas— sale de datos de ejemplo, **cada uno marcado con el ticket que lo sustituirá**. Ninguna pantalla miente sobre qué es dato y qué es maqueta.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `design-system`: se añaden al catálogo la navegación de secciones de un formulario y la disposición en línea del campo, que el editor de planta necesita.
- `plant-dashboard`: «Ficha de una planta» pasa a describir la composición completa; «Registro de una lectura de cultivo» ocurre ahora en un diálogo; «Listado del inventario» gana filtros y ordenación; y se añade la consulta del historial de lecturas con su análisis, que la aplicación no ofrecía pese a tener su API.

## Non-goals

* **No se implementa nada del backend.** Ningún endpoint ni campo nuevo.
* **No se construyen** las pestañas de Fotografías ni de Floración: son T-19 y T-20. Quedan con su estado vacío y su ticket.
* **No se conecta** nada de tareas ni de alertas: T-22 y T-23.
* **No se sustituyen los datos de ejemplo por reales**: cada uno espera a su ticket.
* No entran las pantallas de catálogos: van en el change siguiente.

## Impact

* `frontend/app/pages/plants/` — las tres pantallas reescritas, más la ruta de edición.
* `frontend/src/features/plants/` — la cabecera de ejemplar y los paneles de la ficha, sus mocks y su service.
* `frontend/src/features/care-records/` — el listado, que el service ya expone y nadie llamaba.
* `frontend/test/` — tests nuevos; los de T-05 conservan su comportamiento.
* Sin cambios en backend, esquema ni infraestructura.

## Hallazgo: falta el endpoint de edición de planta

El API expone `POST /plants`, `GET /plants`, `GET /plants/{id}` y `PUT /plants/{id}/tags`, y **nada más**: no hay forma de cambiar el apodo, la localización ni la especie de un ejemplar ya creado.

El wireframe da la edición por hecha —«Editar planta» está en la cabecera y §5.4 del documento de producto describe que alta y edición comparten formulario—, y **ningún ticket lo cubre**. Es la misma situación que abrió T-08 en su día.

En este change la pantalla de edición se construye con el formulario compartido y prellenado, y **solo persiste lo que el API admite**: los tags. El resto de campos se muestran, se editan en pantalla y al guardar se advierte de que esa parte todavía no llega al servidor. No se simula un guardado que no ocurre.

Propongo abrir un ticket para ese endpoint; queda fuera de este change.
