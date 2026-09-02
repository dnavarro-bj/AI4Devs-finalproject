# Proposal: api-lecturas-cultivo

**Ticket:** [T-03 - API de lecturas ambientales](../../../docs/tickets/T-03-api-de-lecturas-ambientales.md)
**Historia relacionada:** [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md)

## Why

El inventario que abrió T-02 permite registrar plantas, pero no anotar nada sobre ellas: la tabla `care_record` existe desde T-01 y no tiene ni una vía de entrada. Sin lecturas no hay historial que consultar (0.5) ni material con el que construir el prompt de la IA, así que este change es el prerrequisito directo de T-04 y de T-06 —y el segundo eslabón del flujo E2E, después del alta de planta.

## What Changes

* **Alta de lecturas**: `POST /plants/{id}/care-records` registra una lectura con humedad, temperatura, horas de luz, cantidad de riego y acidez del sustrato.
* **La fecha de la lectura puede venir en la petición; si falta, la sella el servidor.** El cliente que no la manda obtiene el comportamiento del criterio 3 de [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md) ("se registra la fecha y hora automáticamente"), y el que sí la manda conserva el momento real de la lectura. Es el prerrequisito de la app móvil de [F.5](../../../docs/user-stories/F.5-app-movil-sincronizacion-sensores-bluetooth.md), que guardará lecturas en local y las enviará más tarde: sin campo de fecha, todas llegarían fechadas en el momento de la sincronización. **Esto se aparta del texto literal de T-03** ("con `recordedAt` asignado automáticamente por el servidor"), que asumía que el único cliente sería una web siempre conectada.
* **Una fecha en el futuro se rechaza**, admitiendo un pequeño margen de tolerancia configurable para absorber relojes ligeramente desincronizados: una lectura no puede haberse tomado en un momento que aún no ha llegado.
* **Listado de lecturas**: `GET /plants/{id}/care-records` devuelve el historial de una planta **paginado** ([ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md)) y ordenado de más reciente a más antigua, con desempate estable. El ticket lo describe sin límite; la regla del API lo prohíbe.
* **Cada lectura del listado llega con su recomendación de IA ya persistida, o `null`** si aún no tiene. Hoy siempre será `null` —T-04 es quien las genera—, pero el contrato queda fijado ahora para que el historial de T-06 se pinte con una consulta y no con una llamada al proveedor de IA por fila.
* **Validación de rangos**: humedad `0-100`, horas de luz `0-24`, riego `>= 0`, acidez `0-14` y temperatura `-50-80`. Además, una lectura con los cinco valores vacíos se rechaza: no es una lectura.
* **`NULL` y `0` en la cantidad de riego dejan de ser lo mismo**: `NULL` es "no se midió", `0` es "se comprobó y no se regó". T-04 derivará de ahí el último riego que manda al prompt.
* **Migración `V4__`**: las restricciones de rango bajan a `CHECK` sobre `care_record` ([ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)), que hoy no tiene ninguna, más el índice `(plant_id, recorded_at DESC)` que sirve la consulta del listado. **T-04 arranca en `V5__`.**
* Una lectura sobre una planta inexistente responde `404`, no una página vacía: es la regla que T-02 dejó fijada —lo que falta en la **ruta** es `404`.

## Capabilities

### New Capabilities

- `care-records`: registro y consulta de lecturas de cultivo de una planta — alta con fecha aportada por el cliente o sellada por el servidor, validación de rangos, y listado paginado en orden descendente con la recomendación de IA asociada cuando exista.

### Modified Capabilities

- `data-model`: se añade el requisito de restricciones de dominio de las lecturas de cultivo (rangos de humedad, temperatura, horas de luz, riego y acidez como `CHECK` en base de datos). El resto del esquema no cambia: la tabla `care_record` ya existe con sus columnas y su clave ajena.

## Non-goals

* **Editar y borrar lecturas** (`PUT`/`DELETE`): T-03 solo pide crear y consultar. Una lectura es un hecho registrado en un momento dado; corregirla es una historia que nadie ha escrito todavía.
* **Generar recomendaciones de IA**: es T-04. Este change deja el hueco en el contrato del listado y nada más — `build.gradle.kts` no tiene ninguna dependencia de OpenAI ni cliente HTTP más allá de `spring-boot-starter-web`.
* **La ruta anidada por lectura** (`/plants/{id}/care-records/{careRecordId}`) y la excepción de lectura inexistente: ninguna ruta de este change lleva `careRecordId`, así que llegan con T-04.
* **El alta por lotes** (varias lecturas en una sola petición): F.5 la necesitará para volcar lo acumulado sin conexión, pero este change solo abre el campo de fecha, que es lo que hace la carga diferida *posible*. El endpoint sigue registrando una lectura por petición.
* **Conservar el desplazamiento horario que manda el cliente**: la fecha se guarda como el **instante** equivalente, que es lo único que `timestamptz` almacena ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)); una lectura enviada como `08:00+02:00` se recupera como `06:00Z`, el mismo momento. Guardar además la hora local del usuario exigiría una columna aparte y no la pide ninguna historia. El servidor no corrige la fecha: solo comprueba que no sea futura.
* **Agregados y estadísticas** del historial (medias, series, tendencias): no los pide ninguna historia en alcance.
* **API de especies y frontend**: T-05 en adelante.

## Impact

* `backend/src/main/kotlin/com/cactify/domain/repos/`: puertos `CareRecordRepository` y `AIRecommendationRepository` (este último, solo lectura por ahora; T-04 lo amplía). **Ninguna entidad cambia**: `care_record`, `CareRecord.kt` y `CareRecordId` ya existen, y la recomendación se resuelve por página con una consulta aparte en lugar de con una asociación inversa (ver `design.md`, decisión 4).
* `backend/src/main/kotlin/com/cactify/application/`: `CareRecordService` y los DTOs de respuesta en `dto`.
* `backend/src/main/kotlin/com/cactify/infrastructure/`: `JpaCareRecordRepository` y `JpaAIRecommendationRepository` en `persistence`. El bean `Clock` que sella la fecha ya existe en `TimeConfiguration` desde `fechas-y-auditoria`: este change lo consume, no lo crea.
* `backend/src/main/kotlin/com/cactify/web/`: `CareRecordController` en `controllers` con su cuerpo de petición, y un `@ExceptionHandler` más en `errors/ApiExceptionHandler.kt` si el diseño lo necesita. Se reutiliza `PlantNotFoundException`, ya definida.
* `backend/src/main/resources/application.yml`: propiedad nueva para el margen de tolerancia de fechas futuras, sobreescribible por variable de entorno como el resto.
* `backend/src/main/resources/db/migration/V4__care_record_constraints.sql`: `CHECK` de rangos e índice del listado. **Ninguna migración existente se edita** ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)).
* `backend/src/test/`: tests de API sobre `AbstractApiIntegrationTest` (su `clearPlants()` ya borra `care_record`), escritos antes del código ([ADR-005](../../../docs/adr/ADR-005-tdd.md)).
* `README.md` §4: `POST /plants/{id}/care-records` pasa de previsto a implementado, y se añade la fila del `GET`, que hoy no figura en ninguna de las dos tablas.
* Contrato consumido por T-04 (último riego y desviaciones), T-06 (historial) y T-07 (paso 3 del E2E).
