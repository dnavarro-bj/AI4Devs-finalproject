# Tasks: catalogo-especies

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). La suite queda en verde al final de cada bloque.

## 1. El service, que nadie ha ejercitado entero

- [x] 1.1 Levantar el backend y comprobar con `curl` la forma real de `POST /species`, `PUT /species/{id}` y `DELETE /species/{id}`: qué devuelven, qué cuerpo esperan, y qué responde el borrado de una especie **con** ejemplares. Anotar lo que se encuentre antes de construir sobre ello

  **Lo comprobado**, contra la pila levantada: `POST` devuelve `201` con la especie completa; `PUT` es reemplazo completo y devuelve `200`; `DELETE` sin ejemplares, `204`. Los tres errores traen mensaje aprovechable —`409` *«La especie '200001' tiene ejemplares registrados y no se puede eliminar»*, `409` *«Ya existe una especie con el nombre científico '…'»*, `400` *«La humedad mínima (80) no puede superar a la máxima (20)»*— así que la pantalla los prefiere al texto propio, como decía el diseño. `GET` de un id inexistente, `404`.

  **Lo que destapó, y bloqueó el editor:** `soilMixId` es **obligatorio** en `POST` y en `PUT`, pero `GET /species/{id}` **no lo devuelve** y no existe ningún endpoint para listar mezclas. El alta no tiene de dónde sacar el selector, y la edición —al ser reemplazo completo— sustituiría la mezcla actual por una arbitraria al guardar cualquier otro cambio. La propuesta daba la mezcla por maqueta, y eso valía para leerla pero no para escribirla.

  **Decisión:** [`catalogo-sustratos`](../catalogo-sustratos/proposal.md) se aplica **antes** que este change, y se lleva consigo devolver la mezcla en la respuesta de especie. Este change se retoma después, entero y de una pasada.
- [ ] 1.2 Escribir el test de `species.api.service.ts` con el cliente doblado: listar, detalle, crear, corregir y retirar, incluido el camino de error de cada uno. En rojo
- [ ] 1.3 Implementar el service en `src/features/species/services/`, devolviendo `ServiceResponse` y sin lanzar, hasta que 1.2 pase

## 2. El catálogo

- [ ] 2.1 Escribir los escenarios de «Catálogo de especies»: catálogo con especies, catálogo vacío con su única salida, navegación a la ficha y ordenación pedida al API. En rojo
- [ ] 2.2 Crear `app/pages/species/index.vue` sobre `UiTable` y `UiFilterBar`, con el recuento de ejemplares marcado como maqueta, hasta que 2.1 pase
- [ ] 2.3 Verificar que la ruta deja de ser una pantalla marcador y que `test/pending-section.nuxt.spec.ts` sigue en verde

## 3. La ficha

- [ ] 3.1 Escribir los escenarios de «Ficha de una especie»: especie existente con sus rangos, especie inexistente con salida al catálogo, y lo que es maqueta reconocible como tal. En rojo
- [ ] 3.2 Crear `app/pages/species/[id]/index.vue` con cabecera, condiciones recomendadas sobre `UiSummaryGrid`, y las secciones de pauta anual, floración, fotografías y ejemplares explicando su ticket, hasta que 3.1 pase
- [ ] 3.3 Comprobar que la ruta `[id]` y la de edición **no entran en conflicto**: la ficha va en `[id]/index.vue`, como se corrigió en las plantas

## 4. Alta y edición

- [ ] 4.1 Escribir los escenarios de «Alta y edición de una especie»: alta que lleva a la ficha, edición prellenada, rango invertido señalado sin enviar, y nombre duplicado señalado **en su campo**. En rojo
- [ ] 4.2 Extraer el formulario compartido a un componente de la feature, por secciones con `UiEditorNav` y `UiFormSection`
- [ ] 4.3 Implementar las dos rutas sobre ese formulario, hasta que 4.1 pase

## 5. Retirada

- [ ] 5.1 Escribir los escenarios de «Retirada de una especie»: confirmada, cancelada, y con ejemplares explicando esa causa concreta. En rojo
- [ ] 5.2 Implementar la retirada desde la ficha con `UiDialog`, traduciendo el `CONFLICT` a su explicación y **prefiriendo el mensaje del API** cuando venga, hasta que 5.1 pase

## 6. Cierre

- [ ] 6.1 `yarn test` con toda la suite en verde, incluido `test/architecture.spec.ts`
- [ ] 6.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [ ] 6.3 Recorrer el catálogo con el backend levantado: crear una especie, corregirla, intentar retirar una que tenga ejemplares y retirar la creada
- [ ] 6.4 `openspec validate catalogo-especies --strict` en verde, `CLAUDE.md` al día, y abrir el ticket del API de mezclas de sustrato que este change ha destapado
