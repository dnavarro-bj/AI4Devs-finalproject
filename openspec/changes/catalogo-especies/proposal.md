# Proposal: catalogo-especies

**Ticket:** [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md), segunda mitad. Los otros tres catálogos —localizaciones, sustratos y etiquetas— van en un change aparte.
**Historias:** [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md), [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md)

## Why

`/species` y `/species/[id]` son dos de las doce pantallas que T-10 dejó con un estado vacío. Y son las que más se pueden construir de verdad: **el catálogo de especies es el único con CRUD completo**. T-08 dejó `GET /species`, `POST /species`, y `GET`, `PUT` y `DELETE` de `/species/{id}`, con unicidad del nombre científico y `409` al retirar una especie con ejemplares.

De hecho, hoy **nada de eso se usa desde la aplicación** salvo el listado que puebla el selector del alta de planta: no hay forma de crear una especie, ni de corregir sus rangos, ni de retirarla. La historia [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md) está sin cumplir en la interfaz aunque su API lleve meses en verde — el mismo caso que el historial de lecturas en el change anterior.

## What Changes

**`/species`** — el catálogo sobre `UiTable` con ordenación, columnas configurables y `UiFilterBar`, con el alta accesible desde la cabecera.

**`/species/[id]`** — la ficha, con la composición del wireframe: cabecera, condiciones recomendadas, pauta anual, floración, ejemplares asociados y ficha de catálogo.

**Alta y edición** compartiendo formulario por secciones, como el editor de planta.

**Retirada de una especie**, con confirmación y respetando el `409` del API: una especie con ejemplares no se puede retirar, y la pantalla lo explica en lugar de mostrar un error genérico.

**Datos reales frente a datos de ejemplo.** Real: el nombre científico y común, los seis rangos, la pauta de riego, y las cuatro operaciones del CRUD. Maqueta marcada: el recuento de ejemplares, la mezcla de sustrato asociada, la exposición y el entorno (T-17), las épocas de crecimiento y la floración (T-17), las fotografías (T-19), el código (T-15) y los grupos de cultivo dinámicos (T-21).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `plant-dashboard`: se añade la gestión del catálogo de especies desde la interfaz —consultar el catálogo, ver la ficha de una especie, darla de alta, corregirla y retirarla—, que la aplicación no ofrecía pese a tener su API completo.

## Non-goals

* **No se implementa nada del backend.** Ningún endpoint ni campo nuevo.
* **No se añaden** exposición, entorno, épocas de crecimiento ni floración al modelo: son T-17. Aquí solo se reserva su sitio.
* No se construyen los grupos de cultivo dinámicos: son [1.18](../../../docs/user-stories/1.18-agrupar-especies-por-caracteristicas.md), en T-21.
* No entran las otras tres pantallas de catálogo.

## Impact

* `frontend/app/pages/species/` — las dos pantallas reescritas, más alta y edición.
* `frontend/src/features/species/` — su service, sus composables, la cabecera y los paneles de la ficha, y sus mocks.
* `frontend/test/` — tests nuevos; ninguno existente se reescribe.
* Sin cambios en backend, esquema ni infraestructura.

## Hallazgo: la historia 0.8 no tiene API

Al revisar los catálogos: **las mezclas de sustrato no tienen ningún endpoint**. La entidad `SoilMix` existe desde T-01, la historia [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md) está marcada «Must-Have (soporte), en alcance del MVP», y el wireframe define su catálogo, su ficha y su editor — pero no hay controller.

Queda fuera de este change; propongo abrir su ticket, como se hizo con [T-26](../../../docs/tickets/T-26-api-de-edicion-de-planta.md).
