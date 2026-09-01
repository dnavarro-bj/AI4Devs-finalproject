# ADR-007 - Enums de dominio y sus converters

**Estado:** Aceptado
**Fecha:** 2026-09-01
**Origen:** change `api-crud-plantas` (T-02), decisión 10 del design

## Contexto

El modelo tiene campos con forma de enumerado que se persisten como texto: hoy solo `ai_recommendation.risk_level`, que pertenece a T-04, y previsiblemente más en los changes siguientes. JPA ofrece `@Enumerated(EnumType.STRING)` de serie, pero deja tres cosas sin resolver que en este proyecto importan:

* El valor persistido es el **nombre de la constante Kotlin**, así que renombrar la constante cambia lo que hay en la base de datos sin que nada avise.
* No hay normalización de la entrada: `"Low"`, `"low"` y `" low "` son valores distintos, y las seeds y los datos que llegan por API no tienen por qué venir en la misma forma.
* Un valor desconocido en la columna no falla: Hibernate lo convierte en un error tardío o, según el mapeo, en `null`.

[ADR-002](ADR-002-restricciones-en-base-de-datos.md) ya exige que las invariantes vivan también en la base de datos, y [ADR-006](ADR-006-aislamiento-del-dominio.md) admite Jakarta Persistence en `domain` pero no tipos de Spring ni de Hibernate.

## Decisión

Cada enumerado de dominio se declara con su **valor persistido explícito** y se mapea con un `AttributeConverter` propio, no con `@Enumerated`:

```kotlin
// com.cactify.domain
enum class RiskLevel(val value: String) {
  Low("low"), Medium("medium"), High("high"),
  ;

  companion object {
    operator fun invoke(value: String): RiskLevel =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("$value is an invalid value for RiskLevel")
  }

  override fun toString(): String = value
}

// com.cactify.infrastructure.persistence.converters
@Converter(autoApply = true)
class RiskLevelConverter : AttributeConverter<RiskLevel, String> {
  override fun convertToDatabaseColumn(attribute: RiskLevel?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): RiskLevel? = dbData?.let { RiskLevel(it) }
}
```

Las cuatro piezas son obligatorias:

* **`value` explícito**: el valor de la columna es un dato del contrato, independiente del nombre de la constante.
* **`invoke(value)`** en el companion: única puerta de entrada desde texto; normaliza (`trim` + `lowercase`) y **falla** ante un valor desconocido, en el acto y con el valor ofensor en el mensaje.
* **`toString()`** devolviendo `value`: lo que sale por el API y por los logs es el valor persistido, no el nombre de la constante.
* **`@Converter(autoApply = true)`** en `infrastructure/persistence/converters`: el mapeo no se repite entidad por entidad.

El enum vive en `domain`; su converter, en `infrastructure`. Cuando el conjunto de valores sea además una restricción de la base de datos, se acompaña del `CHECK` correspondiente según ADR-002.

Este ADR fija la convención; **no** adelanta ningún enum: `RiskLevel` se escribe en T-04, que es donde se ejercita.

## Alternativas consideradas

* **`@Enumerated(EnumType.STRING)`**: cero código, pero ata el dato persistido al nombre de la constante, no normaliza la entrada y no falla ante un valor desconocido.
* **`@Enumerated(EnumType.ORDINAL)`**: más compacto, pero el orden de declaración pasa a ser un contrato invisible; reordenar las constantes corrompe los datos.
* **Guardar el valor como `String` en la entidad y validar en la capa de aplicación**: es lo que hace hoy `AIRecommendation.riskLevel`; deja el conjunto de valores válidos fuera del tipo, así que el compilador no ayuda y cada punto de uso ha de acordarse de validar.
* **Un converter genérico parametrizado para todos los enums**: JPA exige un converter por tipo concreto para poder aplicarlo automáticamente; el genérico obligaría a declarar `@Convert` en cada atributo, que es justo lo que se quiere evitar.

## Consecuencias

* Renombrar una constante Kotlin es seguro; cambiar su `value` es un cambio de datos y exige migración, que es exactamente la señal que se busca.
* Un valor inesperado en la columna revienta al leer la fila, con el valor en el mensaje, en lugar de propagarse como `null`.
* Cada enumerado nuevo cuesta una clase converter de cuatro líneas; es el precio de las tres propiedades anteriores.
* La entrada por API se normaliza sin código adicional en los controllers: `RiskLevel("  HIGH ")` ya resuelve.
