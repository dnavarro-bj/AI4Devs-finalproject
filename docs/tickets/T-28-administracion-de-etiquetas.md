# T-28 - Administración de etiquetas: renombrar y combinar

**Área:** Backend + Frontend
**Historia relacionada:** [0.10](../user-stories/0.10-etiquetar-cactus-con-tags.md)
**Bloque:** 1 — gestión de plantas.

## Descripción

`TagController` solo sabe **crear y listar**. Una etiqueta mal escrita se queda mal escrita para siempre, y dos etiquetas que significan lo mismo no se pueden juntar: la única salida es retirar la asignación planta a planta, que a la escala del producto no es una salida.

El catálogo ya normaliza el nombre —el índice `tag_name_normalized_unique` es sobre `lower(trim(name))`—, así que el duplicado exacto no ocurre; el que ocurre es el semántico: «globular» y «globulares».

**Lo destapó el change `catalogo-etiquetas`** al construir la ficha de la etiqueta.

## Alcance

* `GET /tags/{id}`, con el número de plantas que la usan.
* `PUT /tags/{id}` para renombrar, respetando la unicidad normalizada: un nombre ya usado responde `409`; renombrarse a sí misma no es conflicto.
* `POST /tags/{id}/merge` para combinar dos etiquetas en una sola transacción, reasignando las plantas del origen al destino sin duplicar las que ya tuvieran ambas, y devolviendo cuántas se vieron afectadas.
* `DELETE /tags/{id}`, con `409` si está en uso.
* En la pantalla: la combinación **declara cuántas plantas se verán afectadas antes de confirmarse**, y una retirada bloqueada por uso ofrece combinar en lugar de dejar sin salida.

## Criterios de aceptación

* Renombrar una etiqueta conserva todas sus asignaciones.
* Combinar dos etiquetas deja una sola, con la unión de las plantas de ambas, y una planta que tuviera las dos no pierde ni duplica nada.
* Combinar una etiqueta consigo misma responde `400`.
* Retirar una etiqueta en uso responde `409` y la etiqueta sigue existiendo.

## Notas

* No hace falta migración: `tag` y `plant_tag` existen desde `V1__schema.sql`.
* Sin deshacer y sin detección automática de duplicados: la protección es declarar el alcance antes de ejecutar. A esta escala es lo proporcionado.
