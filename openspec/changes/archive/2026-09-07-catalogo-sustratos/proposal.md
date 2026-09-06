# Proposal: catalogo-sustratos

**Tickets:** [T-27](../../../docs/tickets/T-27-api-del-catalogo-de-mezclas-de-sustrato.md), que este change abre, y la parte de mezclas de [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md)
**Historias:** [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md)

## Why

La historia [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md) está marcada **Must-Have (soporte), en alcance del MVP** y no está construida. La entidad `SoilMix` existe desde T-01 —con sus invariantes: los porcentajes suman 100, el pH está en escala y el mínimo no supera al máximo— y la tabla lleva ahí desde la primera migración.

Pero **no hay API**. El puerto `SoilMixRepository` solo sabe buscar por id, y su propio comentario lo dice: *«No es el catálogo de mezclas (historia 0.8), que no tiene endpoints todavía»*. No hay servicio, ni controller, ni forma de crear una mezcla que no venga en los datos semilla.

La consecuencia práctica: al dar de alta una especie hay que elegir su mezcla de sustrato, y **solo se pueden usar las tres que sembró `V2__seed.sql`**. El wireframe define el catálogo, la ficha y el editor, y ninguno se puede construir sin backend.

Es el segundo caso que aparece del mismo tipo, después de [T-26](../../../docs/tickets/T-26-api-de-edicion-de-planta.md).

### Y además bloquea el editor de especies

Al verificar el API de especies para el change [`catalogo-especies`](../catalogo-especies/tasks.md) apareció la consecuencia dura: **`soilMixId` es obligatorio en `POST /species` y en `PUT /species/{id}`, pero `GET /species/{id}` no lo devuelve.**

Eso deja el editor de especie imposible de construir con honestidad: el alta no tiene de dónde sacar el selector de mezclas, y la corrección —que es reemplazo completo— sustituiría la mezcla actual por una arbitraria al guardar cualquier otro cambio. Un formulario que corrompe un dato al guardar es peor que uno que no guarda.

Por eso este change **va antes** que el de especies, y se lleva consigo devolver la mezcla en la ficha de la especie.

## What Changes

**Backend** — el catálogo completo, siguiendo la forma de `species-catalog`:

* `GET /soil-mixes` paginado, `POST /soil-mixes`, y `GET`, `PUT` y `DELETE` de `/soil-mixes/{id}`.
* El puerto de dominio gana listar, guardar, retirar y contar las especies que la usan.
* Retirar una mezcla que alguna especie recomienda responde **`409`**, no un fallo de integridad: es la misma regla que retirar una especie con ejemplares.
* Las invariantes de la entidad se traducen a `400` con su mensaje, sin llegar nunca a un `500`.
* **La ficha de una especie devuelve su mezcla**, con identificador y nombre: sin eso la ficha no basta para reconstruir la especie y una corrección la perdería.

**Frontend** — las dos pantallas del wireframe y su editor:

* `/soil-mixes` — el catálogo con su composición, sus porcentajes y su rango de pH.
* `/soil-mixes/[id]` — la ficha: receta de referencia, propiedades de cultivo, especies que la recomiendan y ficha de la mezcla.
* Alta, edición y retirada, con la composición validada **en la pantalla** antes de enviar.

**No hace falta migración.** La tabla `soil_mix` existe desde `V1__schema.sql` con sus `CHECK` de suma 100 y de rango de pH; este change no cambia el esquema.

## Capabilities

### New Capabilities

- `soil-mix-catalog`: el catálogo de mezclas de sustrato como API REST — alta, consulta, listado, corrección y retirada, con sus invariantes de composición y la protección de las mezclas en uso.

### Modified Capabilities

- `plant-dashboard`: se añade la gestión del catálogo de mezclas desde la interfaz.
- `species-catalog`: la ficha de una especie devuelve la mezcla de sustrato que tiene recomendada, identificada y no solo nombrada.

## Non-goals

* **No se relaciona la mezcla con la planta**, solo con la especie: el trasplante que cambia el sustrato de un ejemplar concreto es del borrador de gestión y llega con las intervenciones (T-20).
* No se permite más de una mezcla recomendada por especie: la historia 0.8 lo deja explícitamente como evolución futura.
* No se calcula compatibilidad entre la mezcla y la pauta de la especie: necesita exposición y entorno, que son T-17.
* No se toca el esquema.

## Impact

* `backend/` — `domain/repos/SoilMixRepository.kt` ampliado, `application/SoilMixService.kt` y sus DTOs, `web/controllers/SoilMixController.kt`, y `SpeciesCareResponse` con su mezcla. Tests de integración con Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).
* `frontend/src/features/soil-mixes/` — su service, composables y componentes.
* `frontend/app/pages/soil-mixes/` — las pantallas, que dejan de ser marcador.
* Sin cambios en el esquema ni en la infraestructura.
