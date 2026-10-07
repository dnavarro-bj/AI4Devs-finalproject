# Tasks: alertas-con-ciclo-de-vida

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisito previo:** `tareas-modelo-y-api` y `tareas-agenda-y-pantallas` archivados (`task`, `V15`); este change usa `V16`.

## 1. Esquema y dominio (backend)

- [ ] 1.1 Tests de esquema (`AlertSchemaTest`): una alerta de planta y una de localización, planta y localización a la vez o ninguna rechazadas, enums, `occurrences ≥ 1`, apertura sin estado anterior y resto con él, el índice único parcial (dos abiertas iguales rechazadas, cerrada + nueva aceptada, manuales exentas, planta y localización por separado), `task.origin_alert_id` y el origen `alerta`, FK a planta/localización/lectura, datos previos intactos y sin alertas fabricadas
- [ ] 1.2 Migración `V16__alerts.sql`: `alert`, `alert_transition`, los dos índices únicos parciales, índices de bandeja (`status, severity`, `plant_id`, `location_id`) y `task.origin_alert_id` con el `CHECK` de origen ampliado
- [ ] 1.3 Tests de los enums (`AlertStatus`, `AlertSource`, `AlertCategory`, `AlertSeverity`): `value` explícito, `invoke()` y desconocido; orden de severidad; transiciones de `AlertStatus.canMoveTo`
- [ ] 1.4 Enums y convertidores (ADR-007)
- [ ] 1.5 Tests de `RangeDeviation` (puro): por debajo, por encima, dentro, límite exacto, rango degenerado, solo mínimo o solo máximo, cortes del 25 % y el 75 %
- [ ] 1.6 `RangeDeviation` y la severidad que sale de la distancia
- [ ] 1.7 Tests de dominio de `Alert`: apertura con ocurrencia 1; `review`, `resolve` y `dismiss` con su transición, fechas con el `Clock` y rechazo desde un estado final sin tocar nada; `recordOccurrence` suma, actualiza la fecha, enlaza la lectura y escala `max(actual, distancia, ocurrencias)` sin bajar nunca; una cerrada no admite ocurrencias; exactamente planta o localización
- [ ] 1.8 `Alert`, `AlertTransition` y sus identificadores (ADR-008), con validación antes de asignar (ADR-011); `InvalidAlertTransitionException`
- [ ] 1.9 Tests y lectura de los umbrales (`AlertProperties`): valores por defecto, valores propios, incoherencia que impide arrancar

## 2. Detección (backend)

- [ ] 2.1 Tests de detección de medición (`AlertDetectionTest`, servicio contra PostgreSQL): temperatura, humedad y luz fuera de rango por debajo y por encima, rango efectivo con cuidados propios, medida ausente o sin rango, pH y riego sin evaluar, varias medidas, lectura dentro de rango, severidad por distancia, motivo con medida y rango, lectura enlazada
- [ ] 2.2 Tests de sin duplicados: segunda lectura suma y enlaza la última, escalada por ocurrencias y por una lectura más grave, la severidad no baja, una `revisada` sigue siendo la abierta, una cerrada no se reabre, categorías separadas, **dos lecturas concurrentes** dejan una sola alerta (reintento tras el índice único)
- [ ] 2.3 `AlertDetectionService.onReading` y su reintento ante la violación del índice; `CareRecordService.create` lo llama dentro de su transacción
- [ ] 2.4 Tests de API de la integración (`CareRecordAlertApiTest`): `POST /care-records` abre la alerta y la respuesta no cambia, lectura inválida sin alertas, lecturas anteriores a la migración no se reevalúan
- [ ] 2.5 Tests de la IA (`RecommendationAlertTest`, con el doble del `CareAdvisor`): `high` enriquece la abierta de la lectura sin tocar origen, estado ni severidad; `high`/`medium` sin alerta abre una `recomendacion_ia` de categoría `otra` con su severidad; `low` no hace nada; repetir la petición no repite el efecto; fallo del proveedor `502` sin alerta de IA y con la de medición intacta; el listado de lecturas no genera nada
- [ ] 2.6 `AlertDetectionService.onRecommendation` y el tercer bloque transaccional de `RecommendationService`
- [ ] 2.7 Tests del proceso de tiempo (`TimeBasedAlertsTest`, con `MutableClock`): sin revisar con 43 días, observación reciente lo evita, un movimiento o un cambio de estado no cuentan, ejemplar archivado, sin ninguna observación cuenta el alta; tarea vencida de una planta (riego y otro tipo), de una localización, de varias plantas (nada), ya completada u omitida (nada); **una ocurrencia por día UTC** al ejecutarlo dos veces y suma al día siguiente
- [ ] 2.8 `AlertDetectionService.detectTimeBased` con sus dos consultas agregadas, y el planificador `@Scheduled` (hora y activación configurables, apagado en los tests) sin lógica propia
- [ ] 2.9 La suite completa del backend sigue en verde

## 3. API de alertas, tareas y lecturas agregadas (backend)

- [ ] 3.1 Tests de API del listado y la ficha (`AlertListingApiTest`): filtros repetibles y combinados, origen y categoría, planta y localización con `includeDescendants`, orden de bandeja por defecto y por claves públicas, orden por severidad que no es alfabético, paginación sin pérdidas ni repeticiones, `400` ante un filtro ininterpretable, id inexistente vacío, `404`, el detalle con su historial y sus tareas
- [ ] 3.2 Tests de API de alta manual (`AlertManualApiTest`): sobre planta y sobre localización, planta y localización a la vez o ninguna `400`, motivo en blanco `400`, referencia inexistente `400`, dos manuales conviven, ejemplar archivado, apertura en el historial
- [ ] 3.3 Tests de API del ciclo (`AlertLifecycleApiTest`): recorrer el ciclo con tres transiciones, resolver directo, descartar no es resolver (sin fecha ni comentario de resolución), cerrada `409` sin cambios, revisar dos veces `409`, `404`, el comentario opcional
- [ ] 3.4 `AlertService`, `AlertSpecs`, `AlertSortKeys`, DTOs y `AlertController` (`GET /alerts`, `GET /alerts/{id}`, `POST /alerts` y las tres transiciones); `DELETE` responde `405`
- [ ] 3.5 Tests de la tarea desde una alerta (`TaskFromAlertApiTest`): `originAlertId` guarda origen y enlace sin tocar la alerta, varias tareas por alerta, `?alert=` y `originAlertId` en la respuesta, alerta inexistente `400`, cerrada `409`, sin alerta sigue `manual`
- [ ] 3.6 Tests de la propuesta al completar (`CompleteSuggestsAlertApiTest`): con alerta abierta trae `suggestedAlertResolution`, con la alerta ya cerrada no, tarea manual no, omitir y cancelar no, la alerta no cambia, cerrar una alerta no toca sus tareas pendientes
- [ ] 3.7 `TaskService` con `originAlertId` y `?alert=`, y la propuesta en la respuesta de completar
- [ ] 3.8 Tests de la cronología (`AlertTimelineApiTest`): apertura, revisión y resolución como tres entradas, la apertura sin estado anterior, `?type=alerta`, las ocurrencias no generan entradas, una alerta de localización no aparece en las plantas, alerta manual, orden estable con el resto de tipos, paginación sin pérdidas
- [ ] 3.9 `TimelineType.Alert`, la rama de la unión nativa, la carga por tipo y el detalle `alert` en `PlantTimelineService`
- [ ] 3.10 Tests de `openAlerts` de localizaciones (`LocationOpenAlertsApiTest`): total con descendientes y mayor severidad, cerradas fuera, sin alertas, una consulta agregada para la página (contador de consultas como en `CareRecordListingQueryCountTest`), propias frente a totales en la ficha; retirar una localización con alertas propias `409`
- [ ] 3.11 `openAlerts` en `GET /locations` y `GET /locations/{id}` con la consulta recursiva existente
- [ ] 3.12 Tests de `attention` (`PlantAttentionApiTest`): mayor severidad abierta, sin alertas, cerrada no cuenta, una sola consulta para la página, alertas abiertas de `GET /plants/{id}` ordenadas por gravedad
- [ ] 3.13 `attention` en el listado del inventario y las alertas abiertas en el detalle
- [ ] 3.14 La suite completa del backend sigue en verde

## 4. Frontend

- [ ] 4.1 Tests del service (`alerts.api.service.test.ts`): parámetros repetidos de `status` y `severity`, paginación, orden, transiciones, alta manual, errores como valor (ADR-015); el modo de maqueta desaparece
- [ ] 4.2 Tipos reales, service, mapper (respuesta → tarjeta, severidad y estado con rótulo y marca, ocurrencias y última detección dichas con una fecha de referencia recibida, cómo se cerró) y la tabla categoría → tipo de tarea con su test; borrar `alerts.mock.ts`
- [ ] 4.3 Tests de `useAlerts`: filtros al servidor y por defecto abiertas, cargar más sin repetir, recuento de la cabecera, error con reintento, recarga tras una transición
- [ ] 4.4 `useAlerts` y `useAlertActions` (revisar, resolver, descartar con comentario, crear alerta manual)
- [ ] 4.5 Tests del diálogo de resolver/descartar y del de alta manual: comentario opcional, texto de cada acción, el `409` se explica sin perder lo escrito, enfoque y cierre
- [ ] 4.6 Diálogos de cierre y de alta manual sobre el kit
- [ ] 4.7 Tests de la bandeja (`alerts-screen.nuxt.spec.ts` reescrito): composición del prototipo bloque a bloque, cuatro filtros habilitados incluido origen, acciones por estado, cerradas con su cierre y sin acciones, ocurrencias, planta o localización navegable, vacío, error con reintento, paginación, filtro al servidor, sin aviso de maqueta
- [ ] 4.8 `app/pages/alerts/index.vue` y `AlertCard` sobre datos reales
- [ ] 4.9 Tests de crear tarea desde una alerta: el formulario se abre con tipo, título, destino y prioridad de la alerta, la tarea guardada lleva `originAlertId` y la alerta conserva su estado
- [ ] 4.10 Tests de completar con alerta de origen: la propuesta aparece, aceptar resuelve con el comentario, declinar la deja abierta y visible, sin alerta no propone
- [ ] 4.11 Crear tarea desde la alerta y la propuesta al completar
- [ ] 4.12 Tests del Dashboard: cifra de abiertas real con su matiz de críticas, bloque con las más graves primero, sin alertas, error del bloque sin tumbar la pantalla, sin ninguna marca de T-23
- [ ] 4.13 `useDashboard` y la pantalla con alertas reales; borrar el aviso de maqueta
- [ ] 4.14 Tests de la ficha del ejemplar: aviso real de la más grave con su acción, varias alertas contadas, sin alertas lo dice, `alerta` en la cronología y su filtro, anotar una alerta sin recargar; borrar `MOCK_NOTICE`
- [ ] 4.15 Ficha del ejemplar con sus alertas y la entrada de cronología de tipo `alerta`
- [ ] 4.16 Tests del inventario y de las localizaciones: columna de atención real con texto además de color y vacía sin alertas, la opción de ordenar por atención sigue deshabilitada y marcada, el recuento por localización en el catálogo y el mapa, el bloque y la métrica de alertas de la ficha de la localización con enlace filtrado, sin marcas de T-23
- [ ] 4.17 Inventario, catálogo, mapa y ficha de la localización con las alertas reales
- [ ] 4.18 Si «marca de severidad» o «fila de meta» se repite en dos pantallas, sacarla al kit con su test y su muestra en `/ui-kit`; suite completa en verde, incluido `design-tokens`

## 5. Documentación y cierre

- [ ] 5.1 `docs/diagramas/modelo-datos-actual.md` (`V16`) y el borrador de tareas y alertas: lo construido, la tabla de transiciones propia, las preguntas 6, 7, 13 y 15 resueltas
- [ ] 5.2 `README.md`: las alertas, su ciclo, la detección, la escalada, la configuración y los endpoints
- [ ] 5.3 Ticket T-23 cerrado, historia 1.15 sin pendiente, §24.10 resuelta en el documento de producto y `CLAUDE.md` con el estado
- [ ] 5.4 Contraste final con el prototipo, bloque a bloque: `alerts` (cabecera, filtros, tarjeta, acciones) con lo que se aparta —«Resolver», ocurrencias, cerradas—; los bloques de alertas de `dashboard`, `location-detail` y `plant-detail`; lista de lo que se reproduce y de lo que queda marcado con su ticket
- [ ] 5.5 Comprobar contra el backend real en Docker (`V16` aplicada): una lectura fuera de rango abre la alerta, la segunda suma ocurrencia, el ciclo completo, la tarea desde la alerta y la propuesta al completar, y el proceso programado ejecutado a mano con datos de prueba; después en el navegador
- [ ] 5.6 `openspec validate alertas-con-ciclo-de-vida`
