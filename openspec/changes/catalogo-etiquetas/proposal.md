# Proposal: catalogo-etiquetas

**Tickets:** [T-28](../../../docs/tickets/T-28-administracion-de-etiquetas.md), que este change abre, y la parte de etiquetas de [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md)
**Historias:** [0.10](../../../docs/user-stories/0.10-etiquetar-cactus-con-tags.md), [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md)

## Why

El catálogo de etiquetas solo sabe **crear y listar**. La historia [0.10](../../../docs/user-stories/0.10-etiquetar-cactus-con-tags.md) pide además poder **renombrar** una etiqueta y **combinar duplicados**, y el §18.3 del [documento de producto](../../../docs/producto/definicion-funcional-y-ux.md) lo repite: *«crear, renombrar, combinar duplicados y consultar el número de plantas asociadas»*.

Sin eso, una etiqueta mal escrita se queda mal escrita para siempre y la única salida es crear otra —con lo que quedan las dos, repartiendo las plantas entre ambas y rompiendo justo lo que las etiquetas sirven para hacer: encontrar un subconjunto completo—.

El catálogo ya normaliza los nombres al crear, así que la infraestructura para detectar duplicados está: falta la operación que los une.

## What Changes

**Backend**:

* `GET /tags/{id}` — consulta de una etiqueta con **cuántas plantas la tienen**.
* `PUT /tags/{id}` — renombrado, respetando la unicidad normalizada del catálogo: renombrar a un nombre ya existente responde `409`.
* `POST /tags/{id}/merge` — combinar dos etiquetas: las plantas de la etiqueta de origen pasan a tener la de destino, y la de origen se retira. Una planta que ya tuviera ambas **no se duplica**.
* `DELETE /tags/{id}` — retirada, permitida solo si ninguna planta la tiene.

**Frontend**:

* `/tags` — el catálogo con el recuento de plantas por etiqueta.
* `/tags/[id]` — la ficha: distribución en la colección, plantas con esa etiqueta, y las acciones de administrar.
* Renombrar y combinar, con la combinación **declarando cuántas plantas se ven afectadas antes de confirmarla**.

**No hace falta migración**: la tabla `tag`, su índice único normalizado y `plant_tag` existen desde `V1__schema.sql`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `catalogs`: el catálogo de tags gana consulta individual con recuento, renombrado, combinación de duplicados y retirada.
- `plant-dashboard`: se añade la administración de etiquetas desde la interfaz.

## Non-goals

* **No se combinan más de dos etiquetas a la vez.** Combinar de dos en dos es reversible en la práctica —vuelves a crear la otra y reetiquetas—; combinar cinco de golpe no.
* No se ofrece deshacer una combinación: es destructiva y se avisa antes, que es la protección que corresponde a esta escala.
* No se detectan duplicados automáticamente: la sugerencia de «estas dos etiquetas se parecen» es de §18.3 y necesita criterio de similitud, no solo normalización.
* No se toca el esquema.

## Impact

* `backend/` — `TagRepository` ampliado, `TagService` con las tres operaciones nuevas, y su controller. Tests de integración con Testcontainers.
* `frontend/src/features/catalogs/` — el service de etiquetas y sus composables.
* `frontend/app/pages/tags/` — las pantallas, que dejan de ser marcador.
* Sin cambios en el esquema ni en la infraestructura.
