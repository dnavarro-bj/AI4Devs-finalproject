# ADR-008 - Identificadores tipados y su representación en el API

**Estado:** Aceptado
**Fecha:** 2026-09-01
**Origen:** change `api-crud-plantas` (T-02), decisiones 3 y 3b del design

## Contexto

[ADR-003](ADR-003-tsid-como-clave-primaria.md) fija TSID (entero de 64 bits, columna `BIGINT`) como clave primaria de todas las tablas. T-01 lo materializó con `Long` pelado como `@Id` de cada entidad. Al abrir la capa web en T-02 aparecen dos problemas que el `Long` pelado no cubre:

* **Dentro del código**: nada impide pasar el identificador de una especie donde se espera el de una localización. `POST /plants` recibe los dos seguidos en el mismo cuerpo, que es justo la situación que invita a cruzarlos, y el compilador no dice nada.
* **En el borde HTTP**: un TSID supera con holgura `2^53`. Serializado como número JSON, un cliente JavaScript lo redondea al parsearlo y **corrompe la referencia en silencio** — no falla, apunta a otra fila.

ADR-003 anticipaba exponer el TSID en su representación canónica Crockford base32 (13 caracteres). Este ADR revisa esa parte: en el contrato del API los identificadores viajan como cadena **decimal**.

## Decisión

**Un tipo de identificador por entidad**, en `domain`, sobre el mismo valor de 64 bits, mapeado a la columna `BIGINT` que ya existe con `@Embeddable` + `@EmbeddedId`:

```kotlin
// com.cactify.domain
interface EntityId<T> : Serializable { val id: T }

@Embeddable
data class PlantId(@Column(name = "id") override val id: Long) : EntityId<Long> {
  companion object {
    fun create(): PlantId = PlantId(TSID.fast().toLong())
    fun from(value: Long): PlantId = PlantId(value)
    fun from(value: String): PlantId = PlantId(value.trim().toLong())
  }

  override fun toString(): String = id.toString()
}

@Entity
class Plant(@EmbeddedId val id: PlantId = PlantId.create(), …)
```

El mecanismo es `@EmbeddedId`, **no** `AttributeConverter`: la especificación JPA excluye los atributos identificadores del alcance de `@Convert` (§11.1.10) e Hibernate lo cumple, de modo que un converter sobre el `@Id` —con `autoApply` o declarado a mano— se ignora sin avisar y la columna acaba mapeada como `bytea`. Como el identificador embebido es de una sola columna, la clave primaria y todas las claves ajenas siguen siendo la misma columna `BIGINT`: **tipar los identificadores no lleva migración**.

**En el API los identificadores son cadenas decimales**, y el tipado ocurre en el borde:

* Los DTOs de respuesta y los cuerpos de petición declaran el identificador como `String`; los `@PathVariable` también.
* Al entrar se convierte con `XId.from(str)`; al salir, con `toString()`.
* **No hay módulo de Jackson global** que serialice `Long` como cadena: el contrato queda explícito en la firma de cada DTO en lugar de depender de una regla de serialización invisible.
* Una cadena no numérica hace que `from(...)` lance `NumberFormatException`, que el manejador global de errores traduce a `400`, nunca a `500`.

El tipado alcanza a **todas** las entidades del modelo, no solo a las que use el change de turno: dejar la mitad con `Long` pelado es peor que no haber empezado.

## Alternativas consideradas

* **`Long` pelado como `@Id`** (lo que había tras T-01): menos código, pero no impide cruzar identificadores de entidades distintas y deja el problema de precisión en el borde sin resolver.
* **`AttributeConverter` sobre el `@Id`**: es la forma más natural de leerlo y fue la primera propuesta del design de T-02; JPA la excluye para identificadores e Hibernate la ignora en silencio.
* **`UserType` de Hibernate por tipo de identificador**: sí funciona sobre un `@Id`, pero obliga a anotar la entidad con `@Type(...)` apuntando a una clase de `infrastructure`, es decir, una dependencia de `domain` hacia `infrastructure` que [ADR-006](ADR-006-aislamiento-del-dominio.md) prohíbe.
* **Guardar el `TSID` dentro del embebido** en lugar del `Long`: mismo riesgo de converter ignorado sobre un atributo del id, y nada del código necesita el `TSID` en sí, solo su valor decimal.
* **Módulo Jackson global que serialice todo `Long` como cadena**: funciona, pero es una regla invisible que se rompe en cuanto un `Long` del contrato sea una cantidad de verdad y no un identificador.
* **Representación canónica base32 de 13 caracteres** (lo que apuntaba ADR-003): más corta y legible en URLs, pero expone un formato propio en todos los bordes y obliga al frontend a tratarlo como opaco desde el primer día.
* **Número JSON crudo**: es la opción que rompe el frontend, y lo hace sin ruido.

## Consecuencias

* El compilador rechaza pasar un `SpeciesId` donde va un `LocationId`; el error de cruce deja de ser posible en lugar de ser improbable.
* Ningún identificador pierde precisión en el cliente, y el contrato es legible en la firma de cada DTO.
* Cada entidad nueva cuesta un `data class` de identificador; es mecánico y sin migración.
* `TSID` deja de aparecer en las firmas: solo se usa al generar (`TSID.fast().toLong()`). La ordenación temporal que da ADR-003 se conserva intacta, porque el valor es el mismo.
* Este ADR revisa la parte de ADR-003 que anunciaba base32 en el API; el resto de ADR-003 (TSID, `bigint`, generación en aplicación) sigue vigente.
* Los tests que insertan por SQL crudo siguen usando el `Long`; nada cambia en las seeds ni en las migraciones.
