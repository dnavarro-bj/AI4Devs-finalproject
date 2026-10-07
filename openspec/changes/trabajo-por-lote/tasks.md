# Tasks: trabajo-por-lote

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisitos previos:** `alertas-con-ciclo-de-vida` archivado (usa `V16`). Migración `V17`.

## 1. Esquema y dominio (backend)

- [ ] 1.1 Tests de esquema (`BatchSchemaTest`): `CHECK`s de acción y de tipo de alcance, `plant_count ≥ 1`, FK de `plant_event.batch_id` y de `care_record.batch_id`, que ninguna fila previa tenga lote, datos intactos
- [ ] 1.2 Migración `V17__batches.sql`: tabla `batch`, FK de `plant_event.batch_id`, columna e índice parcial en `care_record`
- [ ] 1.3 Tests de dominio de `BatchAction`, `BatchScopeKind` y `Batch` (valores, número ≥ 1, inmutable)
- [ ] 1.4 `Batch`, `BatchId`, enums con converters (ADR-007/008) y su repositorio; quitar `insertable = false` de `PlantEvent.batchId`, añadir `batchId` a `CareRecord` y a las factorías, solo asignable desde el lote

## 2. Alcance y previsualización

- [ ] 2.1 Tests del resolutor (`BatchScopeResolverTest`): lista, localización con y sin descendientes, consulta con los criterios del listado, archivadas fuera, inexistentes `400`, dos formas `400`, `page/size/sort` ignorados, exclusión ajena `400`
- [ ] 2.2 Tests de API de la previsualización (`BatchPreviewApiTest`): el número, con exclusiones, `422` por encima del máximo, no escribe nada, coincide con lo que luego se aplica
- [ ] 2.3 `BatchScopeResolver`, `POST /batches/preview` y `BATCH_MAX_PLANTS` en la configuración

## 3. Aplicar un lote

- [ ] 3.1 Tests de la lectura por lote (`BatchReadingApiTest`): una por planta con el mismo instante y `batch_id`, excluidas sin ella, sin medidas `400` sin escribir, fecha futura, `batchId` y `batchSize` en la cronología, la lectura individual sin lote
- [ ] 3.2 Tests de intervención y comentario por lote (`BatchEventApiTest`): poda, trasplante con maceta, dato ajeno `400` sin escribir, comentario en blanco, sin marca de editado
- [ ] 3.3 Tests de atomicidad y escala (`BatchAtomicityTest`): fallo a mitad no deja nada ni la fila de la operación, `plantCount` real, 1.500 plantas en una transacción, `GET /batches/{id}` y `404`
- [ ] 3.4 `BatchService` (validar con la primera planta antes de escribir, bloques de 100, mapeo dentro de la transacción) y `BatchController`: `POST /batches` y `GET /batches/{id}`
- [ ] 3.5 Tests y soporte de la cronología: `batchId` en las lecturas, `batchSize` en toda entrada de lote, el alta directa y el de tarea ignoran `batchId`, consultas por tipo sin una por fila
- [ ] 3.6 `batchId`/`batchSize` en `TimelineEntryResponse` y `CareRecordResponse`, y `@BatchSize` donde haga falta
- [ ] 3.7 Suite completa del backend en verde (`./gradlew test --rerun-tasks`)

## 4. Kit y frontend

- [ ] 4.1 Tests de `UiSelectionBanner` (ofrecer, ampliar emite, ya ampliada, nada que ampliar, raíz única, `aria-live`); implementarlo y mostrarlo en `/ui-kit`; actualizar el recuento del kit en `CLAUDE.md`
- [ ] 4.2 Tests del service de lotes (preview y aplicar, `422`, errores como valor) y de `useBatch` (previsualiza al abrir y al excluir, alcance lista y consulta, aviso del número real, error sin perder lo escrito)
- [ ] 4.3 Service, tipos y `useBatch`
- [ ] 4.4 Extraer los cuerpos de la lectura, la intervención y el comentario a componentes `…Fields` compartidos con la alta individual (sus tests siguen en verde)
- [ ] 4.5 Tests del diálogo de lote (número del servidor, lista con exclusiones paginadas, campos por acción, alcance vacío, `422`, error sin perder lo escrito, resultado) y `BatchDialog`
- [ ] 4.6 Tests del inventario (barra con las tres acciones y su número, banner de «todo el resultado», el alcance pasa a ser la consulta, cambiar un filtro vacía la selección, «Mover» y «Etiquetar» marcados) y la barra de selección de `/plants`
- [ ] 4.7 Tests de la ficha de la localización («Registrar en toda la localización» con y sin descendientes, vacía no se ofrece) y su botón
- [ ] 4.8 Tests de la cronología («En un lote de N plantas» solo en los de lote) y la leyenda en las entradas
- [ ] 4.9 Suite completa del frontend en verde, incluido `design-tokens` y `architecture`

## 5. Cierre

- [ ] 5.1 Verificar a mano contra el backend real: registrar una lectura de 200 ml sobre toda una localización, ver el evento con «En un lote de N plantas» en dos fichas, un lote con exclusiones y uno de «todo el resultado» de un filtro
- [ ] 5.2 Actualizar T-24 (primera parte), `CLAUDE.md`, el README de tickets y `modelo-datos-actual.md`; archivar en la misma PR
