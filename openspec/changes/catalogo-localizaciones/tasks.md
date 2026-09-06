# Tasks: catalogo-localizaciones

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que las pantallas. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Consulta y recuento

- [ ] 1.1 Escribir el test del puerto para contar los ejemplares de una localización, incluido el caso de cero. En rojo
- [ ] 1.2 Ampliar `LocationRepository` y `LocationService` con la consulta individual y su recuento, e implementar `GET /locations/{id}` con su test de integración: con ejemplares, vacía, e inexistente → `404`

## 2. Corrección del nombre

- [ ] 2.1 Escribir el test de corrección: el nombre nuevo se persiste y **los ejemplares que alberga no cambian**; en blanco → `400`; inexistente → `404`. En rojo
- [ ] 2.2 Implementar `PUT /locations/{id}` apoyándose en el `rename` que la entidad ya tiene, sin duplicar su validación en el servicio

## 3. Retirada

- [ ] 3.1 Escribir el test de retirada: vacía → se acepta; con ejemplares → `409` comprobando además que la localización **y sus plantas** siguen ahí; inexistente → `404`. En rojo
- [ ] 3.2 Implementar `DELETE /locations/{id}` comprobando el uso **antes** del borrado, no capturando la violación de clave foránea
- [ ] 3.3 Suite del backend en verde

## 4. El service del frontend

- [ ] 4.1 Comprobar con `curl` la forma real de las tres operaciones nuevas, incluido el cuerpo del `409`
- [ ] 4.2 Escribir el test del service con el cliente doblado, incluidos los caminos de error. En rojo
- [ ] 4.3 Ampliar el service de catálogos devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md))

## 5. El catálogo

- [ ] 5.1 Escribir los escenarios de «Catálogo de localizaciones», incluidos el estado vacío y el error de carga. En rojo
- [ ] 5.2 Crear `app/pages/locations/index.vue` sobre `UiTable`, con el alta, hasta que 5.1 pase

## 6. La ficha

- [ ] 6.1 Escribir los escenarios de «Ficha de una localización»: con ejemplares navegables y enlace al inventario filtrado, vacía ofreciendo retirarla, y **lo que falta marcado con su ticket**. En rojo
- [ ] 6.2 Crear `app/pages/locations/[id]/index.vue`, listando los ejemplares con el filtro por localización que ya existe desde T-02
- [ ] 6.3 Dejar declarados, marcados como maqueta y con su ticket, la jerarquía y las características del espacio (T-18), los movimientos (T-18/T-20) y las tareas del lugar (T-22)

## 7. Administrar

- [ ] 7.1 Escribir los escenarios de administración: nombre corregido, retirada confirmada, y **retirada bloqueada por uso que dice cuántos ejemplares hay y ofrece verlos**. En rojo
- [ ] 7.2 Implementar corregir y retirar desde la ficha con `UiDialog`, prefiriendo el mensaje del API cuando venga

## 8. Cierre

- [ ] 8.1 Las dos suites en verde, incluido `test/architecture.spec.ts`
- [ ] 8.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [ ] 8.3 Recorrer con la pila levantada: crear una localización, asignarle una planta, comprobar que no se puede retirar y que el enlace lleva al inventario filtrado, moverla en el editor de la planta y retirarla ya vacía
- [ ] 8.4 `openspec validate catalogo-localizaciones --strict` en verde, y `README.md` y `CLAUDE.md` al día con los endpoints nuevos
