# Design: recomendaciones-ia

## Context

Motivación en [`proposal.md`](proposal.md) — Why. Estado y restricciones que condicionan el enfoque:

* `ai_recommendation` existe desde T-01 con `risk_level TEXT NOT NULL` y `recommendation_text TEXT NOT NULL`, **sin `CHECK` ni `UNIQUE`**. La entidad `AIRecommendation` hereda de `AbstractEntity`, tiene sus campos con `private set` y sus invariantes de texto no vacío ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)). La tabla **está vacía en todos los entornos**: ninguna vía de entrada la escribe.
* `AIRecommendationRepository` existe con un solo método de lectura, `findAllByCareRecordIdIn`, que T-03 usa para embeber la recomendación en el listado de lecturas.
* `infrastructure/persistence/converters/` existe y **está vacío**: ADR-008 dejó los identificadores en `@EmbeddedId` y no llegó a necesitarlo. Los converters de estos dos enumerados son sus primeros habitantes.
* `build.gradle.kts` no tiene ninguna dependencia de OpenAI, ni cliente HTTP más allá de `spring-boot-starter-web`, ni librería de mocking. `application.yml` no declara ninguna propiedad del proveedor; `OPENAI_API_KEY` ya llega al contenedor por `iac/local/docker-compose.yml`.
* `ApiExceptionHandler` mapea nueve excepciones, entre ellas **`IllegalArgumentException` a `400`** ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)).
* Migraciones aplicadas: `V1__`…`V4__`. La siguiente libre es `V5__`.
* T-03 fijó que `NULL` y `0` en la cantidad de riego significan cosas distintas, y anotó que el último riego se derivaría de `water_amount_ml > 0`.
* `MutableClockConfiguration` es el precedente del proyecto para sustituir un colaborador en los tests con un `@TestConfiguration` y `@Primary`, sin librería de mocking.

## Goals / Non-Goals

Alcance y exclusiones en [`proposal.md`](proposal.md). A nivel de diseño:

**Goals:**

* Que T-07 pueda ejecutar el flujo completo **sin red**, con un punto de sustitución explícito y sin añadir librerías.
* Que la IA interprete, no invente: los rangos y las desviaciones se calculan aquí y entran ya resueltos.
* Que un fallo del proveedor sea legible en la respuesta y no se confunda con un error del cliente.

**Non-Goals:**

* Calidad del prompt: se documenta y se itera, pero afinarlo no es trabajo de este change.
* Coste y consumo de tokens: fuera del MVP.

## Decisions

### 1. `POST` genera, `GET` lee

```
POST /plants/{id}/care-records/{careRecordId}/recommendation  -> 201, o 200 si ya existía
GET  /plants/{id}/care-records/{careRecordId}/recommendation  -> 200 | 404
```

El ticket describe un único `GET` que genera si no existe. Se parte por tres razones concretas: un `GET` que llama a un proveedor de pago y escribe una fila rompe la semántica del verbo y la convención que T-02 y T-03 dejaron —ningún `GET` del API escribe—; el historial de T-06 podría encadenarlo por fila y costar hasta 25 llamadas por pantalla; y el paso 4 de T-07 deja de ser idempotente.

Que se aparte del texto del ticket no es excepcional: T-03 ya lo hizo con `recordedAt`, y por el mismo motivo — el ticket se escribió antes de saber lo que ahora sabemos.

**El `POST` es idempotente**: si la lectura ya tiene recomendación, devuelve la existente con `200` y **no consulta al proveedor**. Así, reintentar tras un timeout de red del cliente no genera —ni paga— dos veces.

Alternativa descartada: **mantener el `GET` generador**, fiel al ticket y con una sola llamada para el cliente, a cambio de las tres consecuencias de arriba.

### 2. Cuatro datos, dos enumerados

La recomendación persiste nivel de riesgo, explicación, **acción recomendada** y **prioridad de actuación**, que es lo que prometen 0.4, el README §1.2, el diagrama del flujo E2E y el alcance de T-05. El alcance de T-04 solo parseaba dos, y es lo que se corrige.

Nivel de riesgo y prioridad son enumerados de dominio, escritos con el patrón que [ADR-007](../../../docs/adr/ADR-007-enums-de-dominio.md) ya deja resuelto —`value` explícito, `invoke()` que normaliza y falla, `toString()`, y un `AttributeConverter` con `@Converter(autoApply = true)`—. No hay nada que re-decidir ahí, solo aplicarlo.

**`RiskLevel` persiste `low`, `medium`, `high`.** El README §3.2 y el criterio 1 del ticket dicen `bajo/moderado/alto`; se corrigen. La convención del proyecto es documentación en español y **código e identificadores en inglés**, y el valor persistido de un enumerado es un identificador, no un texto que se muestre. La etiqueta que vea el usuario la pone el frontend, que es quien sabe en qué idioma habla.

**`Priority` persiste `immediate`, `soon`, `routine`**: *cuándo* hay que actuar. Se eligen así, y no `low/medium/high`, para que la prioridad diga algo que el nivel de riesgo no dice ya — si ambos usaran la misma escala, el segundo campo sería una copia del primero y no valdría la columna que cuesta.

`recommended_action` es obligatorio: para una planta sana la acción es "no hacer nada", que también es una acción. Permitir el vacío obligaría a todos los consumidores a distinguir "sin acción" de "no me dio ninguna".

Alternativas descartadas: **quedarse en dos columnas** y meter la acción dentro del texto —es lo que insinúa el README §3.2, y deja a T-05 sin lo que su ticket pide—; **una columna JSONB** con la respuesta estructurada, flexible ante lo que devuelva el modelo pero sin forma fija, de modo que T-05 y T-06 leerían a ciegas.

### 3. Una recomendación por lectura, garantizada

`V5__` añade `UNIQUE (care_record_id)`, que el diagrama del modelo declara (`CARE_RECORD ||--o| AI_RECOMMENDATION`) y la base de datos no impide. Por [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md), la cardinalidad baja al esquema.

El camino feliz comprueba antes de generar. **La carrera la resuelve la restricción**: dos peticiones simultáneas sobre la misma lectura pueden pasar las dos la comprobación, y la que pierda al insertar captura la violación de unicidad, relee y devuelve la recomendación que ganó. El cliente recibe `200` con una recomendación válida, que es lo que pidió.

Alternativa descartada: **devolver `409`** a quien pierde, más honesto sobre lo ocurrido pero peor para un cliente que solo quería la recomendación y a quien la respuesta obliga a un segundo viaje.

### 4. El proveedor entra por un puerto, y el prompt lo construye el adaptador

```kotlin
// application — lo que el caso de uso necesita, sin saber quién responde
interface CareAdvisor {
  fun advise(request: AdviceRequest): Advice
}

data class AdviceRequest(
  val species: SpeciesFacts,        // nombres, los tres rangos y la pauta de riego
  val reading: ReadingFacts,        // las cinco medidas y su fecha
  val deviations: List<Deviation>,  // ya calculadas: qué medida, qué rango, cuánto se sale
  val lastWatering: LastWatering?,  // cantidad y fecha, o null si no consta ninguno
)

data class Advice(
  val riskLevel: RiskLevel,
  val explanation: String,
  val recommendedAction: String,
  val priority: Priority,
)
```

El puerto vive en `application` y no en `domain`: el proveedor de IA es un colaborador del caso de uso, no un concepto del modelo — una planta no sabe que existe una IA. [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) descartó explícitamente formalizar puertos en `domain` para cada integración externa, y esta es exactamente esa situación. El adaptador de OpenAI vive en `infrastructure`.

**El reparto de responsabilidades es el punto:** `application` reúne los hechos —consulta la especie, calcula las desviaciones, resuelve el último riego— y el adaptador los convierte en texto para el modelo. Así el prompt, que es fraseo específico del proveedor, no contamina el caso de uso; y el doble de test recibe un `AdviceRequest` con datos, no una cadena, de modo que un test puede afirmar *qué hechos* se mandaron sin depender de cómo se redactan.

Esto materializa además la nota de [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md): **la IA no inventa los rangos**. Las desviaciones se calculan en Kotlin contra `species.min_*`/`max_*` y entran ya resueltas.

**El último riego** es la lectura más reciente de esa planta con `water_amount_ml > 0` —la distinción que T-03 dejó fijada— **cuya fecha no sea posterior a la de la lectura analizada**. Ese matiz importa desde que el cliente puede aportar fechas: sin él, un envío en lote con lecturas antiguas haría que "el último riego" fuese posterior a la lectura que se está interpretando. Si no consta ninguno, se traslada como tal; no se inventa.

Alternativa descartada: **el puerto en `domain`**, coherente con `domain/repos` pero metiendo en el modelo un concepto que no es suyo; **construir el prompt en `application`**, que deja el caso de uso lleno de fraseo y ata los tests a una cadena.

### 5. Un fallo del proveedor es `502`, y el adaptador tiene que envolverlo

El adaptador captura **todo** lo que salga mal al hablar con el proveedor —red, timeout, respuesta inesperada, JSON que no encaja— y lo envuelve en una excepción propia que el manejador traduce a `502 Bad Gateway`, con el cuerpo de error uniforme.

**Envolverlo no es cosmético, es obligatorio, y el motivo es nuevo de hoy.** `RiskLevel("desconocido")` lanza `IllegalArgumentException` por el `invoke()` que exige ADR-007, y desde [ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md) el manejador global traduce esa excepción a `400`. Si el adaptador dejara propagar el fallo de parseo, **una respuesta rara del modelo se le reprocharía al cliente como si su petición fuera inválida**. El adaptador es la frontera: dentro de ella, un fallo de interpretación es del proveedor.

`502` y no otros: `503` diría que somos nosotros los que no podemos atender, que es falso; `424` tiene semántica de WebDAV y se entiende peor. `502` es lo que significa exactamente: el sistema aguas arriba no dio una respuesta utilizable.

Nada se persiste cuando el proveedor falla, así que la lectura queda como estaba y se puede volver a pedir más tarde.

### 6. Cliente HTTP sin dependencias nuevas

Se usa el `RestClient` de Spring, que ya viene con `spring-boot-starter-web`, con el `ObjectMapper` que el proyecto ya tiene para leer la respuesta. Al modelo se le pide salida en JSON para que el parseo no dependa de adivinar formato en prosa.

Modelo, URL base, tiempo de espera y clave se configuran con el patrón `${VAR:default}` que ya usan datasource, paginación y el margen de fechas. Sin reintentos: un timeout y un `502`, que es lo que el proposal declara como alcance.

Alternativas descartadas: **`spring-ai`**, que resolvería el cliente y el parseo estructurado a cambio de una dependencia grande y en movimiento para un solo caso de uso; **el SDK oficial de OpenAI**, otra dependencia para lo que son dos llamadas HTTP; **WebClient**, que arrastraría `spring-boot-starter-webflux` entero.

### 7. La sustitución en test es un doble del puerto, sin librería de mocking

El proyecto no tiene `mockk`, `WireMock` ni `MockWebServer`, y no los gana aquí. Un `@TestConfiguration` con `@Primary` aporta una implementación de `CareAdvisor` que devuelve lo que el test necesite, exactamente como `MutableClockConfiguration` hace con el reloj.

Es lo más barato y lo que da a T-07 su punto de sustitución: el E2E corre sin red y sin depender de la disponibilidad del proveedor. El doble también permite provocar el fallo sin simular una caída: basta con que lance.

Alternativa descartada: **un servidor HTTP falso** (WireMock, MockWebServer), que ejercitaría además el cliente HTTP y el parseo, a cambio de una dependencia de test nueva y de tests más lentos y frágiles.

### 8. El prompt se documenta en `docs/prompts-ia.md`

Fichero nuevo. El `prompts.md` de la raíz es el registro de los prompts con los que se ha ido construyendo el proyecto —otra cosa, y por eso la referencia del ticket a "prompts.md, pendiente de crear" se corrige—. Va en `docs/` y no en el `design.md` porque el design se archiva con el change y el prompt hay que poder iterarlo después.

### 9. La migración `V5__`

`V5__ai_recommendation_constraints.sql`:

* `recommended_action TEXT NOT NULL` y `priority TEXT NOT NULL`.
* `CHECK` sobre `risk_level` y sobre `priority` con sus conjuntos de valores, por ADR-002 y ADR-007.
* `UNIQUE (care_record_id)`.

Las columnas se añaden **sin `DEFAULT`**: la tabla está vacía en todos los entornos, porque hasta este change nada la escribía. Si en algún entorno tuviera filas, la migración fallaría al arrancar — y eso es preferible a inventar una acción recomendada y una prioridad para filas de las que no sabemos nada.

`V6__` queda libre para el siguiente change.

## Risks / Trade-offs

* **El adaptador es el único sitio que impide que un fallo del proveedor se convierta en `400`** → Si alguien deja escapar una excepción de parseo, ADR-011 la traducirá a `400` y el error apuntará al cliente. Lo cubre un test que provoca un nivel de riesgo desconocido y afirma `502`.
* **Los cuatro campos son contrato antes de tener frontend que los pinte** → T-05 los consumirá. Si el modelo resulta poco fiable dando prioridad, sobrará una columna; ampliar es compatible, quitar no.
* **`Priority` puede acabar siendo una función del riesgo** → Si el modelo devuelve siempre `immediate` para `high`, la columna no aporta y la decisión 2 se habrá equivocado. Se sabrá al usarlo; es reversible por documentación, no por esquema.
* **El `UNIQUE` convierte "regenerar" en un cambio de esquema** → Es deliberado: hoy no hay historia que lo pida. El día que la haya, quitar la restricción y decidir qué devuelve el `GET` es un change propio.
* **La carrera se resuelve capturando una violación de integridad** → Depende de que la excepción llegue distinguible y de que la transacción se pueda continuar; en PostgreSQL una violación aborta la transacción, así que la relectura tiene que ocurrir **fuera** de ella. Es la parte más delicada del change y lleva su test.
* **Sin reintentos, un hipo del proveedor es un `502` para el usuario** → Aceptado por alcance: el cliente puede volver a pedirlo, y no se ha persistido nada a medias.
* **El prompt no está probado contra el modelo real en CI** → Por diseño: T-07 corre con el doble. La calidad de lo que responde OpenAI se comprueba a mano al levantar el entorno, no en la suite.
* **`OPENAI_API_KEY` vacía en local** → Con el doble, la suite no la necesita; con el entorno real levantado y sin clave, el proveedor falla y se ve un `502`, que es el comportamiento correcto y no un arranque roto.
* **El presupuesto de ~30 h del MVP ya va justo** → Este change es el que da sentido al producto, así que se prioriza sobre pulir lo anterior.

## Migration Plan

Una migración nueva, `V5__ai_recommendation_constraints.sql`, con las dos columnas, los dos `CHECK` y el `UNIQUE`. No hay datos que migrar: la tabla está vacía porque hasta ahora nada escribía en ella. Ninguna migración existente se toca ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)).

El despliegue necesita `OPENAI_API_KEY` para que la generación funcione; sin ella el resto del API sigue operando y solo la generación responde `502`.
