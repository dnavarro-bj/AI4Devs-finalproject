# Tasks: dashboard-operativo

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisitos previos:** `alertas-con-ciclo-de-vida` y `trabajo-por-lote` archivados. Sin migración.

## 0. Reconciliar las specs

- [x] 0.1 Con T-23 archivada, redactar el `MODIFIED` de «Dashboard de trabajo» sobre su texto vigente (cuatro cifras, sin las marcas T-22/T-23/T-24, actividad y acciones rápidas) y de «Ficha de una localización» si aún marca tareas; actualizar `specs/plant-dashboard/spec.md` de este change y validar

## 1. Backend: tareas pendientes por localización

- [x] 1.1 Tests (`LocationPendingTasksApiTest`): tarea directa, de lo que contiene, plantas expresas cuentan una vez, una sola vez por doble vía, lo cerrado no cuenta, cero, coincide con `GET /tasks?location=&includeDescendants=true`, una consulta agregada para 25 localizaciones
- [x] 1.2 `pendingTasks` en `GET /locations` y `GET /locations/{id}` con una consulta agregada por el subárbol; medir con 500 localizaciones y anotar el resultado en el design

## 2. Backend: actividad reciente

- [x] 2.1 Tests de API (`ActivityApiTest`): un lote es una línea, tarea completada sin sus eventos ni lectura, comentario suelto, intervención suelta, lo que no es actividad, orden estable, paginado, vacío, tarea abierta no cuenta
- [x] 2.2 Tests de recuento de consultas (`ActivityQueryCountTest`, `LocationPendingTasksQueryCountTest`): una por página más una por tipo, no una por fila
- [x] 2.3 Puerto `ActivityRepository`, implementación nativa con `UNION ALL` en `infrastructure`, `ActivityService` (mapeo dentro de la transacción) y `GET /activity`; índices por instante en `batch` y `task` si la medición lo pide
- [x] 2.4 Suite completa del backend en verde (`./gradlew test --rerun-tasks`)

## 3. Frontend: el Dashboard

- [x] 3.1 Tests de `useDashboard`: cuatro cifras con su ruta filtrada, vencidas hace más de una semana, sin revisar desde las alertas, cada bloque falla solo y reintenta, carga paralela
- [x] 3.2 Service de actividad, tipos y mapper de entradas a líneas («Lectura en 31 plantas», tarea con sus plantas, comentario con su planta enlazada), y `pendingTasks` en el tipo de localización
- [x] 3.3 Tests de la pantalla: las cuatro cifras abren su conjunto filtrado y quitable, carga por zona con plantas, tareas y alertas, panel de actividad con lote colapsado y estados vacío y error, acciones rápidas, ninguna marca de maqueta
- [x] 3.4 Reescribir `app/pages/index.vue` y `useDashboard` con la composición del design, retirando las marcas T-22, T-23 y T-24
- [x] 3.5 Tests del diálogo de lote sin alcance (primero la localización, luego el número) y su modo en `BatchDialog`
- [x] 3.6 Suite completa del frontend en verde, incluido `design-tokens` y `architecture`

## 4. Cierre

- [x] 4.1 Verificar a mano contra el backend real: las cuatro cifras llevan a su listado filtrado, un lote aparece como una línea en la actividad, el cuidado por lote desde el Dashboard
- [x] 4.2 Marcar T-24 como cerrado (sección «Resolución» con las decisiones), actualizar `CLAUDE.md`, el README de tickets y el ticket; archivar en la misma PR
