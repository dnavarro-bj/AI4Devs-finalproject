# Proposal: recomendaciones-ia

**Ticket:** [T-04 - Servicio de recomendaciones con IA](../../../docs/tickets/T-04-servicio-de-recomendaciones-con-ia.md)
**Historia relacionada:** [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md)

## Why

Es el último eslabón que le falta al flujo E2E y lo que da sentido al resto: T-02 registra plantas, T-03 registra lecturas, y hasta ahora nadie las interpreta. La capacidad de leer una lectura a la luz de los rangos de su especie y decir qué hacer es el producto — sin ella, Cactify es un cuaderno de notas. Lo consumen directamente T-05 (la vista de recomendación) y T-06 (el historial con sus alertas), y es el paso 4 del test E2E de T-07.

## What Changes

* **`POST /plants/{id}/care-records/{careRecordId}/recommendation`** genera la recomendación para una lectura, la persiste y la devuelve. Si esa lectura ya tenía una, la devuelve sin volver a llamar al proveedor.
* **`GET /plants/{id}/care-records/{careRecordId}/recommendation`** solo lee: devuelve la recomendación si existe y `404` si no. **Esto se aparta del texto de T-04**, que describe un único `GET` que genera si falta. Un verbo de lectura que llama a un proveedor de pago y escribe una fila no es un `GET`, y ningún endpoint de T-02 ni de T-03 escribe bajo `GET`. Además, encadenarlo por fila desde el historial de T-06 costaría hasta 25 llamadas al proveedor por pantalla.
* **La recomendación persiste cuatro datos, no dos**: nivel de riesgo, explicación, **acción recomendada** y **prioridad de actuación**. Es lo que prometen la historia [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md), el README §1.2, el diagrama del flujo E2E y el alcance de T-05; el alcance de T-04 solo parseaba dos, y esa es la parte que se corrige.
* **Dos enumerados de dominio nuevos**, `RiskLevel` y `Priority`, siguiendo [ADR-007](../../../docs/adr/ADR-007-enums-de-dominio.md) — que ya deja el código escrito y solo hay que aplicarlo. `RiskLevel` persiste `low`/`medium`/`high`, en inglés como el resto de identificadores del proyecto; el README §3.2 y el criterio 1 del ticket, que dicen `bajo/moderado/alto`, se corrigen.
* **Una lectura tiene como mucho una recomendación**, y eso pasa a estar garantizado: `UNIQUE (care_record_id)`, que hoy no existe pese a que el diagrama del modelo lo declara. Dos peticiones simultáneas no crean dos filas: la que pierde la carrera relee y devuelve la que ganó.
* **El proveedor de IA entra por un puerto**, con el adaptador de OpenAI en `infrastructure`. Es lo que permite que T-07 corra sin red y lo que mantiene `application` sin saber quién responde.
* **Un fallo del proveedor es un error controlado**, no un `500` desnudo ni un `400` que culpe al cliente: la petición no rompe nada más y la respuesta lo dice.
* **Migración `V5__`**: las dos columnas nuevas, los `CHECK` de los dos enumerados y el `UNIQUE`, todo por [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md).
* **El prompt queda documentado** en `docs/prompts-ia.md`. El `prompts.md` de la raíz es el registro de los prompts con los que se ha construido el proyecto, otra cosa.

## Capabilities

### New Capabilities

- `ai-recommendations`: generación y consulta de la recomendación de cuidado de una lectura — construcción del prompt a partir de la especie, la lectura y el último riego, persistencia de la respuesta con su nivel de riesgo y su prioridad, unicidad por lectura y error controlado cuando el proveedor falla.

### Modified Capabilities

- `data-model`: se añade el requisito de restricciones de dominio de las recomendaciones (los valores admitidos de nivel de riesgo y de prioridad, y como mucho una recomendación por lectura).

## Non-goals

* **Regenerar una recomendación**: con `UNIQUE (care_record_id)` una lectura tiene una y solo una. Volver a preguntar a la IA sobre la misma lectura, y guardar el histórico de lo que fue diciendo, es otra historia que nadie ha escrito.
* **Overrides de cuidados por ejemplar** ([0.7](../../../docs/user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md)): los rangos salen de la ficha de la especie. La nota de 0.4 menciona los overrides, pero no existen ni en el esquema ni en el modelo.
* **Resiliencia avanzada** frente al proveedor: ni reintentos con backoff, ni circuit breaker, ni cola de reintento diferido. Un timeout y un error controlado.
* **Elegir modelo o parámetros desde la petición**: el modelo y sus ajustes son configuración del despliegue.
* **Añadir los cuatro campos al listado de lecturas de T-03**: ese listado sigue embebiendo nivel de riesgo y texto, que es lo que su spec declara y lo que el historial de T-06 necesita para pintar sus badges. La vista completa se pide por el `GET` propio.
* **API de especies, frontend, OpenAPI y autenticación**: T-05 en adelante, o sin ticket.

## Impact

* `backend/build.gradle.kts`: hoy no hay ninguna dependencia de OpenAI ni cliente HTTP más allá de `spring-boot-starter-web`. Lo que haga falta se decide en el `design.md`, con la vista puesta en no añadir peso al MVP.
* `backend/src/main/kotlin/com/cactify/domain/`: los enumerados `RiskLevel` y `Priority`; `AIRecommendation` cambia `riskLevel` de `String` al enumerado y gana los dos campos nuevos con sus invariantes ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)); y el puerto de repositorio se amplía con la escritura y la búsqueda por lectura.
* `backend/src/main/kotlin/com/cactify/infrastructure/persistence/converters/`: los converters de los dos enumerados. El directorio existe y está vacío desde que ADR-008 dejó los identificadores en `@EmbeddedId`; estos son sus primeros habitantes.
* `backend/src/main/kotlin/com/cactify/infrastructure/`: el adaptador del proveedor de IA y su configuración.
* `backend/src/main/kotlin/com/cactify/application/`: el puerto del proveedor, el servicio de recomendación y sus DTOs, más las excepciones nuevas en `ApplicationExceptions.kt`.
* `backend/src/main/kotlin/com/cactify/web/`: el controller y un `@ExceptionHandler` más en `errors/ApiExceptionHandler.kt`.
* `backend/src/main/resources/db/migration/V5__ai_recommendation_constraints.sql` y `application.yml`: las propiedades del proveedor, con `OPENAI_API_KEY` que ya llega por `iac/local/docker-compose.yml`.
* `backend/src/test/`: el doble del proveedor, que es lo que T-07 reutilizará para correr sin red.
* `docs/`: `prompts-ia.md` nuevo; corrección de `README.md` §3.2 y del criterio 1 del ticket por el vocabulario del nivel de riesgo; y `docs/diagramas/modelo-datos.md` con las columnas nuevas.
* Contrato consumido por T-05, T-06 y T-07.
