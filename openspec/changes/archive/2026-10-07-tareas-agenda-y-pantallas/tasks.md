# Tasks: tareas-agenda-y-pantallas

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisito previo:** `tareas-modelo-y-api` archivado. Los tests del frontend doblan el cliente HTTP.

## 1. Kit y fecha de referencia

- [x] 1.1 Tests de `UiActionMenu` (abrir y elegir emite el id, teclado con flechas y Enter, Escape y clic fuera devuelven el foco, acción deshabilitada, `aria-haspopup`/`aria-expanded`, un solo elemento raíz, atributos al raíz)
- [x] 1.2 `UiActionMenu` y su muestra en `/ui-kit`; actualizar el recuento del kit en `CLAUDE.md` (37 → 38)
- [x] 1.3 Tests de `useReferenceDate` con el día local real inyectable; borrar `referenceDate.mock.ts` y `USE_MOCK_REFERENCE_DATE`; adaptar los tests que dependían de `2026-09-03`

## 2. Dominio de tareas (service, tipos y composable)

- [x] 2.1 Tests del service (`tasks.api.service.test.ts`): listado con filtros repetidos y `today`, detalle, alta, edición, reprogramar, alcance paginado, completar con exclusiones y registro, omitir, cancelar, errores como valor y `409`/`400` con su mensaje
- [x] 2.2 Tipos del API, etiquetas, mapper (destino a texto, prioridad al nivel del kit, entrada de agenda y de calendario) y service real; borrar `tasks.mock.ts` y la bandera
- [x] 2.3 Tests de `useTasks`: agenda con `due` y tamaño máximo, aviso de truncado, calendario por mes, completadas, filtros en la URL, `due=overdue|today`, recarga tras crear, completar, reprogramar, omitir y cancelar, error con reintento
- [x] 2.4 `useTasks` sobre la URL (`useUrlState`) y, para el ciclo de vida, `useTaskWorkflow` (qué diálogo está abierto) con `useTaskEditor`, `useTaskCompletion` y `useTaskClosing`
- [x] 2.5 Integración con el backend (hecha: el doble en memoria pasa a `test/support/tasksFake.ts` y la bandera desaparece): poner `USE_MOCK_TASKS = false` en `src/features/tasks/mocks/tasks.mock.ts`, borrar `mocks/` y verificar contra el API real (el service ya llama a las rutas y parámetros del contrato; ningún composable ni componente sabe del mock)

## 3. Pantalla de tareas

- [x] 3.1 Tests de la pantalla `/tasks`: agenda con grupos reales, filtros combinables y recarga, `?due=overdue`, calendario con «+N» y creación desde un día, completadas con estado en texto, sin tareas, más de las que caben, fallo con reintento, ninguna marca T-22
- [x] 3.2 Reescribir `app/pages/tasks/index.vue` y `TaskRow` (casilla que abre completar, `UiActionMenu` con editar, reprogramar, omitir y cancelar); «Completar varias» sigue marcado T-24

## 4. Formularios y diálogos

- [x] 4.1 Tests de `TaskForm`: sin hora, título obligatorio, fin no anterior al inicio, valores iniciales, error del API sin perder lo escrito, edición solo de pendientes
- [x] 4.2 Tests del selector de destino: modo localización, modo plantas con búsqueda por `q`, quitar una a una, tope de 500, contador de afectadas
- [x] 4.3 `TaskForm` y el selector de destino (`UiEntityPicker` no basta —es de selección única y filtra en el cliente—: se compone `TaskDestinationPicker` en la feature con el buscador de plantas por `q`)
- [x] 4.4 Tests del diálogo de completar: alcance paginado, excluir y contador, exclusiones conservadas al paginar, alcance vacío deshabilita confirmar, fecha futura, registro opcional por tipo (riego, cambio de maceta, poda, ninguno), aviso de «mismo registro para todas», resultado, error sin perder exclusiones
- [x] 4.5 `TaskCompleteDialog` y su composable
- [x] 4.6 Tests de reprogramar, omitir y cancelar (motivo opcional, confirmación de cancelar, textos de «no cuenta como cuidado», error sin perder lo escrito) y sus diálogos

## 5. Fichas, cronología y Dashboard

- [x] 5.1 Tests de la ficha del ejemplar: próximo trabajo real (propias y del invernadero), vencida con texto, «Crear tarea» con la planta de destino, sin trabajo, «de un vistazo» real; borrar `MOCK_TASKS` y `MOCK_NEXT_TASK`
- [x] 5.2 Ficha del ejemplar: «Próximo trabajo» y «Crear tarea» reales, manteniendo la marca de T-23
- [x] 5.3 Tests de la ficha de localización y del catálogo: «Crear tarea aquí», métrica y próximo trabajo reales con descendientes, enlace filtrado, sin tareas; la métrica del catálogo
- [x] 5.4 Ficha de localización y `locations/index` sobre tareas reales; las alertas siguen marcadas T-23
- [x] 5.5 Tests de la cronología: tipo `tarea` con marca y etiqueta, título y tipo de la tarea, filtro, sin editar ni borrar (`timeline.mapper.test.ts`, `usePlantTimeline.test.ts`)
- [x] 5.6 Tipo `tarea` en `TIMELINE_TYPES`, `TIMELINE_KIT_TYPES`, `entryTitle()` y el cuerpo de la entrada
- [x] 5.7 Tests del Dashboard: agenda y cifras de vencidas y de hoy reales con la fecha de referencia, cifra de alertas y tareas por zona marcadas, error de carga
- [x] 5.8 `useDashboard` sobre el service real; actualizar las marcas (alertas T-23, tareas por zona T-24)

## 6. Cierre

- [x] 6.1 Suite completa del frontend en verde, incluido `design-tokens` y `architecture`
- [x] 6.2 Verificar a mano contra el backend real: crear, completar una tarea de localización excluyendo una planta y ver el evento en la ficha de las demás, omitir y cancelar, reprogramar desde el calendario
- [x] 6.3 Marcar T-22 como cerrado (sección «Resolución» del ticket con las cuatro decisiones del §24), actualizar `CLAUDE.md` y el README de tickets; archivar en la misma PR
