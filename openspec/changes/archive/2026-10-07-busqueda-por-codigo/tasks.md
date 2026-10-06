# Tasks: busqueda-por-codigo

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que las pantallas.

## 1. Filtro de plantas por código

- [x] 1.1 Escribir los tests de integración de «Filtro del inventario por código»: código completo, parcial sin distinguir mayúsculas, prefijo de especie, combinado con localización, texto vacío, sin coincidencias, comodines literales y paginado. En rojo
- [x] 1.2 Escribir el test de la función de escape de `LIKE`: `%`, `_`, `\` y texto normal. En rojo
- [x] 1.3 Implementar el escape y `PlantSpecs.byCodeContaining`, y el parámetro `code` en `GET /plants` y `PlantService.search`

## 2. Filtro de especies por código

- [x] 2.1 Escribir los tests de integración de «Filtro del catálogo de especies por código»: parcial, vacío, sin coincidencias y combinado con paginación y orden. En rojo
- [x] 2.2 Añadir `findAll(spec, pageable)` al puerto de especies y `JpaSpecificationExecutor` a su interfaz, la especificación `SpeciesSpecs.byCodeContaining` y el parámetro `code` en `GET /species`
- [x] 2.3 Suite del backend en verde

## 3. Services del frontend

- [x] 3.1 Escribir los tests de los services: `code` viaja como parámetro solo cuando hay texto, en plantas y en especies. En rojo
- [x] 3.2 Añadir `code` a la consulta de `plantsApiService.list` y a `speciesApiService.list`, y exponerlo en sus composables
- [x] 3.3 Escribir el test y crear `useDebouncedRef` en `shared/composables`: entrega el valor tras la pausa y descarta los intermedios

## 4. La caja del inventario

- [x] 4.1 Escribir los escenarios de «Búsqueda por código en el inventario»: escribir un código, una petición por pausa, quitar el filtro aplicado, combinada con localización, sin coincidencias con salida, y la caja que declara T-21. En rojo
- [x] 4.2 Activar la caja de `app/pages/plants/index.vue`: estado con retardo, filtro aplicado, vuelta a la primera página y estado vacío con el texto buscado
- [x] 4.3 Actualizar el test de las maquetas del inventario, que daba la caja por deshabilitada

## 5. La búsqueda global

- [x] 5.1 Escribir los escenarios de «Búsqueda global de plantas y especies por código»: planta por código, especie por código, resultados reales, ejemplos marcados, respuesta tardía que no pisa, y fallo de un API sin romper el diálogo. En rojo
- [x] 5.2 Reescribir `searchApiService.search`: dos peticiones paralelas, agrupar, degradar por tipo, localizaciones y etiquetas de ejemplo marcadas con `· ejemplo`; borrar plantas y especies del catálogo de ejemplo
- [x] 5.3 Añadir al composable el retardo y el descarte de respuestas obsoletas por número de secuencia
- [x] 5.4 Ajustar los tests de la búsqueda global y del armazón que dependían del catálogo de ejemplo

## 6. Cierre

- [x] 6.1 Comprobar con `curl` los filtros contra el backend desplegado, incluidos los comodines y el texto vacío
- [x] 6.2 Documentar `?code=` en el OpenAPI del `README.md` y marcar T-15 como hecho en `docs/tickets/T-15-codigos-de-inventario.md`
- [x] 6.3 Suites completas del backend y del frontend en verde, y comprobación de tokens
- [x] 6.4 Contraste final contra `plants` y el diálogo de búsqueda del prototipo, con la lista de lo que se reproduce y lo que sigue marcado con su ticket
