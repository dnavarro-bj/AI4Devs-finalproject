# ADR-011 - Invariantes de negocio en el dominio

**Estado:** Aceptado
**Fecha:** 2026-09-02
**Origen:** change `invariantes-de-dominio`

## Contexto

Hasta T-03, **ninguna entidad del modelo comprobaba nada**. Las reglas de negocio vivían en dos sitios, y ninguno era el dominio:

* En `CHECK` de base de datos ([ADR-002](ADR-002-restricciones-en-base-de-datos.md)): que los porcentajes de una mezcla sumen 100, que su rango de pH no esté invertido, que las medidas de una lectura estén dentro de escala.
* En anotaciones de Bean Validation sobre los cuerpos de petición, que están en `web`: fuera del dominio y solo en el camino HTTP.

Eso dejaba el modelo indefenso por dentro. Un `SoilMix` con `organicPercentage = 90` y `mineralPercentage = 90` era un objeto perfectamente construible; nada lo impedía hasta que la base de datos lo rechazaba al hacer `flush`, y el error llegaba desde la infraestructura y no desde el dominio. Y la regla, escrita solo en SQL y en un DTO de `web`, no se podía leer en la clase a la que pertenece.

Había además un hueco que ninguna de las dos capas cubría: `Species` no validaba sus rangos en ningún sitio, y nada impedía una especie con `minHumidity = 80` y `maxHumidity = 10` — precisamente la especie de la que T-04 saca las desviaciones que manda al prompt de la IA.

## Decisión

**Cada entidad es dueña de su consistencia interna**, y esas reglas se llaman invariantes de negocio.

**Se expresan con `require(...)` en un bloque `init`**, en la propia clase, no con anotaciones. Una anotación solo se comprueba cuando alguien invoca un validador, así que la entidad seguiría pudiendo existir en estado inválido, que es exactamente el problema.

```kotlin
class SoilMix(
  name: String,
  organicPercentage: Int,
  mineralPercentage: Int,
  …
) : AbstractEntity<SoilMixId>() {
  var organicPercentage: Int = organicPercentage
    private set
  …

  init {
    require(organicPercentage + mineralPercentage == 100) {
      "Los porcentajes de la mezcla deben sumar 100, y suman ${organicPercentage + mineralPercentage}"
    }
  }
}
```

**La consistencia se protege también frente a la modificación.** Un `init` solo cubre el momento de crear; con campos `var` públicos, la invariante se rompe en la línea siguiente. Los campos se declaran en el cuerpo con `private set`, y el cambio pasa por métodos de dominio que revalidan (`location.rename(name)`). No se inventan métodos que nadie llama: con el `set` cerrado, una entidad sin método de cambio queda de hecho inmutable, y el change que necesite modificar algo escribirá el suyo con su `require`.

**Cuando una invariante necesita algo que la entidad no tiene, se expresa en una factoría del `companion object`**, que lo recibe como parámetro. El caso es la fecha de una lectura: para saber si es futura hace falta un reloj, y eso no es un dato de la lectura sino de quien la registra.

```kotlin
class CareRecord private constructor(…) : AbstractEntity<CareRecordId>() {
  companion object {
    fun record(…, recordedAt: Instant?, clock: Clock, maxFutureSkew: Duration): CareRecord {
      val stamped = (recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) {
        "La fecha de la lectura no puede estar en el futuro"
      }
      return CareRecord(…, recordedAt = stamped)
    }
  }
}
```

El constructor primario de esa entidad es **privado**: si fuera público, la factoría sería una convención y no una garantía. Hibernate no se ve afectado, porque usa el constructor sin argumentos que genera el plugin de Kotlin y accede por reflexión.

**Cada capa tiene su papel, y hay un dueño:**

| Capa | Qué hace | Por qué está |
|---|---|---|
| `domain` | **Define** la regla | Fuente de la verdad. Si las tres divergen, la del dominio es la correcta. |
| `web` | La anticipa, **y solo si es de tipo o de rango** | Da el `400` con el nombre del campo, la mejor respuesta para el cliente. Es una comodidad del borde, no la definición. |
| base de datos | La respalda | La última red de [ADR-002](ADR-002-restricciones-en-base-de-datos.md), para lo que entra por SQL crudo sin pasar por el constructor. |

**`web` solo admite comprobaciones de tipo y de rango.** Una anotación que mire un solo campo contra un límite constante —`@NotBlank`, `@Min`, `@Max`, `@DecimalMin`— vale. Cualquier cosa que necesite colaboradores, configuración o mirar varios campos a la vez **es** lógica de negocio, y en `web` queda escondida tras una anotación, lejos del concepto al que pertenece.

**Qué NO es una invariante de entidad**, aunque lo parezca:

* Las reglas que **consultan el estado del sistema** —que un nombre de tag no esté duplicado, que la especie referenciada exista—: requieren mirar otras filas y viven en `application`.
* Las que dependen de **quién** ejecuta la operación o de configuración de despliegue, salvo que entren como parámetro de una factoría.

**Una invariante violada responde `400`**, con el cuerpo de error uniforme del API, y el manejador la **registra en el log**. El argumento contrario es bueno: con `web` validando primero, que salte una invariante desde una petición HTTP significa que las dos definiciones han divergido, o sea un fallo nuestro, y eso apuntaría a `500`. Se elige `400` porque el dato que llega sigue siendo inválido —la regla del proyecto desde T-02 es que un cuerpo inválido nunca es `5xx`— y porque el mensaje del `require` sí le dice al cliente qué se incumplió. El log existe para que la divergencia no pase inadvertida.

**Los tests de invariantes no necesitan contenedor.** Son unitarios: construir la entidad con datos inválidos y comprobar que lanza. No hay nada que persistir, porque el rechazo ocurre antes. [ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md) no se toca: sigue exigiendo PostgreSQL real para los tests **de integración**, y estos no lo son.

**Excepciones registradas.** Tres invariantes se quedan sin red en base de datos:

* Las tres de `Species` (`min <= max`), porque hoy **no hay ninguna vía de entrada que escriba especies**: las únicas filas son las tres semillas. Un `CHECK` protegería un camino que no existe. Cuando se abra la API de especies, la invariante del dominio ya estará puesta y añadir el respaldo será una migración de tres líneas.
* "Al menos un valor" en una lectura, porque un `CHECK` cruzado sobre cinco columnas contradiría la tolerancia a nulos que `V4__` fijó a propósito.
* La fecha no futura, porque depende de la hora actual y eso no es una restricción de integridad.

## Alternativas consideradas

* **Anotaciones de Bean Validation sobre la entidad** (`@Min`, `@AssertTrue`): es lo que el proyecto usa en `web`, pero solo se comprueban cuando alguien invoca un validador; la entidad seguiría pudiendo existir en estado inválido.
* **Una función `validate()`** que alguien llama antes de guardar: traslada la responsabilidad a quien la usa, y se olvida en la primera prisa.
* **Objetos de valor** (`Percentage`, `PhRange`, `HumidityRange`) que hagan imposible el estado inválido por construcción: es la forma más fuerte y probablemente el destino a largo plazo, pero multiplica las clases y el mapeo JPA por un beneficio que hoy da el `require`.
* **Solo el `init`, dejando los campos `var` públicos**: más barato y cubre el caso real de hoy —las entidades se crean y casi nunca se modifican—, pero deja la invariante rompible en la línea siguiente.
* **Pasar a la entidad el límite ya calculado** (`maxAllowedAt`) en vez del reloj: evita la factoría, a cambio de meter en la firma un parámetro que no es un dato de la lectura.
* **Retirar los `CHECK` de base de datos** y dejar una sola definición: más limpio de contar, pero contradice ADR-002 —que es inmutable— y dejaría sin protección las filas que entran por SQL crudo, que los tests de esquema insertan a propósito.
* **Un tipo propio de excepción de dominio** en lugar de `IllegalArgumentException`: permitiría distinguir una invariante violada de un fallo interno, a cambio de renunciar a `require`.

## Consecuencias

* La regla se lee en la clase del concepto: para saber qué es una mezcla de tierra válida ya no hay que abrir un `.sql` ni un DTO de `web`.
* Una entidad inválida no llega a existir, ni siquiera en memoria.
* **La misma regla queda escrita en tres sitios y puede divergir.** Si diverge, el usuario ve el mensaje de `web`, que es el primero que salta. La mitigación no es documental sino de pruebas: cada capa con su test afirmando el mismo límite.
* **`IllegalArgumentException` es un tipo genérico**: una que venga de un fallo interno de verdad se reportará como `400`. Se acepta porque el dominio es hoy el único sitio que la lanza a propósito.
* **Hibernate carga las filas sin ejecutar los `init`**, porque el constructor sin argumentos del plugin no ejecuta inicializadores. Es lo correcto —un `SELECT` no debe reventar por datos viejos— y por eso los `CHECK` siguen ahí: impiden que esa fila llegue a existir.
* Registrar una lectura tiene una sola puerta, `CareRecord.record(...)`, y por ella entran también los tests. Cómo obtiene su fecha —valor por defecto y recorte a microsegundos— dejó de estar repartido entre `web`, `application` y el modelo.
* Añadir una entidad nueva obliga a preguntarse cuáles son sus invariantes, que es el efecto buscado.
