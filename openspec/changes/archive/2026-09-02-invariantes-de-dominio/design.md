# Design: invariantes-de-dominio

## Context

Motivación en [`proposal.md`](proposal.md) — Why. Estado y restricciones que condicionan el enfoque:

* **Ninguna entidad comprueba nada hoy.** No hay un solo `init` ni un solo `require` en `com.cactify.domain`.
* Las reglas viven en `CHECK` de base de datos (`soil_mix` desde `V1__`, `care_record` desde `V4__`) y en anotaciones de Bean Validation sobre los cuerpos de petición, que están en `web`.
* **`Species` no valida sus rangos en ninguna capa**: `V1__` declara las seis columnas sin `CHECK`, y no hay endpoint de especies que pudiera validarlas.
* Todos los campos de las siete entidades son `var` públicos. Sin embargo, **`src/main` no asigna ni uno solo después de construir la entidad**: hoy las entidades se crean y no se modifican. El único punto de todo el proyecto que lo hace es `AuditTimestampsTest`, y a propósito, para disparar `@PreUpdate`.
* `AbstractEntity` ya usa el patrón `var … internal set` para `createdAt`/`updatedAt` ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)), y `Plant.updateTags(...)` ya es un método de dominio que sustituye a un `var` público. El proyecto tiene ya los dos precedentes.
* `ApiExceptionHandler` mapea `400`, `404` y `409`. **No hay manejador para `IllegalArgumentException`**, que es lo que lanza `require`.
* `kotlin("plugin.jpa")` genera el constructor sin argumentos que Hibernate necesita y **no ejecuta los inicializadores**.
* Migraciones aplicadas: `V1__`…`V4__`. La siguiente libre es `V5__`, anotada en el design archivado de `api-lecturas-cultivo` como reserva para T-04, y este change **no la consume**.

## Goals / Non-Goals

Alcance y exclusiones en [`proposal.md`](proposal.md). A nivel de diseño:

**Goals:**

* Que la regla se lea en la clase del concepto al que pertenece, y no haya que ir a un `.sql` o a un DTO de `web` para saber qué es una mezcla de tierra válida.
* Que una entidad inválida no llegue a existir, ni siquiera en memoria.
* Que el comportamiento observable del API no cambie: los 134 tests son el criterio.

**Non-Goals:**

* Rendimiento: unas comprobaciones en el constructor no lo mueven.
* Uniformar el mensaje de error entre las tres capas: cada una habla en su nivel, y eso es correcto.

## Decisions

### 1. `require` en `init`, campos con `private set`, cambio por métodos de dominio

```kotlin
@Entity
@Table(name = "soil_mix")
class SoilMix(
  @EmbeddedId override val id: SoilMixId = SoilMixId.create(),
  name: String,
  organicPercentage: Int,
  mineralPercentage: Int,
  phMin: BigDecimal,
  phMax: BigDecimal,
  description: String? = null,
) : AbstractEntity<SoilMixId>() {

  var name: String = name
    private set

  var organicPercentage: Int = organicPercentage
    private set

  var mineralPercentage: Int = mineralPercentage
    private set

  …

  init {
    require(name.isNotBlank()) { "El nombre de la mezcla es obligatorio" }
    require(organicPercentage + mineralPercentage == 100) {
      "Los porcentajes de la mezcla deben sumar 100, y suman ${organicPercentage + mineralPercentage}"
    }
    require(phMin <= phMax) { "El pH mínimo ($phMin) no puede superar al máximo ($phMax)" }
  }
}
```

Tres cosas que esto exige y conviene tener claras:

* **Los campos dejan de declararse en el constructor primario.** Kotlin no admite un modificador de visibilidad en el `set` de una propiedad declarada como parámetro, así que los parámetros pasan a serlo solo de construcción y la propiedad se declara en el cuerpo. **Las llamadas no cambian**: los nombres de los parámetros se conservan y todo el código usa argumentos con nombre. Las anotaciones de columna (`@Column`, `@ManyToOne`, `@JoinColumn`) se mudan con la propiedad.
* **El `init` corre después de inicializar las propiedades del cuerpo**, así que puede leerlas; se usan los parámetros por claridad, que es lo mismo.
* **No se inventan métodos de modificación que nadie llama.** Con `private set`, una entidad sin método de cambio es de hecho inmutable tras construirse, y eso es correcto: hoy nada en `src/main` modifica una entidad. Se añade únicamente `Location.rename(name)`, que es lo que necesita `AuditTimestampsTest` para seguir comprobando que `@PreUpdate` avanza. Cuando un change futuro necesite modificar algo, añadirá su método con su `require`, que es el punto: el cambio pasa por la entidad.

**Cuando una invariante necesita algo que la entidad no tiene, se expresa en una factoría del `companion object`, no en el `init`.** El único caso hoy es la fecha de una lectura, que para saber si es futura necesita un reloj:

```kotlin
@Entity
@Table(name = "care_record")
class CareRecord private constructor(
  @EmbeddedId override val id: CareRecordId = CareRecordId.create(),
  plant: Plant,
  …,
  recordedAt: Instant,
) : AbstractEntity<CareRecordId>() {

  init {
    require(humidity == null || humidity in 0..100) { … }
    require(listOfNotNull(humidity, temperature, lightHours, waterAmountMl, soilPh).isNotEmpty()) {
      "La lectura debe llevar al menos un valor"
    }
  }

  companion object {
    /** Única forma de registrar una lectura: la fecha la aporta quien la toma o, si falta, el reloj. */
    fun record(
      plant: Plant,
      …,
      recordedAt: Instant?,
      clock: Clock,
      maxFutureSkew: Duration,
    ): CareRecord {
      val stamped = (recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) {
        "La fecha de la lectura no puede estar en el futuro"
      }
      return CareRecord(plant = plant, …, recordedAt = stamped)
    }
  }
}
```

El `Clock` y el margen entran **como parámetros**, no como estado de la entidad: son de quien registra, no de la lectura. `Clock` es del JDK, así que [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) se respeta sin esfuerzo.

**El constructor primario pasa a ser `private`.** Si siguiera siendo público, la factoría sería una convención y no una garantía: cualquiera podría construir una lectura con fecha futura saltándosela, que es justo lo que este change viene a cerrar. Hibernate no se ve afectado —usa el constructor sin argumentos que genera el plugin, y accede por reflexión—, pero **los tests que hoy construyen `CareRecord` directamente pasan a usar `record(...)`**, y eso es correcto: si el modelo tiene una sola puerta, los tests entran por ella.

Es la única entidad con factoría, porque es la única con una invariante que necesita un colaborador. Las otras seis se construyen con su constructor y su `init`, sin ceremonia añadida.

De paso, esto se lleva al dominio dos cosas que hoy están en `CareRecordService`: el valor por defecto de la fecha y su recorte a microsegundos. Cómo obtiene una lectura su fecha deja de estar repartido entre `web`, `application` y el modelo, y pasa a leerse entero en un sitio.

Alternativas descartadas para la fecha: **pasar el instante máximo admisible ya calculado** al constructor, que evita la factoría a cambio de meter en la firma un parámetro que no es un dato de la lectura sino una decisión de quien la crea; **dejar el constructor público junto a la factoría**, más cómodo para los tests y sin garantía ninguna.

Alternativas descartadas para la forma general: **anotaciones de Bean Validation sobre la entidad** (`@Min`, `@AssertTrue`), que es lo que el proyecto usa en `web` — solo se comprueban cuando alguien invoca un validador, así que la entidad seguiría pudiendo existir en estado inválido, que es exactamente el problema; **objetos de valor** (`Percentage`, `PhRange`) que hagan imposible el estado inválido por construcción, que es la forma más fuerte y probablemente el destino a largo plazo, pero multiplica clases y mapeo JPA por un beneficio que hoy da el `require`; **una función `validate()`** que alguien llama antes de guardar, que traslada la responsabilidad al que la usa y se olvida en la primera prisa.

### 2. Quién manda cuando las tres capas dicen algo distinto

La misma regla queda escrita en tres sitios, y eso pide un reparto explícito:

| Capa | Qué hace | Por qué está |
|---|---|---|
| **`domain`** | Define la regla | Es la **fuente de la verdad**. Si las tres divergen, la del dominio es la correcta y las otras dos son el error. |
| **`web`** | La anticipa, **y solo si es de tipo o de rango** | Da el `400` con el **nombre del campo**, que es la mejor respuesta que el cliente puede recibir. Es una comodidad del borde, no la definición. |
| **base de datos** | La respalda | La última red de [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md), para lo que entra por SQL crudo sin pasar por el constructor — los tests de esquema lo hacen a propósito. |

**`web` solo admite comprobaciones de tipo y de rango.** Una anotación que mire un solo campo contra un límite constante —`@NotBlank`, `@Min`, `@Max`, `@DecimalMin`— vale; cualquier cosa que necesite colaboradores, configuración o mirar varios campos a la vez, no. La razón es que ese tipo de regla **es** lógica de negocio, y en `web` queda escondida detrás de una anotación, lejos del concepto al que pertenece.

De las dieciséis validaciones que hay hoy en `web`, catorce cumplen la regla. Las dos que no, se mueven al dominio en este change:

| Regla | Por qué no es de tipo ni de rango | A dónde va |
|---|---|---|
| `@NotFarInFuture` sobre `recordedAt` | Su validador recibe un `Clock` y un `Duration` por inyección: el límite lo calcula al vuelo | `CareRecord.record(...)`, la factoría del companion |
| `@AssertTrue atLeastOneValue` | Regla **cruzada**: mira los cinco campos de medida a la vez | `CareRecord.init` |

Con esto desaparece el paquete `web/validation` entero, y con él el roce que dejó T-03: el mensaje `"atLeastOneValue: la lectura debe llevar al menos un valor"`, que nombraba un campo sintético que el cliente nunca envió. Al venir del `require`, el mensaje pasa a ser solo la frase.

El coste de esto es real y hay que decirlo: **la misma regla escrita tres veces puede divergir**, y si diverge, el usuario ve el mensaje de `web`, que es el primero que salta. La mitigación no es documental sino de pruebas: cada invariante lleva su test de dominio, y las de `web` y base de datos ya tienen los suyos. Tres capas con tres tests que afirman el mismo límite fallan a la vez si alguien mueve uno.

### 3. Una invariante violada responde `400`

`require` lanza `IllegalArgumentException`, que hoy no tiene manejador y saldría como `500` con el cuerpo por defecto de Spring, sin campo `message`. Se le añade un `@ExceptionHandler` que la traduce a `400` con el cuerpo uniforme.

El argumento en contra es bueno y conviene dejarlo escrito: con `web` validando primero, una invariante que salte desde una petición HTTP significa que las dos definiciones han divergido — o sea, **un fallo nuestro, no del cliente**, y eso apunta a `500`. Se elige `400` de todos modos por dos razones. La primera, que el dato que llega sigue siendo inválido: la regla del proyecto desde T-02 es que un cuerpo inválido nunca es `5xx`, y quién debía haberlo detectado antes no cambia lo que el cliente mandó. La segunda, que un `500` no le da al cliente nada accionable, mientras que el mensaje del `require` sí dice qué regla se incumplió.

Para que la divergencia no pase inadvertida, el manejador **registra la excepción en el log** al traducirla: si aparece, es que hay que arreglar `web`.

El riesgo asumido: `IllegalArgumentException` es un tipo genérico, y una que venga de un fallo interno de verdad —una librería, un `toLong()` mal puesto— se reportará como `400`. Se acepta porque el dominio es hoy el único sitio del código que la lanza a propósito. Alternativa descartada: **un tipo propio de excepción de dominio**, que permitiría distinguirlas, a cambio de renunciar a `require`, que es precisamente la forma que este change quiere adoptar.

### 4. El catálogo de invariantes

| Entidad | Invariantes | Dónde estaba hasta ahora |
|---|---|---|
| `SoilMix` | nombre no en blanco; `organic + mineral == 100`; cada porcentaje en `0..100`; `phMin <= phMax`; ambos pH en `0..14` | `CHECK` (suma y rango) |
| `Species` | nombre científico y común no en blanco; pauta de riego no en blanco; **`minHumidity <= maxHumidity`**, **`minTemperature <= maxTemperature`**, **`minLightHours <= maxLightHours`** | **en ningún sitio**, y tras este change solo en el dominio (decisión 5) |
| `Location` | nombre no en blanco | `web` |
| `Tag` | nombre no en blanco | `web` |
| `Plant` | nickname no en blanco | `web` |
| `CareRecord` | humedad `0..100`; horas de luz `0..24`; temperatura `-50..80`; riego `>= 0`; acidez `0..14`, **cada una solo si viene informada**; **al menos una medida informada**; **fecha no futura más allá del margen**, en la factoría | `CHECK` y `web`; las dos últimas solo en `web` |
| `AIRecommendation` | nivel de riesgo y texto no en blanco | en ningún sitio |

Dos precisiones sobre `CareRecord`. Las invariantes de rango son **tolerantes a nulos**, igual que sus `CHECK`, porque una lectura parcial es legítima: con un solo campo relleno ya es una lectura. Y la regla **"al menos un valor" sí baja al dominio**, al contrario de lo que decía el comentario de `V4__`: una fila sin ninguna medida no significa nada, y el día que F.4 quiera admitir "el sensor respondió pero no midió", la salida acordada es que la fila **nunca sea muda** —o mide, o dice por qué no pudo—, que es una decisión del modelo. El `CHECK` de base de datos no cambia: sigue siendo tolerante a nulos, y esta invariante queda sin red, como la de `Species`.

### 5. `Species` **no** gana `CHECK` en base de datos, y es una excepción consciente a ADR-002

La invariante nueva de `Species` se queda solo en el dominio. No hay migración en este change.

[ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) pide que las invariantes bajen también a la base de datos, y la decisión 2 mantiene ahí las que ya existen. La excepción se justifica por quién puede escribir hoy una especie: **nadie**. No hay `SpeciesController` ni ninguna vía de entrada; las únicas filas de `species` son las tres de `V2__seed.sql`, escritas por nosotros y correctas. Un `CHECK` protegería un camino que todavía no existe.

Cuando ese camino se abra —habrá API de especies, aunque no está decidido en qué ticket— la invariante del dominio **ya estará puesta**, que es el orden correcto: la regla primero en el modelo, y el respaldo en la base de datos cuando haya algo de lo que respaldarse. Añadirlo entonces es una migración de tres líneas.

Lo que esto cambia respecto a las demás invariantes: la de `Species` es la única del catálogo que **no** tiene red bajo el dominio. Una fila insertada por SQL crudo con el rango invertido entraría. Se acepta, y se registra en ADR-011 para que se lea como decisión y no como olvido.

**`V5__` sigue reservada para T-04**, tal como dejó anotado el design de `api-lecturas-cultivo`.

Alternativa descartada: **añadir el `CHECK` ahora** por coherencia mecánica con ADR-002. Es más uniforme de contar, pero gasta una migración y un número de versión —con el reajuste que eso obliga en T-04— para cubrir un hueco que nadie puede abrir todavía.

### 6. Las invariantes se prueban sin contenedor

Los tests de estas reglas son **unitarios**: construir una entidad con datos inválidos y comprobar que lanza. No necesitan PostgreSQL, ni Spring, ni Testcontainers, porque no hay nada que persistir — el rechazo ocurre antes.

Es el primer test del backend que no arranca un contenedor, y esa es la señal de que la regla ha cambiado de sitio: hasta ahora, comprobar que una mezcla no puede sumar 180 exigía una base de datos. [ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md) no se toca: sigue exigiendo PostgreSQL real para los tests **de integración**, y estos no lo son.

Los `CHECK` de `Species` sí llevan su test de integración, como el resto de restricciones de esquema.

## Risks / Trade-offs

* **`CareRecord` tiene dos formas de construirse y solo una es correcta** → El constructor privado lo impide desde fuera, pero Hibernate sigue instanciando por reflexión sin pasar por la factoría. Es lo correcto para cargar filas antiguas, y significa que la comprobación de fecha futura protege la escritura, no la lectura.
* **`Species` y "al menos un valor" son las invariantes sin red en base de datos** → Por la decisión 5. Mientras no haya API de especies el riesgo es teórico; el día que la haya, conviene revisar si merece su `CHECK`. Queda escrito en ADR-011.
* **La misma regla en tres capas puede divergir** → Es el precio de mantener las tres (decisión 2). Se mitiga con tests en cada nivel y con el log del manejador cuando el dominio rechaza algo que `web` dejó pasar.
* **`IllegalArgumentException` es un tipo genérico** → Un fallo interno que la lance saldrá como `400`. Se acepta por ahora (decisión 3); la salida, si molesta, es un tipo propio de excepción, que cuesta renunciar a `require`.
* **Mover los campos del constructor al cuerpo toca las siete entidades** → Es mecánico y las llamadas no cambian, pero es superficie. La red son los 134 tests, y en particular los de mapeo, que fallan si una anotación de columna se queda atrás al mudarse la propiedad.
* **Hibernate carga las filas sin ejecutar los `init`** → Una fila inválida ya existente en base de datos se cargaría sin protestar. Es lo correcto —un `SELECT` no debe reventar por datos viejos— y por eso los `CHECK` siguen ahí: impiden que esa fila llegue a existir.
* **`private set` cierra la puerta a modificar una entidad, y hoy casi no hay métodos que la abran** → Es deliberado: se añade solo `Location.rename`. Si un change futuro necesita modificar algo y no encuentra el método, tendrá que escribirlo con su `require`, que es exactamente el comportamiento buscado. El riesgo es que alguien, con prisa, lo lea como un obstáculo y devuelva el campo a `var` público; el ADR existe para que esa decisión se tome a la vista.
* **Las invariantes de `CareRecord` duplican literalmente los `CHECK` de `V4__`, escritos hace un rato** → Es el caso más claro de la triple definición. Se acepta conscientemente; si un día molesta, lo que sobra es la capa de `web`, no la del dominio.
* **Este change no aporta funcionalidad y consume presupuesto** → Del MVP de ~30 h queda menos. Se hace ahora porque su coste crece con cada entidad, y quedan T-04 a T-07.

## Migration Plan

No aplica: este change **no toca el esquema** (decisión 5). Todo es código, y `V5__` sigue libre y reservada para T-04.
