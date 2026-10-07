# Tasks: cronologia-del-ejemplar

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisito previo:** `localizaciones-jerarquicas` archivado (`plant_movement`, `V12`).

## 1. Esquema y dominio (backend)

- [x] 1.1 Tests de esquema (`PlantTimelineSchemaTest`): los tres satélites, `CHECK`s de tipo de evento, comentario no en blanco, intervención por tipo, floración (intervalo, `finalizada ⇔ fin`, flores), cascada, planta inexistente, datos previos intactos y sin eventos fabricados
- [x] 1.2 Migración `V13__plant_timeline.sql`: `plant_event`, `plant_comment`, `plant_intervention`, `plant_bloom`, restricciones e índices (`plant_id, occurred_at DESC` y `batch_id`)
- [x] 1.3 Tests de dominio de los enums (`InterventionType`, `BloomStatus`, `TimelineType`): `value` explícito, `invoke()` y desconocido
- [x] 1.4 Enums y convertidores (ADR-007)
- [x] 1.5 Tests de dominio de `PlantComment`: texto en blanco, recorte, edición que fija `editedAt` y conserva el instante, rechazo que no toca nada, fecha futura contra el `Clock`
- [x] 1.6 Tests de dominio de `PlantIntervention`: datos propios por tipo, dato ajeno rechazado, reemplazo completo, estado intacto ante un rechazo
- [x] 1.7 Tests de dominio de `PlantBloom`: inicio y fin, `finalizada ⇔ fin`, abierta, flores negativas, instante igual al inicio a las 00:00 UTC, fecha futura
- [x] 1.8 `PlantEvent` (herencia `JOINED`), `PlantComment`, `PlantIntervention`, `PlantBloom` y sus identificadores tipados (ADR-008), con validación antes de asignar (ADR-011)

## 2. Eventos y cronología (backend)

- [x] 2.1 Tests de API de comentarios (`PlantCommentApiTest`): alta, fecha pasada, sin texto, fecha futura, descripción intacta, corregir con `editedAt`, sin editar no lo trae, borrar, comentario de otra planta `404`, ejemplar archivado
- [x] 2.2 Tests de API de intervenciones (`PlantInterventionApiTest`): un caso por tipo, dato ajeno, mezcla inexistente `400`, tipo desconocido, sin tarea previa, corregir el tipo, corrección inválida sin cambios, borrar, `404`
- [x] 2.3 Tests de API de floraciones (`PlantBloomApiTest`): abierta, finalizada, finalizada sin fin, abierta con fin, fin anterior, flores negativas, cerrar editando, borrar, `404`, la especie no cambia
- [x] 2.4 Servicios y controllers de los tres recursos, con DTOs de entrada y la entrada de cronología como respuesta
- [x] 2.5 Tests de la cronología (`PlantTimelineApiTest`): los seis tipos mezclados y ordenados, detalle de cada tipo, lectura inmediata, estado y movimiento, desempate estable, planta sin historia, `404`, aislamiento entre plantas, `batchId` presente y ausente
- [x] 2.6 Tests de paginación y filtro (`PlantTimelinePagingTest`): 30 eventos en tres páginas sin pérdidas ni repeticiones, totales, filtro por uno y por varios tipos, filtro antes de paginar, orden relativo conservado, tipo desconocido `400`
- [x] 2.7 Puerto `PlantTimelineRepository`, su implementación nativa en `infrastructure` y `PlantTimelineService` (una consulta por tipo, mapeo dentro de la transacción) con `GET /plants/{id}/timeline`
- [x] 2.8 La suite completa del backend sigue en verde

## 3. Kit y frontend

- [x] 3.1 Tests de `UiTimeline` con filtro controlado (emite y no filtra, marca el activo, `null` vuelve a todos, sin control filtra por sí misma); implementarlo y mostrarlo en `/ui-kit`
- [x] 3.2 Tests del service de la cronología y de los tres recursos (`timeline.api.service.test.ts`): parámetros repetidos de `type`, paginación, errores como valor
- [x] 3.3 Tipos, service y mapper (entradas → eventos del kit, tipos con marca y tono, etiquetas de intervención y estado de floración, tipo desconocido con reserva)
- [x] 3.4 Tests del composable `usePlantTimeline`: cargar, filtrar, cargar más sin repetir, colocar un evento nuevo por instante solo si encaja en el filtro, reemplazar, quitar y ajustar el recuento, recargar
- [x] 3.5 `usePlantTimeline`
- [x] 3.6 Tests de los diálogos: comentario (vacío), intervención (campos por tipo), floración (fin solo si finalizada), error del API sin perder lo escrito, corregir precarga, retirar con confirmación
- [x] 3.7 Diálogos y cuerpos de tarjeta por tipo (lectura con su recomendación, comentario con «editado», intervención, floración, cambio de estado, movimiento, lote)
- [x] 3.8 Tests de la ficha: cronología real sin maqueta, filtro al servidor, cargar anteriores conservando el filtro, vacía, fallo sin tumbar la ficha, entradas sin recargar (lectura, estado, comentario) y sin colarse con filtro
- [x] 3.9 Ficha de planta: sustituir la cronología de maqueta, el botón «＋ Añadir» y «Cargar registros anteriores»; borrar `MOCK_EVENTS`
- [x] 3.10 Tests de la pestaña Floración y de «última floración»: lista y recuento, en curso, sin floraciones, sin mezclar la esperada; `plantGlance` recibe la floración real y se borra `MOCK_LAST_BLOOM`
- [x] 3.11 Pestaña Floración y «de un vistazo»; fixtures de test; suite completa en verde, incluido `design-tokens`

## 4. Documentación y cierre

- [x] 4.1 `docs/diagramas/modelo-datos-actual.md` (`V13`) y el borrador de gestión: lo construido, la desviación de la espina y `fertilizacion`
- [x] 4.2 `README.md`: la cronología y los tres recursos con sus reglas
- [x] 4.3 Ticket T-20 cerrado; §24.8 y el pendiente de la fertilización resueltos en el documento de producto y en las historias 1.4, 1.5 y 1.6; retirar `T-06` de lo pendiente
- [x] 4.4 Comprobar contra el backend real en Docker (`V13` aplicada) y en el navegador
- [x] 4.5 `openspec validate cronologia-del-ejemplar`
