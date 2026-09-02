# ADR-010 - Fechas como `Instant` y marcas de auditoría en toda entidad

**Estado:** Aceptado
**Fecha:** 2026-09-02
**Origen:** change `fechas-y-auditoria`, surgido al revisar el design de `api-lecturas-cultivo` (T-03)

## Contexto

Dos carencias del modelo salieron a la vez al preparar T-03, cuando la fecha de una lectura dejó de ponerla solo el servidor y pasó a poder llegar del cliente.

**El tipo de las fechas prometía algo que el esquema no cumple.** Las entidades usaban `OffsetDateTime` sobre columnas `TIMESTAMPTZ`, y PostgreSQL **no almacena el desplazamiento horario**: convierte el valor a un instante y, al leerlo, lo formatea con el desplazamiento de la sesión. Comprobado insertando `2026-09-02T08:00:00+02:00` y `2026-09-02T08:00:00-05:00` en la misma tabla: con la sesión en UTC vuelven como `06:00+00` y `13:00+00`; con la sesión en `Europe/Madrid`, como `08:00+02` y `15:00+02`. El desplazamiento que se ve al leer nunca es el que se escribió.

Como además `application.yml` no fijaba la zona de la sesión JDBC, esta heredaba la de la JVM, y **el mismo instante se serializaba distinto según dónde corriera el backend**: `2026-09-01T18:05:40Z` dentro del contenedor y `2026-09-01T20:05:40+02:00` en una máquina en CEST. El contrato del API dependía de la infraestructura.

**No había forma de saber cuándo cambió una fila.** Solo `plant` y `ai_recommendation` tenían `created_at`; ninguna tabla tenía `updated_at`. Sin eso no se puede ordenar un catálogo por antigüedad, ni depurar "esto ayer no estaba así", ni resolver un conflicto de sincronización cuando llegue la carga diferida desde el móvil ([F.5](../user-stories/F.5-app-movil-sincronizacion-sensores-bluetooth.md)).

## Decisión

**Toda fecha del dominio es un `Instant`**, persistido en una columna `TIMESTAMPTZ`, con la sesión JDBC fijada en tiempo universal:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
```

Es el tipo que dice la verdad sobre lo que la columna guarda, y hace la salida JSON determinista: siempre en UTC, corra donde corra el servidor. La entrada no se estrecha — Jackson sigue aceptando `2026-09-02T08:00:00+02:00` de un cliente y lo normaliza, que es lo mismo que la base de datos iba a hacer.

**Toda tabla lleva `created_at` y `updated_at`**, ambas `TIMESTAMPTZ NOT NULL DEFAULT now()`, y **toda entidad hereda de `AbstractEntity<K>`**, que las aporta:

```kotlin
// com.cactify.domain
@MappedSuperclass
@EntityListeners(AuditingListener::class)
abstract class AbstractEntity<K : EntityId<*>> {
  abstract val id: K

  @Column(name = "created_at", nullable = false)
  lateinit var createdAt: Instant
    internal set

  @Column(name = "updated_at", nullable = false)
  lateinit var updatedAt: Instant
    internal set
}

class AuditingListener(private val clock: Clock) {
  @PrePersist
  fun onCreate(entity: AbstractEntity<*>) {
    val now = now()
    entity.createdAt = now
    entity.updatedAt = now
  }

  @PreUpdate
  fun onUpdate(entity: AbstractEntity<*>) {
    entity.updatedAt = now()
  }

  private fun now(): Instant = clock.instant().truncatedTo(ChronoUnit.MICROS)
}
```

Cinco reglas que van con ello:

* **Un solo reloj en el sistema**, inyectado. `AuditingListener` recibe un `Clock` y nadie más llama a `Instant.now()` ni a `Clock.systemUTC()` fuera del `@Configuration` que declara el bean. Así un test puede congelar el tiempo y afirmar instantes exactos, tanto para las marcas de auditoría como para cualquier fecha de negocio.
* **El listener vive en `domain` y no conoce Spring**; quien lo construye con su reloj es un `@Bean` de `infrastructure`. De ese modo el `@EntityListeners` de la entidad apunta a una clase de su propia capa y `domain` no depende de `infrastructure`, como exige [ADR-006](ADR-006-aislamiento-del-dominio.md). Hibernate resuelve el listener desde el contenedor mediante `SpringBeanContainer`, que Spring Boot registra sin configuración adicional.
* **La marca se recorta a microsegundos**, que es la precisión de `TIMESTAMPTZ`. Sin ese recorte, el valor que viaja en la respuesta del alta lleva nanosegundos que la base de datos redondea, y una consulta posterior devuelve una cadena distinta para el mismo instante.
* **La aplicación sella y la base de datos respalda.** El `DEFAULT now()` no es redundancia: es la red que pide [ADR-002](ADR-002-restricciones-en-base-de-datos.md) para las filas insertadas por SQL crudo.
* **`created_at`/`updated_at` en una tabla sin entidad** (hoy solo `plant_tag`, que es unión pura) las pone únicamente el `DEFAULT`. Su `updated_at` no avanzará nunca, porque una fila de unión no se actualiza: se borra y se inserta.

## Alternativas consideradas

* **Seguir con `OffsetDateTime` y limitarse a fijar la zona de la sesión**: elimina la dependencia de la máquina, pero deja el tipo prometiendo un desplazamiento que no se conserva; quien lea la firma se lo creerá.
* **Guardar el desplazamiento en una columna aparte** (`TimeZoneStorageType.COLUMN` de Hibernate): es la única forma de conservarlo de verdad, y cuesta una columna por fecha. Solo sirve si importa la hora local del usuario, que hoy no la pide ninguna historia; si se pide, será una migración.
* **`LocalDateTime` con la convención "todo es UTC"**: descarta el problema por decreto y confía en que nadie se despiste.
* **`@PrePersist` dentro de la propia entidad con `Clock.systemUTC()` fijo**: una clase menos y sin ninguna pieza de Spring en el camino, pero deja dos relojes en el sistema y hace de las marcas de auditoría el único dato que un test no puede fijar.
* **Anotar el listener con `@Component` y dejarlo en `domain`**: ahorra el `@Bean` a cambio de meter una anotación de Spring en el dominio, justo lo que ADR-006 prohíbe.
* **Poner el listener en `infrastructure`**: ubicación natural para algo que necesita inyección, pero obliga a que `domain` lo importe en su `@EntityListeners`, invirtiendo la dirección de dependencias.
* **Registrar el listener por defecto en un `orm.xml`**: evita la anotación en la entidad, a cambio de un fichero de mapeo XML que el proyecto no tiene y de que la asociación deje de verse leyendo la clase.
* **Repetir los dos campos en cada entidad, sin superclase**: la siguiente entidad que alguien escriba se olvidará de ellos.

## Consecuencias

* El contrato del API deja de depender del despliegue: la misma fila devuelve la misma cadena en cualquier máquina.
* Una entidad nueva hereda las marcas sin que su autor tenga que acordarse, que es el objetivo.
* **Una actualización masiva no dispara el ciclo de vida de JPA**: un `UPDATE` por JPQL, por SQL nativo o desde una migración no pasa por `@PreUpdate`, así que su `updated_at` no avanza. Hoy no existe ninguna operación así en el backend; si aparece, la respuesta es un trigger en base de datos, no confiar en que alguien lo recuerde.
* El bloqueo optimista (`@Version`) queda como evolución natural de `AbstractEntity` el día que haya escritura concurrente sobre la misma fila. No se adopta ahora porque no la hay.
* Auditar *quién* modificó (`created_by`/`updated_by`) sigue fuera: el MVP es monousuario y sin autenticación.
* `plant.created_at` deja de leerse de vuelta con `@Generated(event = [EventType.INSERT])`, y con ello desaparece el `saveAndFlush` que ese mecanismo obligaba a hacer en el alta de plantas.
