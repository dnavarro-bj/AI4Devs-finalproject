# Tasks: catalogo-etiquetas

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que las pantallas. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Consulta y recuento

- [x] 1.1 Escribir el test del puerto para contar las plantas de una etiqueta, incluido el caso de cero. En rojo
- [x] 1.2 Ampliar `TagRepository` y `TagService` con la consulta individual y su recuento, e implementar `GET /tags/{id}` con su test de integración: etiqueta con plantas, sin plantas, e inexistente → `404`

## 2. Renombrado

- [x] 2.1 Escribir el test de renombrado: a un nombre libre conservando las asignaciones; a uno ya usado —aunque difiera en mayúsculas o espacios— → `409`; **al mismo nombre que ya tenía**, que no es conflicto; y en blanco → `400`. En rojo
- [x] 2.2 Implementar `PUT /tags/{id}` comprobando la unicidad normalizada **por identificador y no solo por nombre**, que es donde falla esta comprobación

## 3. Combinación

- [x] 3.1 Escribir el test de combinación: las plantas del origen pasan al destino, el origen desaparece, y la respuesta dice cuántas plantas se vieron afectadas. En rojo
- [x] 3.2 Escribir el test del caso que rompe la ingenua: **una planta que ya tiene ambas etiquetas**. No puede provocar clave duplicada ni perder la asignación
- [x] 3.3 Escribir el test de combinar una etiqueta consigo misma → `400`, y con una inexistente → `404`, comprobando que no se retira nada
- [x] 3.4 Implementar `POST /tags/{id}/merge` en una sola transacción: reasignar lo que no colisiona, descartar lo que sí, y **solo entonces** borrar la etiqueta de origen

## 4. Retirada

- [x] 4.1 Escribir el test de retirada: sin uso → `204`; en uso → `409` comprobando además que la etiqueta sigue ahí. En rojo
- [x] 4.2 Implementar `DELETE /tags/{id}` comprobando el uso **antes** del borrado, no capturando la violación de clave foránea
- [x] 4.3 Suite del backend en verde

## 10. El recuento en el listado

Descubierto al construir la pantalla: el catálogo necesita el uso de cada etiqueta para comparar
unas con otras, y `GET /tags` solo daba el nombre. Se sirve el dato en lugar de recortar la
pantalla, con la misma agregación que el catálogo de localizaciones.

- [x] 10.1 Escribir el test del puerto: una página de tags trae el recuento de cada uno, y el que nadie usa trae cero. En rojo
- [x] 10.2 Implementar la consulta agregada —una sola para toda la página— y ampliar `GET /tags` con `plantCount`, con su test de integración

## 5. El service del frontend

- [x] 5.1 Comprobar con `curl` la forma real de las cuatro operaciones nuevas, incluidas las respuestas de `409` y del recuento de la combinación
- [x] 5.2 Escribir el test del service con el cliente doblado, incluidos los caminos de error. En rojo
- [x] 5.3 Implementar el service devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md))

## 6. Las pantallas

- [x] 6.1 Escribir los escenarios de «Catálogo de etiquetas», incluido que **una etiqueta con cero plantas se muestra**, no se oculta. En rojo
- [x] 6.2 Crear `app/pages/tags/index.vue` sobre `UiTable`, hasta que 6.1 pase
- [x] 6.3 Escribir los escenarios de «Ficha de una etiqueta»: con plantas navegables, y sin plantas ofreciendo retirarla. En rojo
- [x] 6.4 Crear `app/pages/tags/[id]/index.vue`, listando las plantas con el filtro que ya existe y enlazando al inventario filtrado para el resto

## 7. Administrar

- [x] 7.1 Escribir los escenarios de administración: renombrado, nombre ya usado señalado **junto al campo**, alcance de la combinación declarado antes de confirmar, combinación cancelada, y retirada en uso que **ofrece combinar** en lugar de dejar sin salida. En rojo
- [x] 7.2 Implementar renombrar, combinar y retirar desde la ficha con `UiDialog`, prefiriendo el mensaje del API cuando venga

## 9. Las pantallas como el prototipo

- [x] 9.1 Contrastar las dos pantallas con `tags` y `tag-detail` del [prototipo](../../../docs/wireframes/cactify-admin/index.html), bloque a bloque, antes de darlas por hechas
- [x] 9.2 Escribir los escenarios de composición del catálogo: el uso como proporción del inventario, la etiqueta sin plantas señalada, y los ejemplos, fechas, duplicados y acciones por lote marcados con su ticket. En rojo
- [x] 9.3 Componer el catálogo: resumen de salud, y el uso con `UiProportionBar` o `UiProgressBar` en la celda, sin CSS que debiera ser un componente del kit
- [x] 9.4 Escribir los escenarios de composición de la ficha: distribución como cifras destacadas, nombre normalizado en la portada, y los huecos marcados en su bloque. En rojo
- [x] 9.5 Componer la ficha: portada con `UiEntityHero`, distribución con `UiStatTile`, las dos columnas con `UiDetailLayout` y el panel de administrar en la lateral
- [x] 9.6 Si algún patrón del prototipo no está en el kit, sacarlo a componente con su test y su muestra en `/ui-kit` (ADR-014)

  > No hizo falta ninguno: `UiEntityCell`, `UiProgressBar`, `UiStatTile`, `UiEntityHero`, `UiDetailLayout`, `UiSectionHeader` y `UiDefinitionList` cubren las dos pantallas. Queda como CSS de pantalla el panel «Administrar» de la ficha, que hoy solo aparece aquí; si sale en una segunda, se saca al kit.

## 8. Cierre

- [x] 8.1 Las dos suites en verde, incluido `test/architecture.spec.ts`
- [x] 8.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [x] 8.3 Recorrer con la pila levantada: crear dos etiquetas parecidas, asignarlas a plantas distintas y a una común, combinarlas comprobando el recuento, y renombrar la resultante
- [x] 8.4 `openspec validate catalogo-etiquetas --strict` en verde, y `README.md` y `CLAUDE.md` al día con los endpoints nuevos
- [x] 8.5 Contraste final de las dos pantallas contra su `data-screen` del prototipo, con la lista de lo reproducido y lo marcado con su ticket

  > **`tags`** — cabecera con recuento y alta ✔ · salud del catálogo ✔ (con el tamaño real de la colección; los duplicados marcados T-21) · listado con nombre, uso como proporción del inventario y plantas ✔ · ejemplos marcados T-15 · fecha marcada T-20 · selección y acciones por lote marcadas T-24 · barra de búsqueda y filtros: **no**, son T-21.
  >
  > **`tag-detail`** — portada con marca, estado, nombre normalizado y sus acciones ✔ (descripción marcada T-17) · distribución como cifras destacadas ✔ (Plantas real y navegable; Especies y Localizaciones marcadas T-21) · reparto por localización marcado T-21 · plantas con la etiqueta ✔ con salida al inventario filtrado · lateral con ficha, impacto de renombrar y panel de administrar ✔ (fechas marcadas T-20).
