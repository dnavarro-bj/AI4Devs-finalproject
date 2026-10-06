# Tasks: edicion-de-planta

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que la pantalla. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Dominio

- [x] 1.1 Escribir el test de `Plant.update`: cambia los tres campos, **no** acepta un apodo en blanco y, si falla, no deja ninguno aplicado. En rojo
- [x] 1.2 Añadir `Plant.update(nickname, location, species)` revalidando la invariante antes de asignar nada, sin abrir los `private set`

## 2. Edición de la planta

- [x] 2.1 Escribir los tests de integración de «Edición de una planta»: apodo corregido y con espacios, cambio de localización, cambio de especie con los cuidados nuevos, edición idempotente, apodo en blanco → `400`, planta inexistente → `404`. En rojo
- [x] 2.2 Escribir el test de que cambiar la especie **conserva** identificador, fecha de alta, tags, lecturas y análisis de IA. En rojo
- [x] 2.3 Escribir el test de que la edición **no toca los tags**. En rojo
- [x] 2.4 Implementar `PUT /plants/{id}` con su cuerpo de petición, `PlantService.update` y el mapeo a DTO dentro de la transacción, hasta que 2.1 a 2.3 pasen

## 3. Referencias de la edición

- [x] 3.1 Escribir los tests de «Validación de las referencias de una planta» para la edición: especie inexistente, localización inexistente, identificador con formato inválido, y **referencia inválida junto a un apodo nuevo** comprobando que el apodo anterior se conserva. En rojo
- [x] 3.2 Resolver la planta y **después** las referencias, y solo entonces mutar; comprobar el orden con una planta inexistente y una referencia inválida a la vez → `404`
- [x] 3.3 Suite del backend en verde

## 4. El service del frontend

- [x] 4.1 Comprobar con `curl` la forma real de `PUT /plants/{id}`, incluido el cuerpo del `400` y del `404`
- [x] 4.2 Escribir el test del service con el cliente doblado, incluidos los caminos de error. En rojo
- [x] 4.3 Añadir `update` a `PlantsApiService` devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)), y exponerlo en `usePlants`

## 5. La pantalla de edición

- [x] 5.1 Escribir los escenarios de «Alta y edición de una planta con el mismo formulario»: edición guardada y vuelta a la ficha, **sin aviso de guardado parcial**, edición rechazada sin perder lo escrito. En rojo
- [x] 5.2 Conectar `onSubmit` de `app/pages/plants/[id]/edit.vue` al guardado, navegar a la ficha y mostrar el error del API; retirar el aviso `partial-save` y el comentario que lo justificaba
- [x] 5.3 Corregir el pie de `PlantForm.vue`: lo que no se guarda ya está deshabilitado y marcado, no se excusa en un guardado parcial
- [x] 5.4 Actualizar los tests de `plant-edit` que daban por hecho el aviso

## 6. Cierre

- [x] 6.1 Corregir `docs/tickets/T-26-api-de-edicion-de-planta.md` —`400` y no `404` para referencias del cuerpo— y añadir `PUT /plants/{id}` a la tabla del API del `README.md`
- [x] 6.2 Suite completa del backend y del frontend en verde, y comprobación de tokens
- [x] 6.3 Contraste final contra la pantalla `plant-create` del prototipo, bloque a bloque: la composición no cambia, solo se conecta el guardado; listar lo que sigue marcado con su ticket (T-15, T-16, T-18, T-19)
