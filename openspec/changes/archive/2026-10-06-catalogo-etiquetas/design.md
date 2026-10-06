# Design: catalogo-etiquetas

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/catalogs/spec.md).

De lo que se parte:

* `TagService` sabe crear y listar. `TagRepository` tiene `save`, `findOneById`, `findAll`, `findByNormalizedName` y `findAllByIdIn`.
* El catálogo **ya normaliza**: `tag_name_normalized_unique` es un índice único sobre `lower(trim(name))`, así que «Globular» y «globular » son la misma etiqueta.
* `plant_tag` es una tabla de unión con clave primaria compuesta `(plant_id, tag_id)`.
* `species-catalog` y el catálogo de mezclas resuelven el mismo patrón de `409` al retirar algo en uso.

## Goals / Non-Goals

**Goals:**

* Que una etiqueta mal escrita se pueda arreglar sin dejar dos.
* Que combinar sea seguro de entender: quien la ejecuta sabe cuántas plantas toca **antes** de confirmar.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se toca el esquema ni se añade componente al kit.

## Decisions

### La composición sale del prototipo, bloque a bloque

`tags`: cabecera con recuento y alta · salud del catálogo · barra de herramientas y selección · listado con nombre, uso como proporción, plantas, ejemplos y fecha.
`tag-detail`: portada con marca, nombre normalizado, estado y tres acciones · principal: distribución en la colección y plantas con la etiqueta · lateral: ficha, impacto de renombrar y panel de administrar.

Real hoy: el nombre, el nombre normalizado, el recuento de plantas, su proporción sobre el inventario —que sale del total del propio inventario, no de un dato nuevo— y las plantas que la tienen. **Todo lo demás se dibuja igualmente, marcado y en su sitio**: los códigos de ejemplo (T-15), las fechas, el reparto por especies y localizaciones, los duplicados y las acciones por lote (T-21, T-24).

**Por qué la proporción y no solo la cifra**: el catálogo existe para decidir qué etiquetas sobran y cuáles se combinan, y esa decisión se toma comparando usos. Dos columnas de números obligan a comparar a mano lo que una longitud enseña de un vistazo.

**Por qué marcar en lugar de omitir**: un bloque omitido no se distingue de un olvido, y obliga a rehacer el layout cuando llegue su ticket en vez de rellenarlo. Es el criterio ya aplicado en mezclas (`sustratos-como-el-wireframe`).

### Renombrar comprueba la unicidad, no la delega al índice

El servicio busca el nombre normalizado antes de guardar y responde `409` si lo encuentra en **otra** etiqueta.

**Por qué**: es lo mismo que ya hace el alta, y mantiene la coherencia. Dejar saltar el índice obligaría a reconocer la violación por el nombre de la restricción desde `application`, que es acoplarse al esquema. El índice sigue siendo la red de ADR-002.

**El caso de renombrarse a sí misma no es conflicto**: comparar por identificador y no solo por nombre. Es el error clásico de esta comprobación.

### Combinar se resuelve en la unión, no borrando y recreando

La combinación reasigna las filas de `plant_tag` que apuntan al origen y **descarta las que crearían un duplicado**, porque la clave primaria compuesta lo impide.

**Por qué**: una planta que ya tuviera ambas etiquetas provocaría una clave duplicada si se reasignara a ciegas. Y borrar la etiqueta de origen antes de reasignar perdería las plantas. El orden es: reasignar lo que no colisiona, retirar lo que sí, y solo entonces borrar la etiqueta.

**Descartado**: hacerlo con dos llamadas desde el cliente —quitar la etiqueta a cada planta y ponerle la otra—. Serían N peticiones, sin transacción, y un fallo a mitad dejaría plantas sin ninguna de las dos.

### La combinación devuelve cuántas plantas tocó

**Por qué**: es una operación destructiva sobre datos compartidos. Que la respuesta diga el alcance permite a la pantalla confirmarlo después y no solo prometerlo antes, que es lo que distingue «te avisé» de «esto es lo que ha pasado».

### El alcance se declara antes de confirmar, con el dato real

La pantalla pide el recuento de la etiqueta de origen y lo muestra en la confirmación.

**Por qué**: «se combinarán 87 plantas y "globular" desaparecerá» es una frase que se puede evaluar; «¿seguro?» no. Es la misma regla que el documento de producto exige a las acciones por lote (§13.3): declarar el número exacto antes de ejecutar.

### Retirar exige que no esté en uso, y ofrece la salida

Una etiqueta con plantas responde `409`, y la pantalla ofrece **combinarla en otra** en lugar de dejar al usuario en un callejón.

**Por qué**: el motivo por el que alguien retira una etiqueta suele ser que sobra, y si sobra normalmente es porque duplica a otra. Ofrecer la combinación en el mismo sitio convierte un error en el siguiente paso.

## Risks / Trade-offs

* **Combinar es destructivo y no hay deshacer** → se declara el alcance antes, se confirma explícitamente y la respuesta dice qué pasó. A esta escala —un catálogo administrado por una persona— es la protección proporcionada; un histórico de combinaciones sería desproporcionado.
* **La carrera entre comprobar el uso y retirar** existe igual que en las mezclas → se acepta por el mismo motivo y queda anotada.
* **Renombrar alcanza a todas las plantas que la tienen**, que es lo correcto —la relación es por referencia— pero conviene que la ficha muestre cuántas son antes de renombrar.
* **La ficha lista las plantas con esa etiqueta** usando el filtro que ya existe (`GET /plants?tag=`), así que hereda su paginación → la ficha muestra la primera página y enlaza al inventario filtrado para el resto.

## Migration Plan

Ninguna migración: `tag`, su índice único normalizado y `plant_tag` existen desde `V1__schema.sql`.
