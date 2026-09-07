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

### La jerarquía no se anticipa en el esquema, pero la composición sí se reproduce

Este change deja el **modelo** plano, tal como está el esquema, y construye la **pantalla** del prototipo entera.

**Por qué lo primero**: T-18 no es un campo `parent_id`; es ruta completa, movimientos como evento, y el inventario preguntando por una localización *y todas sus descendientes*. Dejar hoy un `parentId` opcional sin nada que lo respete —ni la consulta, ni el borrado, ni el filtro— es una columna que miente.

**Por qué lo segundo**: la composición no depende del esquema. El mapa del vivero se sostiene con un solo nivel —todas las localizaciones colgando de «Toda la colección»— y con el hueco de los niveles que faltan marcado **dentro del propio mapa**. Sustituir el mapa por una tabla porque falta la jerarquía es recortar la pantalla para no tocar nada, que es justo lo que el bloque 0 existe para evitar: construir las pantallas es lo que revela lo que falta.

**Descartado**: entregar el catálogo como tabla y esperar a T-18 para componerlo. Es lo que se hizo en la primera versión de este change y lo que hubo que corregir en mezclas con `sustratos-como-el-wireframe`. Recomponer después cuesta más que componer bien la primera vez, y entretanto la pantalla no se distingue de una a medio hacer.

### El recuento viaja también en el listado, con una sola consulta

`GET /locations` devuelve `plantCount` por fila, resuelto con una agregación sobre `Plant` para toda la página.

**Por qué**: el mapa del vivero y las tarjetas de zona **son** el recuento: «Invernadero 1 · 486 plantas» y su proporción ocupada. Sin él la pantalla del prototipo no se puede construir, y marcar la cifra como pendiente sería marcar como pendiente un dato que la base de datos tiene.

**Por qué no es el `N+1` que se descartó en mezclas**: allí el recuento se dejó fuera del listado porque suponía una consulta por fila. Aquí se resuelve con un `LEFT JOIN` agregado y un `GROUP BY`: una consulta para la página entera, sea de 1 fila o de 25. Lo que se descarta sigue descartado —contar por fila—, no el dato.

**Trade-off**: el listado hace una consulta agregada más que antes. A la escala del producto —2.000 ejemplares y decenas de localizaciones— es irrelevante, y es la consulta que sostiene la pantalla más navegada del módulo.

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

### La composición sale del prototipo, bloque a bloque

`locations`: cabecera con recuento y alta · mapa del vivero (árbol) · vista general (tarjetas de zona con carga y proporción) · «Requieren atención».
`location-detail`: portada con marca, identidad y acciones · fila de métricas · principal: «Dentro de» y ejemplares · lateral: características, próximo trabajo, últimos movimientos.

De eso, hoy tienen dato real: el nombre, el recuento, los ejemplares y la administración. **Todo lo demás se dibuja igualmente, marcado con su ticket y en su sitio**: los niveles del árbol y la ruta (T-18), el código del espacio (T-15), las características (T-18), los movimientos (T-18 y T-20), las tareas (T-22) y las alertas (T-23).

**Por qué marcarlo en su sitio y no omitirlo**: un hueco marcado enseña la pantalla completa y dice quién la termina; un bloque omitido no se distingue de un olvido, y hace que T-18 tenga que rehacer el layout en lugar de rellenarlo.

**Del kit, sin CSS de pantalla**: el árbol es `UiTree`, las métricas `UiStatTile`, la proporción ocupada `UiProgressBar`, las celdas de entidad `UiEntityCell`, la portada `UiEntityHero` y las dos columnas `UiDetailLayout`. Si algún patrón no estuviera, sale al kit con su test y su muestra (ADR-014), no como CSS suelto.

### La ficha lista los ejemplares con el filtro que ya existe

`GET /plants?location=` con su paginación, no un endpoint nuevo.

**Por qué**: es exactamente la misma pregunta, ya construida y probada. La ficha muestra la primera página y enlaza al inventario filtrado para el resto, que es donde están la ordenación y las columnas.

### Lo que falta se marca en la pantalla, no solo en el código

La jerarquía, las características del espacio, los movimientos y las tareas aparecen con su ticket a la vista.

**Por qué**: es el criterio ya establecido en este bloque. Una ficha con un árbol de localizaciones inventado es indistinguible de una que funciona; el comentario en el fichero protege al programador, la marca en pantalla protege la conversación sobre el producto.

## Risks / Trade-offs

* **Sin unicidad, dos localizaciones pueden llamarse igual** → se acepta a conciencia (arriba). El catálogo muestra el recuento de ejemplares, que es lo que las distingue en la práctica hasta que haya ruta.
* **La ficha y el catálogo enseñan bloques sin dato real** → por eso van marcados y con su ticket a la vista: el riesgo de un hueco marcado es que se vea que falta, que es exactamente lo que se busca. El riesgo contrario —rellenarlo— es que no se note.
* **Retirar una localización no ofrece mover sus plantas** porque el movimiento no existe todavía → la salida que se ofrece es verlas; moverlas en bloque es T-18 con T-24.

## Migration Plan

Ninguna migración: la tabla `location` existe desde `V1__schema.sql` y este change no cambia el esquema.
