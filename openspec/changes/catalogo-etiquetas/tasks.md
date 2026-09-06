# Tasks: catalogo-etiquetas

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que las pantallas. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Consulta y recuento

- [ ] 1.1 Escribir el test del puerto para contar las plantas de una etiqueta, incluido el caso de cero. En rojo
- [ ] 1.2 Ampliar `TagRepository` y `TagService` con la consulta individual y su recuento, e implementar `GET /tags/{id}` con su test de integración: etiqueta con plantas, sin plantas, e inexistente → `404`

## 2. Renombrado

- [ ] 2.1 Escribir el test de renombrado: a un nombre libre conservando las asignaciones; a uno ya usado —aunque difiera en mayúsculas o espacios— → `409`; **al mismo nombre que ya tenía**, que no es conflicto; y en blanco → `400`. En rojo
- [ ] 2.2 Implementar `PUT /tags/{id}` comprobando la unicidad normalizada **por identificador y no solo por nombre**, que es donde falla esta comprobación

## 3. Combinación

- [ ] 3.1 Escribir el test de combinación: las plantas del origen pasan al destino, el origen desaparece, y la respuesta dice cuántas plantas se vieron afectadas. En rojo
- [ ] 3.2 Escribir el test del caso que rompe la ingenua: **una planta que ya tiene ambas etiquetas**. No puede provocar clave duplicada ni perder la asignación
- [ ] 3.3 Escribir el test de combinar una etiqueta consigo misma → `400`, y con una inexistente → `404`, comprobando que no se retira nada
- [ ] 3.4 Implementar `POST /tags/{id}/merge` en una sola transacción: reasignar lo que no colisiona, descartar lo que sí, y **solo entonces** borrar la etiqueta de origen

## 4. Retirada

- [ ] 4.1 Escribir el test de retirada: sin uso → `204`; en uso → `409` comprobando además que la etiqueta sigue ahí. En rojo
- [ ] 4.2 Implementar `DELETE /tags/{id}` comprobando el uso **antes** del borrado, no capturando la violación de clave foránea
- [ ] 4.3 Suite del backend en verde

## 5. El service del frontend

- [ ] 5.1 Comprobar con `curl` la forma real de las cuatro operaciones nuevas, incluidas las respuestas de `409` y del recuento de la combinación
- [ ] 5.2 Escribir el test del service con el cliente doblado, incluidos los caminos de error. En rojo
- [ ] 5.3 Implementar el service devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md))

## 6. Las pantallas

- [ ] 6.1 Escribir los escenarios de «Catálogo de etiquetas», incluido que **una etiqueta con cero plantas se muestra**, no se oculta. En rojo
- [ ] 6.2 Crear `app/pages/tags/index.vue` sobre `UiTable`, hasta que 6.1 pase
- [ ] 6.3 Escribir los escenarios de «Ficha de una etiqueta»: con plantas navegables, y sin plantas ofreciendo retirarla. En rojo
- [ ] 6.4 Crear `app/pages/tags/[id]/index.vue`, listando las plantas con el filtro que ya existe y enlazando al inventario filtrado para el resto

## 7. Administrar

- [ ] 7.1 Escribir los escenarios de administración: renombrado, nombre ya usado señalado **junto al campo**, alcance de la combinación declarado antes de confirmar, combinación cancelada, y retirada en uso que **ofrece combinar** en lugar de dejar sin salida. En rojo
- [ ] 7.2 Implementar renombrar, combinar y retirar desde la ficha con `UiDialog`, prefiriendo el mensaje del API cuando venga

## 8. Cierre

- [ ] 8.1 Las dos suites en verde, incluido `test/architecture.spec.ts`
- [ ] 8.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [ ] 8.3 Recorrer con la pila levantada: crear dos etiquetas parecidas, asignarlas a plantas distintas y a una común, combinarlas comprobando el recuento, y renombrar la resultante
- [ ] 8.4 `openspec validate catalogo-etiquetas --strict` en verde, y `README.md` y `CLAUDE.md` al día con los endpoints nuevos
