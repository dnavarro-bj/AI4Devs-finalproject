# Tasks: localizaciones-jerarquicas

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde.

## 1. Esquema y dominio (backend)

- [x] 1.1 Tests de esquema (`LocationHierarchySchemaTest`): V12 deja las localizaciones existentes como raíces con código único; `CHECK` de tipo, entorno, exposición, capacidad > 0, no ser su propio padre; FK del padre; índice único de `lower(trim(code))`; `plant_movement` con `from <> to` y FKs; las plantas existentes no tienen movimientos
- [x] 1.2 Migración `V12__location_hierarchy.sql`: columnas nuevas, relleno de `code` en la propia migración, `NOT NULL` y restricciones, tabla `plant_movement` e índices por planta y por localización
- [x] 1.3 Tests de dominio de los enums (`LocationType`, `LocationEnvironment`, `LocationExposure`): `value` explícito, `invoke()` normaliza y falla ante lo desconocido
- [x] 1.4 Enums y convertidores (ADR-007)
- [x] 1.5 Tests de dominio de `Location` (nombre y código en blanco, capacidad no positiva, ser su propio padre, estado intacto ante un rechazo, `update` de reemplazo completo) y de `PlantMovement` (origen = destino rechazado) y `Plant.moveTo` (devuelve el movimiento ya construido, o nada si no cambia)
- [x] 1.6 `Location` ampliada, `PlantMovement` y `Plant.moveTo` con las invariantes en `init`/factoría (ADR-011)

## 2. API de localizaciones (backend)

- [x] 2.1 Tests de API (`LocationHierarchyApiTest`): alta raíz y anidada, con ficha completa, sin código `400`, código repetido sin distinguir mayúsculas `409`, padre inexistente `400`, vocabulario y capacidad `400`; `PUT` de reemplazo completo, mover con contenido sin movimientos ni cambios de plantas, ciclo propio y con descendiente `409`, pasar a raíz; retirada con ejemplares, con hijas, con movimientos y vacía
- [x] 2.2 Tests de lectura: `GET /locations` con ruta, recuento directo y total a varios niveles, filtros `parentId` y `root`; `GET /{id}` con ancestros ordenados y sublocalizaciones con recuentos; **número de sentencias independiente del número de filas**
- [x] 2.3 Puerto `LocationRepository` con las consultas recursivas (ruta, ancestros, recuento total, ids del subárbol) con tope de profundidad, y `JpaLocationRepository`
- [x] 2.4 DTOs, `LocationService` (mapeo dentro de la transacción; comprobación de ciclo y `pg_advisory_xact_lock` al cambiar el padre) y `LocationController` con los campos y `parentId`
- [x] 2.5 Test de concurrencia: dos ediciones simultáneas que juntas formarían un ciclo no lo producen (una responde `409`)
- [x] 2.6 Los tests existentes de localizaciones, de plantas y de especies siguen en verde

## 3. Movimientos y filtro de inventario (backend)

- [x] 3.1 Tests de API (`PlantMovementApiTest`): lote de varios con origen real, instante y destino; uno que ya está (`unchanged`); lote con inexistente, vacío o repetido `400` sin mover nada; destino inexistente `404`; más de 2000 ids `400`; historial de ejemplar y de localización paginados, recientes primero, con nombres; ejemplar sin historial; `404`s
- [x] 3.2 Tests de `PUT /plants/{id}`: cambiar de localización registra movimiento; no cambiar no lo registra; edición rechazada no deja ni cambio ni movimiento; el alta no registra
- [x] 3.3 Puerto `PlantMovementRepository`, `PlantMovementService` (una consulta `IN` para las plantas) y controllers
- [x] 3.4 `PlantService` edita con `moveTo` y registra el movimiento en la misma transacción
- [x] 3.5 Tests de `GET /plants?location=&includeDescendants=`: directas por defecto, con descendientes a varios niveles, total coincidente con `plantCountTotal`, referencia inexistente vacía; implementar la variante de `PlantSpecs` con conjunto de localizaciones

## 4. Frontend: feature, service, mappers y kit

- [x] 4.1 Tests de `buildLocationTree`, de la propuesta de código desde el nombre (`LOC-I1-BN`, sin pisar el escrito a mano) y de los mappers formulario ↔ DTO
- [x] 4.2 Crear `src/features/locations/` moviendo lo de localización desde `catalogs`; tipos, service completo (`ServiceResponse`), mappers y utilidades; el selector de localización del alta y la edición de planta pasa al nuevo service
- [x] 4.3 Tests de composables: carga de todas las páginas para el árbol, ficha con sublocalizaciones y movimientos, movimiento por lote (alcance, éxito, error sin perder la selección)
- [x] 4.4 Composables de `locations` (ADR-015: sin HTTP directo, sin que el componente lea el API)
- [x] 4.5 Revisar `UiTree`, `UiEntityPicker`, `UiTable` y `UiBreadcrumbs` contra lo que piden las pantallas (plegado, buscador, exclusión de nodos, selección); lo que falte se amplía **con su test y su muestra en `/ui-kit`**, nunca en la pantalla; `test/design-tokens.spec.ts` en verde

## 5. Frontend: pantallas

- [x] 5.1 Tests del catálogo (`locations`): árbol con niveles y plegado, carga total por nodo, búsqueda, tarjetas de zona con proporción solo con capacidad, vacío, error; ya no hay marca de T-18
- [x] 5.2 Catálogo de localizaciones con la composición del prototipo
- [x] 5.3 Tests de la ficha (`location-detail`): ruta y breadcrumbs reales con ancestros navegables, métricas, «Dentro de» con «Añadir dentro», ejemplares paginados y filtro con descendientes, características con ocupación, últimos movimientos, vacía, inexistente; tareas, próximo trabajo y alertas siguen marcados (T-22, T-23)
- [x] 5.4 Ficha de localización con la composición del prototipo y el historial completo de movimientos
- [x] 5.5 Tests del formulario (`location-editor`): posición y ruta resultante, padre sin la propia ni descendientes, código propuesto y no pisado, `409` de código junto al campo, `409` de retirada explicado por causa, precarga en edición, error sin perder lo escrito
- [x] 5.6 `LocationForm` y páginas de alta/edición con la composición del prototipo; retirada con su explicación y salida
- [x] 5.7 Tests del movimiento: selección en la lista de ejemplares, destino sin el origen, alcance declarado antes de confirmar, cancelar no mueve, éxito con el recuento, error sin perder la selección; historial de movimientos y marca T-20 en la ficha del ejemplar
- [x] 5.8 «Mover a…» en la ficha de la localización y el historial de movimientos en la ficha del ejemplar
- [x] 5.9 **Contraste de cada pantalla contra su prototipo**, bloque a bloque (`locations`, `location-detail`, `location-editor`): lista de lo que se reproduce, lo que queda marcado con su ticket (T-22, T-23, T-20) y la única desviación (historial completo), anotada en el propio change

## 6. Documentación y cierre

- [x] 6.1 `docs/diagramas/modelo-datos-actual.md` (V12) y el borrador de gestión: retirar `LOCATION.path`, cerrar los pendientes 9, 16 y 17
- [x] 6.2 `README.md`: campos, rutas, recuentos, `PUT` de reemplazo completo, endpoints de movimiento y el efecto de `PUT /plants/{id}`
- [x] 6.3 Ticket T-18 cerrado con la corrección del pendiente de la ruta; historias F.1 y 1.9 y la 0.9 enlazadas; marcar en 1.9 lo aplazado a T-20
- [x] 6.4 Suite completa de backend y de frontend en verde
- [x] 6.5 Comprobar contra el backend real en Docker (V12 aplicada sobre datos existentes) y en el navegador: crear jerarquía, mover una bancada con contenido, mover un lote, intentar un ciclo
- [x] 6.6 `openspec validate localizaciones-jerarquicas`
