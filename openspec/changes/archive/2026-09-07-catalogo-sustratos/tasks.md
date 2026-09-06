# Tasks: catalogo-sustratos

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend va antes que las pantallas, porque estas no tienen nada contra lo que construirse. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. El puerto y el servicio

- [x] 1.1 Escribir el test del puerto ampliado: guardar, listar paginado, retirar y contar las especies que usan una mezcla. En rojo
- [x] 1.2 Ampliar `SoilMixRepository` con `save`, `findAll(pageable)`, `delete` y `countSpeciesUsing`, e implementarlo en la misma interfaz `JpaSoilMixRepository`, **sin clase adaptadora**. Corregir el comentario del puerto, que dice que el catálogo no tiene endpoints
- [x] 1.3 Escribir el test de `SoilMixService` cubriendo los escenarios de composición: suma distinta de 100, pH fuera de escala y rango invertido, en alta **y** en corrección. En rojo
- [x] 1.4 Implementar `SoilMixService` devolviendo DTOs y nunca entidades, con `open-in-view` apagado y el mapeo dentro de la transacción ([ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md))

## 2. El API

- [x] 2.1 Escribir el test de integración del controller: `POST` que devuelve `201`, `GET` de uno y del listado paginado, `PUT` y `DELETE`. En rojo
- [x] 2.2 Implementar `SoilMixController` inyectando **solo** el servicio de `application`, con `@SortDefault` para un orden estable ([ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md))
- [x] 2.3 Escribir el test de los caminos de error: mezcla inexistente en `GET`, `PUT` y `DELETE` → `404`; composición inválida → `400` con su mensaje. Ninguno puede ser un `500`
- [x] 2.4 Escribir el test de la retirada de una mezcla **en uso** → `409`, comprobando además que la mezcla sigue ahí. Implementar la comprobación **antes** del borrado, no capturando la violación de clave foránea
- [x] 2.5 Escribir el test de que **la ficha de una especie devuelve su mezcla**, con identificador y nombre, y el de que reenviar esa ficha como corrección conserva la mezcla. En rojo
- [x] 2.6 Añadir la mezcla a `SpeciesCareResponse`. Comprobar que la ficha de planta, que la anida, sigue en verde
- [x] 2.7 Suite del backend en verde

## 3. El service del frontend

- [x] 3.1 Comprobar con `curl` contra el backend levantado la forma real de las cinco operaciones, incluida la respuesta del `409` y la mezcla en la ficha de especie. Anotar lo que se encuentre
- [x] 3.2 Escribir el test de `soilMixes.api.service.ts` con el cliente doblado, incluido el camino de error de cada operación. En rojo
- [x] 3.3 Implementar el service en `src/features/soil-mixes/`, devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md))

## 4. El catálogo y la ficha

- [x] 4.1 Escribir los escenarios de «Catálogo de mezclas»: catálogo con mezclas y catálogo vacío con su única salida. En rojo
- [x] 4.2 Crear `app/pages/soil-mixes/index.vue` sobre `UiTable`, hasta que 4.1 pase
- [x] 4.3 Escribir los escenarios de «Ficha de una mezcla»: composición en proporción y en cifras, y mezcla inexistente con salida al catálogo. En rojo
- [x] 4.4 Crear `app/pages/soil-mixes/[id]/index.vue` usando `UiProportionBar` —que T-12 dejó sin usar por ninguna pantalla— y mostrando cuántas especies la recomiendan, hasta que 4.3 pase

## 5. Alta, edición y retirada

- [x] 5.1 Escribir los escenarios de «Alta y edición»: composición que no cuadra señalando cuánto falta o sobra, rango de pH invertido, y alta que lleva a la ficha. En rojo
- [x] 5.2 Extraer el formulario compartido a un componente de la feature e implementar las dos rutas, hasta que 5.1 pase
- [x] 5.3 Escribir los escenarios de «Retirada»: confirmada, y mezcla en uso explicando esa causa concreta. En rojo
- [x] 5.4 Implementar la retirada desde la ficha con `UiDialog`, prefiriendo el mensaje del API cuando venga

## 6. Cierre

- [x] 6.1 Las dos suites en verde, incluido `test/architecture.spec.ts`
- [x] 6.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [x] 6.3 Recorrer el catálogo con la pila levantada: crear una mezcla, corregirla, asociarla a una especie nueva, intentar retirarla y comprobar el `409`, y retirar otra sin uso
- [x] 6.4 Comprobar que el editor de especies deja de estar bloqueado: `GET /species/{id}` trae su mezcla y `GET /soil-mixes` puebla el selector, que es lo que [`catalogo-especies`](../catalogo-especies/tasks.md) necesitaba
- [x] 6.5 `openspec validate catalogo-sustratos --strict` en verde, y `README.md` y `CLAUDE.md` al día con los endpoints nuevos
