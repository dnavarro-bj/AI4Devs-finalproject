# Design: api-lecturas-cultivo

## Context

Motivación en [`proposal.md`](proposal.md) — Why. Estado y restricciones que condicionan el enfoque:

* T-02 dejó el backend con capa web, manejo de errores uniforme, paginación obligatoria e identificadores tipados. Este change no inventa ninguno de esos mecanismos: los aplica. El contrato transversal está en la capability `plant-inventory` (`openspec/specs/plant-inventory/spec.md`).
* La tabla `care_record` y la entidad `CareRecord` existen desde T-01. Sus cinco columnas de medida son **todas nullable**; la única obligatoria es `recorded_at TIMESTAMPTZ NOT NULL`, y sigue siendo **la única columna de fecha del esquema sin `DEFAULT now()`**: `fechas-y-auditoria` puso ese `DEFAULT` en todas las de auditoría, pero `recorded_at` no lo es. `care_record` no tiene hoy **ninguna** restricción `CHECK` ni ningún índice más allá de su clave primaria.
* Desde `fechas-y-auditoria` ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)): toda fecha del dominio es un `Instant`, `CareRecord` hereda de `AbstractEntity` —así que además de `recordedAt` tiene `createdAt` y `updatedAt`, que sella `AuditingListener`—, y **el bean `Clock` ya existe** en `infrastructure/TimeConfiguration`. Este change lo consume; no lo crea.
* `AIRecommendation` existe y apunta a `CareRecord` con un `@ManyToOne`. **No hay asociación inversa** desde `CareRecord`, y `ai_recommendation.care_record_id` no tiene `UNIQUE`.
* No existe ningún bean de configuración en el backend: `@Configuration`/`@Bean` no aparecen en ninguna clase.
* Migraciones aplicadas: `V1__schema.sql`, `V2__seed.sql` y `V3__audit_timestamps.sql`. La siguiente libre es `V4__`.
* [ADR-006 enmendado](../../../docs/adr/ADR-006-aislamiento-del-dominio.md), [ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md) y [ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md) fijan capas, identificadores y paginación. [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) exige que las invariantes bajen también a la base de datos.

## Goals / Non-Goals

Alcance funcional y exclusiones de producto en [`proposal.md`](proposal.md). A nivel de diseño:

**Goals:**

* Que el listado de lecturas cueste un número de consultas **constante por página**, no proporcional al número de lecturas, incluida la recomendación asociada.
* Dejar el contrato del historial cerrado para que T-06 lo consuma sin cambios de backend, y el concepto de "último riego" bien definido para que T-04 lo derive sin ambigüedad.
* Que la fecha de una lectura sea determinista en los tests, no `now()` real.

**Non-Goals:**

* Consultas agregadas o por rango de fechas sobre el historial: no las pide ninguna historia en alcance.
* Optimizar más allá de evitar el N+1 del listado.

## Decisions

### 1. Se reutiliza el andamiaje de T-02 sin re-decidir nada

Capas, puertos, DTOs y errores siguen [ADR-006 enmendado](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) tal cual: puerto `CareRecordRepository` en `domain/repos` (interfaz Kotlin pura, con `findOneById`, sin `findAll()` sin paginar), una sola interfaz `@Repository JpaCareRecordRepository : CareRecordRepository, JpaRepository<CareRecord, CareRecordId>` en `infrastructure/persistence` sin clase adaptadora, `CareRecordService` en `application` devolviendo DTOs montados **dentro** de la transacción (`open-in-view` es `false`), cuerpo de petición en `web/controllers` y `@ExceptionHandler` dentro de `web/errors/ApiExceptionHandler.kt`. `PageResponse.of(...)` y `ErrorResponse` se reutilizan; no se crea un segundo `@RestControllerAdvice`.

El filtro por planta no necesita `Specification`: sale del nombre del método, `findAllByPlantId(plantId: PlantId, pageable: Pageable): Page<CareRecord>`. `PlantSpecs` existe porque el inventario compone filtros opcionales; aquí solo hay uno y es obligatorio.

### 2. La fecha la aporta el cliente; el `Clock` es el valor por defecto

El cuerpo de la petición admite `recordedAt` como campo **opcional**. Si llega, se guarda tal cual; si no, lo sella el servicio con un `Clock` inyectable:

```kotlin
// application — el bean Clock ya lo aporta infrastructure/TimeConfiguration
val recordedAt = (request.recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
```

El motivo es [F.5](../../../docs/user-stories/F.5-app-movil-sincronizacion-sensores-bluetooth.md): la app móvil guardará lecturas sin conexión y las enviará más tarde. Sin campo de fecha, todas llegarían fechadas en el instante de la sincronización, y el historial —que es el producto de 0.5— quedaría inservible: veinte lecturas de una semana amontonadas en el mismo minuto. Abrir el campo ahora cuesta una línea; añadirlo después, cuando ya haya clientes escribiendo, es un cambio de contrato.

El criterio 3 de [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md) ("se registra la fecha y hora automáticamente") **sigue cumpliéndose**: es exactamente lo que ocurre cuando el cliente no manda nada, que es el caso del formulario web de T-05. Lo que se abandona es el texto literal del alcance de T-03 ("con `recordedAt` asignado automáticamente por el servidor"), escrito cuando el único cliente previsto era una web siempre conectada.

Que el `Clock` sea el inyectado y no una llamada suelta a `Instant.now()` es lo que hace testables los dos escenarios de fecha futura: el margen se mide contra el reloj del servicio, así que un `Clock` fijo permite construir una fecha "dentro del margen" y otra "fuera" de forma determinista, sin depender de cuánto tarde el test en ejecutarse.

Alternativas descartadas:

* **Sello obligatorio del servidor, sin campo en el cuerpo** (lo que decía este design en su primera versión y lo que pide el texto de T-03): más simple y no admite fechas incoherentes, pero bloquea F.5 y obliga a un cambio de contrato para desbloquearla.
* **Dejar que `AuditingListener` selle también `recordedAt`**, aprovechando que ya sella `createdAt` y `updatedAt` en todas las entidades: sería una pieza menos, pero mezcla dos cosas distintas. Las marcas de auditoría son metadatos de fila que nadie puede aportar ni consultar; `recordedAt` es dato de negocio, entra por el API y se valida. El listener no puede saber si el cliente mandó fecha o no, así que el valor por defecto tiene que decidirlo el servicio.
* **`DEFAULT now()` en la columna**: el valor por defecto solo debe aplicarse cuando el cliente no aporta fecha, y eso es una decisión de la aplicación, no de la columna — la base de datos no distingue "no me lo mandaron" de "me mandaron esto".
* **Aceptar cualquier fecha sin comprobarla**: el servidor no juzgaría el dato, pero un reloj mal puesto en el móvil colocaría una lectura al principio del historial durante meses, y T-04 la tomaría como la más reciente al construir el prompt.

### 2b. Una fecha futura se rechaza, con margen de tolerancia configurable

Una lectura no puede haberse tomado en un momento que aún no ha llegado, pero exigir `recordedAt <= now` al milisegundo rechazaría envíos legítimos de un móvil con el reloj unos segundos adelantado. El límite es `now + margen`, con el margen configurable por el mismo patrón `${VAR:default}` que ya usan el datasource y la paginación:

```yaml
cactify:
  care-records:
    max-future-skew: ${CARE_RECORD_MAX_FUTURE_SKEW:PT5M}
```

Cinco minutos por defecto: absorbe la desincronización de un reloj de consumo sin admitir nada que parezca una fecha equivocada de verdad.

La comprobación se implementa como un **`ConstraintValidator` propio** anotando el campo del cuerpo de la petición, no como una comprobación dentro del servicio. Necesita el `Clock` y el margen, y Spring inyecta dependencias en los validadores de Bean Validation, así que puede tenerlos. Lo que se gana es que el fallo llega por el mismo camino que el resto de la validación sintáctica —`MethodArgumentNotValidException` → `400` con el cuerpo `{status, error, message, path}` y el nombre del campo— sin añadir ninguna excepción ni ningún `@ExceptionHandler` nuevo.

Alternativa descartada: **comprobarlo en `CareRecordService` y lanzar una excepción propia**, que obligaría a un `@ExceptionHandler` más y a un mensaje de error con una forma distinta del resto de errores de campo, para exactamente el mismo resultado HTTP.

### 2c. La fecha se recorta a microsegundos al sellarla

`recordedAt` se guarda recortado a microsegundos, tanto si lo aporta el cliente como si lo pone el reloj:

```kotlin
(request.recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
```

`TIMESTAMPTZ` guarda microsegundos, y tanto `Clock.systemUTC()` como un cliente pueden dar nanosegundos. Sin el recorte, el valor que viaja en la respuesta del `201` no es el que queda persistido —PostgreSQL lo redondea—, y una consulta posterior devuelve una cadena distinta para el mismo instante: `…479235925Z` frente a `…479236Z`. No es teórico: es el defecto que apareció al verificar `fechas-y-auditoria` en el entorno local, y por eso [ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md) fija el recorte como parte de la convención.

Aquí importa más que en las marcas de auditoría, porque el listado ordena por `recordedAt`: dos lecturas que el cliente cree distintas por nanosegundos serían el mismo valor en base de datos, y el desempate de la decisión 3 es justo lo que resuelve ese caso.

No hace falta escenario propio en la spec de `care-records`: el requisito ya está en `data-model` —"Representación temporal de las fechas", archivado con `fechas-y-auditoria`— y el proyecto no redeclara lo ya construido.

### 3. Orden descendente con desempate por identificador

```kotlin
@GetMapping
fun list(
  @PathVariable id: String,
  @SortDefault(sort = ["recordedAt", "id.id"], direction = Sort.Direction.DESC) pageable: Pageable,
): PageResponse<CareRecordResponse>
```

Tres cosas que no son obvias:

* **`@SortDefault`, nunca `@PageableDefault`** ([ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md)): este último fija también el tamaño de página en 10 y taparía el `default-page-size` configurado, que es justo lo que la spec exige aplicar cuando la petición no trae `size`.
* **El desempate es obligatorio, no cosmético.** `recorded_at` puede repetirse, y ahora con más motivo: un envío en lote desde el móvil puede traer varias lecturas con el mismo sello. Sin segundo criterio, dos páginas consecutivas pueden repetir u omitir filas.
* **El desempate se escribe `id.id`, no `id`.** El identificador es un `@Embeddable` ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)), así que `id` es el embebido y el valor ordenable es su atributo interno. El TSID está ordenado por tiempo ([ADR-003](../../../docs/adr/ADR-003-tsid-como-clave-primaria.md)), así que desempata por orden de **registro** — que desde la decisión 2 ya **no** tiene por qué coincidir con el orden en que se tomaron las lecturas. Da igual: para lo que sirve es para que el orden sea total y estable, no para significar nada.

### 4. La recomendación se resuelve **por página**, y sin asociación inversa

El listado devuelve cada lectura con su recomendación o con `null`, y la resolución es una consulta adicional por página:

```kotlin
// application, dentro de la transacción
val page = careRecordRepository.findAllByPlantId(plantId, pageable)
val byRecord = aiRecommendationRepository
  .findAllByCareRecordIdIn(page.content.map { it.id })
  .associateBy { it.careRecord.id }
PageResponse.of(page) { it.toResponse(byRecord[it.id]) }
```

**No se mapea un `@OneToOne(mappedBy = "careRecord")` en `CareRecord`**, que es la forma que parece natural. El lado inverso de un `@OneToOne` **no puede ser realmente `LAZY` sin bytecode enhancement**: Hibernate tiene que consultar para saber si la asociación es nula, así que `fetch = LAZY` se ignora y cada lectura de la página dispara su propio `SELECT`. Es exactamente el N+1 que este change quiere evitar, y llegaría disfrazado de anotación correcta. Tampoco sirve el `fetch join`: con paginación, una colección en el fetch fuerza paginación en memoria, y aquí ni siquiera hay `UNIQUE` que garantice cardinalidad 1.

La consulta adicional es explícita, cuesta **una** por página independientemente del tamaño, y no toca el mapeo de una entidad que pertenece a una capability ya archivada. Requiere un puerto `AIRecommendationRepository` mínimo (un solo método de lectura) que T-04 ampliará.

Alternativas descartadas: **`@OneToOne(mappedBy)` con bytecode enhancement de Hibernate** (resuelve la pereza, pero es configuración de build que afecta a todo el proyecto por un caso); **dejar la recomendación fuera del listado y que T-06 la pida por lectura** (con el `GET` generador que describe T-04, pintar una página del historial costaría hasta 25 llamadas a OpenAI); **un endpoint de historial aparte** (duplica el listado que este change ya construye).

Que hoy el campo llegue siempre `null` —T-04 aún no genera nada— no lo hace inverificable: el escenario "lectura con recomendación ya generada" persiste una `AIRecommendation` directamente, que es lo que la entidad ya permite.

### 5. Validación en dos niveles, y la regla de "al menos un valor"

* **Sintáctica**, en el cuerpo de la petición con Bean Validation: `@Min`/`@Max` sobre humedad (`0-100`), horas de luz (`0-24`), temperatura (`-50-80`) y riego (`>= 0`), y `@DecimalMin`/`@DecimalMax` sobre la acidez (`0-14`, `BigDecimal`).
* **De coherencia**: una lectura con los cinco valores vacíos no es una lectura. Se valida sobre el propio cuerpo con un `@AssertTrue` a nivel de clase, de modo que el fallo llegue por el mismo camino que el resto y salga como `400` con el cuerpo uniforme.
* **En base de datos**, `CHECK` por ADR-002. Los `CHECK` se escriben tolerando nulos (`humidity IS NULL OR humidity BETWEEN 0 AND 100`), porque las columnas siguen siendo opcionales: la restricción acota el valor cuando lo hay, no obliga a haberlo.

Los rangos no son arbitrarios: la humedad relativa y las horas de un día tienen máximo físico; la escala de pH es `0-14`; el riego es una cantidad. La temperatura `-50-80 °C` es el único rango con margen de criterio — acota el error de tecleo sin descartar ningún clima real.

### 6. `NULL` y `0` en la cantidad de riego significan cosas distintas

`NULL` es "no se anotó"; `0` es "se comprobó y no se regó". La distinción no cuesta nada aquí —la columna ya es nullable— y es la que permite a T-04 definir el último riego como *la lectura más reciente con `water_amount_ml > 0`* en lugar de `IS NOT NULL`, que contaría un cero como riego. Se fija ahora, con su escenario, porque descubrirlo en T-04 significaría reinterpretar datos ya registrados.

### 7. Planta inexistente en la ruta es `404`

Se reutiliza `PlantNotFoundException`, ya definida en `application/ApplicationExceptions.kt` y ya mapeada a `404`. Es la regla que T-02 dejó fijada y que la spec de `plant-inventory` ya recoge: lo que falta en la **ruta** es `404`; lo inválido en el **cuerpo o los parámetros** es `400`.

Aplica igual al listado: `GET /plants/{inexistente}/care-records` responde `404`, no `200` con página vacía. Una página vacía diría "esta planta no tiene lecturas", que es falso — la planta no existe. Alternativa descartada: `200` con contenido vacío, coherente con lo que hace el inventario al filtrar por un tag inexistente, pero allí el filtro es un **parámetro** y aquí la planta es el **recurso** del que cuelga la colección.

Un identificador mal formado sigue cayendo en `400` sin código nuevo: `PlantId.from(...)` lanza `NumberFormatException` y `ApiExceptionHandler` ya la traduce ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)).

### 8. La acidez viaja como número decimal en JSON

ADR-008 obliga a cadena **solo para los identificadores**, y por una razón concreta: un TSID supera `2^53`. `soil_ph` es `NUMERIC(3,1)` —un valor entre `0.0` y `14.0` con un decimal—, que cabe sin pérdida en un número JSON. Mandarlo como cadena sería aplicar la regla sin su motivo y obligaría al frontend a parsear. Se declara `BigDecimal` en el DTO.

### 9. La migración `V4__` lleva los `CHECK` y el índice del listado

`V4__care_record_constraints.sql` añade las cinco restricciones de rango y el índice `(plant_id, recorded_at DESC)`. Ninguna migración existente se toca ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)).

El índice entra ahora y no como deuda porque es exactamente la consulta que el API hace en cada página: filtrar por planta y ordenar por fecha descendente. Hoy ninguna clave ajena del esquema tiene índice, así que sin él el listado es un recorrido completo de la tabla más una ordenación. Es una línea de SQL en una migración que de todos modos hay que escribir.

**`V5__` queda reservada para T-04**, que necesitará el `CHECK` de `risk_level` y, si así lo decide, el `UNIQUE (care_record_id)`. Se anota aquí porque los dos changes van en ramas distintas y el número de versión es lo primero que colisiona.

## Risks / Trade-offs

* **El campo de recomendación del listado se convierte en contrato antes de que exista lo que lo llena** → Si T-04 decide persistir más campos (acción recomendada, prioridad), habrá que ampliar el objeto embebido. Ampliar es compatible; cambiar su forma no. Se mitiga exponiendo hoy solo lo que la entidad ya tiene —nivel de riesgo y texto— sin inventar campos que el esquema no persiste.
* **El nivel de riesgo viaja hoy como texto libre** → `ai_recommendation.risk_level` es `TEXT` sin `CHECK`, y el enum `RiskLevel` es cosa de T-04 ([ADR-007](../../../docs/adr/ADR-007-enums-de-dominio.md)). Este change lo pasa tal cual, y T-04 lo estrechará. Consumirlo desde el frontend antes de T-04 sería prematuro.
* **Un `CHECK` violado aborta la transacción de PostgreSQL** → En los tests que lo provocan, el `assertFailsWith<DataIntegrityViolationException>` tiene que ser la **última** sentencia: cualquier consulta posterior dentro de la misma transacción falla con un error distinto y confuso. Ya nos pasó en T-01.
* **Los `CHECK` se aplican sobre datos existentes al migrar** → `care_record` está vacía en todos los entornos (ninguna semilla la puebla y el API que la llena es este), así que la migración no puede fallar por datos previos. Si algún entorno tuviera filas fuera de rango, `V4__` fallaría al arrancar; se acepta porque es preferible a admitirlas.
* **El desempate por `id.id` acopla el orden a la forma del identificador embebido** → Si algún día el identificador cambia de forma, la cadena de ordenación se rompe en tiempo de ejecución, no de compilación. Lo cubre el escenario de lecturas con la misma fecha.
* **La consulta extra de recomendaciones se ejecuta aunque no haya ninguna** → Con la lista de ids vacía se puede evitar; con lista no vacía y cero resultados, es una consulta barata por índice. Se acepta a cambio de que el coste no dependa del tamaño de la página.
* **El orden del historial deja de ser el orden de llegada** → Con la fecha en manos del cliente, "la lectura más reciente" y "la última registrada" dejan de ser lo mismo: un envío en lote con fechas antiguas se intercala en medio del historial. Es el comportamiento buscado, pero tiene consecuencia para T-04, que definirá el último riego por `recordedAt`: un lote retrasado puede cambiar cuál es después de haberse generado una recomendación. Se anota aquí para que T-04 lo decida a la vista, no por descuido.
* **Nada impide dos lecturas con la misma fecha para la misma planta** → Un cliente que reintente un envío sin control de duplicados creará dos lecturas idénticas, y este change no tiene forma de distinguirlas de dos lecturas reales del mismo instante. La idempotencia del envío en lote es problema de F.5, que tendrá que aportar una clave propia; aquí se acepta.
* **El margen de tolerancia es un número elegido a ojo** → Cinco minutos absorbe un reloj de consumo mal sincronizado, pero no hay dato que lo respalde. Es configurable por variable de entorno precisamente para ajustarlo cuando F.5 aporte medidas reales, sin tocar código.
* **`Clock` inyectable significa que la fecha por defecto la decide el proceso, no la base de datos** → Con varias instancias y relojes desincronizados, el orden podría no ser el real. El MVP es de instancia única, y el TSID del desempate se genera en el mismo proceso, así que el problema no se manifiesta.

## Migration Plan

Una migración nueva, `V4__care_record_constraints.sql`, con los `CHECK` de rango y el índice del listado. No hay datos que migrar ni columnas que cambiar de tipo, así que no hay paso de despliegue especial: Flyway la aplica al arrancar. La vuelta atrás es una migración que elimine las restricciones; no se escribe por adelantado porque no hay entorno con datos que proteger.
