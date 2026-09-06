# Design: catalogo-localizaciones

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/catalogs/spec.md).

De lo que se parte:

* `LocationService` sabe crear y listar. `LocationRepository` tiene `save`, `findOneById` y `findAll(pageable)`.
* **`Location.rename` ya existe** y revalida su invariante antes de tocar nada. Es de las pocas entidades que ya estaba preparada para editarse.
* `location` es una tabla plana: `id` y `name`. Sin padre, sin unicidad.
* `plant.location_id` es `NOT NULL` con clave foránea: toda planta tiene sitio, obligatoriamente.
* `species-catalog` ya resolvió el `409` al retirar algo en uso, y los otros dos catálogos de esta serie lo repiten.

## Goals / Non-Goals

**Goals:**

* Poder mirar un espacio y ver qué hay dentro, que es la pregunta que se le hace a una localización.
* Poder corregir un nombre y retirar lo que sobra, sin abrir la jerarquía.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se toca el esquema y no se añade componente al kit.

### La jerarquía no se anticipa

Este change deja el catálogo **plano**, tal como está el esquema.

**Por qué**: T-18 no es un campo `parent_id`; es ruta completa, movimientos como evento, y el inventario preguntando por una localización *y todas sus descendientes*. Dejar hoy un `parentId` opcional sin nada que lo respete —ni la consulta, ni el borrado, ni el filtro— es una columna que miente. Es más barato añadir la jerarquía con quien la va a usar.

**Lo que sí se hace** es no cerrarle la puerta: la ficha ya reserva el sitio de la jerarquía, marcado, así que T-18 rellena un hueco previsto en lugar de rehacer la pantalla.

## Decisions

### El nombre no se hace único

No se añade índice ni comprobación de duplicados.

**Por qué**: el esquema no lo tiene, y con la jerarquía el nombre pasará a ser único **dentro de su padre**, no globalmente —«Estantería 1» tiene todo el sentido en dos invernaderos distintos—. Imponer hoy una unicidad global sería crear una restricción para retirarla en T-18, y entretanto impediría datos legítimos.

**Descartado**: normalizar como en etiquetas. Allí la unicidad es el punto —una etiqueta repetida es un error—; aquí un nombre repetido puede ser correcto.

### La retirada comprueba el uso antes de borrar

Se cuenta primero, y solo entonces se borra.

**Por qué**: es lo mismo que hace `species-catalog`, y hace falta igualmente para la ficha, que muestra el recuento. Dejar saltar la clave foránea obligaría a reconocer la violación por el nombre de la restricción desde `application`, que es acoplarse al esquema.

**La carrera existe** —alguien puede crear una planta entre la comprobación y el borrado— y se acepta: la clave foránea sigue siendo la red, y el resultado sería un `500` en una ventana de milisegundos a la escala de un vivero. Queda anotado porque es una decisión, no un descuido.

### El `409` se explica por lo que significa, y con salida

La pantalla no dice «conflicto»: dice cuántos ejemplares hay y ofrece verlos.

**Por qué**: quien intenta retirar una localización llena casi siempre quiere vaciarla primero. El siguiente paso —el inventario filtrado por esa localización— **ya funciona** desde T-02, así que ofrecerlo no cuesta nada y convierte un error en una tarea.

### La ficha lista los ejemplares con el filtro que ya existe

`GET /plants?location=` con su paginación, no un endpoint nuevo.

**Por qué**: es exactamente la misma pregunta, ya construida y probada. La ficha muestra la primera página y enlaza al inventario filtrado para el resto, que es donde están la ordenación y las columnas.

### Lo que falta se marca en la pantalla, no solo en el código

La jerarquía, las características del espacio, los movimientos y las tareas aparecen con su ticket a la vista.

**Por qué**: es el criterio ya establecido en este bloque. Una ficha con un árbol de localizaciones inventado es indistinguible de una que funciona; el comentario en el fichero protege al programador, la marca en pantalla protege la conversación sobre el producto.

## Risks / Trade-offs

* **Sin unicidad, dos localizaciones pueden llamarse igual** → se acepta a conciencia (arriba). El catálogo muestra el recuento de ejemplares, que es lo que las distingue en la práctica hasta que haya ruta.
* **La ficha se queda a medias respecto al prototipo** → precisamente por eso se marca: la mitad que falta tiene ticket y hueco reservado.
* **Retirar una localización no ofrece mover sus plantas** porque el movimiento no existe todavía → la salida que se ofrece es verlas; moverlas en bloque es T-18 con T-24.

## Migration Plan

Ninguna migración: la tabla `location` existe desde `V1__schema.sql` y este change no cambia el esquema.
