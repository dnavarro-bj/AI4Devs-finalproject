# Design: fechas-y-auditoria

## Context

Motivación en [`proposal.md`](proposal.md) — Why. Estado y restricciones que condicionan el enfoque:

* El esquema tiene ocho tablas. Solo `plant` y `ai_recommendation` tienen `created_at`, ambas `TIMESTAMPTZ NOT NULL DEFAULT now()`; **ninguna tabla tiene `updated_at`**. `care_record.recorded_at` no es una marca de auditoría: es dato de negocio (cuándo se tomó la lectura).
* Las cuatro fechas del código son `OffsetDateTime`: `Plant.createdAt`, `AIRecommendation.createdAt`, `CareRecord.recordedAt` y los dos `createdAt` de `application/dto/PlantDtos.kt`.
* `application.yml` **no fija** `hibernate.jdbc.time_zone`, así que la sesión JDBC hereda la zona de la JVM.
* `Plant.createdAt` se lee de vuelta con `@Generated(event = [EventType.INSERT])`, y por eso `PlantService.create` usa `saveAndFlush`.
* Las siete entidades declaran su identificador como `@EmbeddedId val id: XId = XId.create()` en el constructor primario ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)). `plant_tag` no tiene entidad: es el `@ManyToMany` de `Plant`.
* [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) admite anotaciones de Jakarta Persistence en `domain` y prohíbe las de Spring. [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) exige que las invariantes bajen también a la base de datos.
* Migraciones aplicadas: `V1__` y `V2__`. La siguiente libre es `V3__`, hoy anotada en el design de `api-lecturas-cultivo`, que aún no se ha implementado.

## Goals / Non-Goals

Alcance y exclusiones en [`proposal.md`](proposal.md). A nivel de diseño:

**Goals:**

* Que el comportamiento observable no cambie salvo en lo que el proposal declara: los 87 tests existentes son el criterio.
* Que la convención quede escrita en un ADR, no enterrada en este design.
* Que una entidad nueva herede las marcas sin que su autor tenga que acordarse.
* Que haya **un solo reloj** en el sistema, de modo que un test pueda congelar cualquier fecha, sea de auditoría o de negocio.

**Non-Goals:**

* Rendimiento: dos columnas más por tabla no lo mueven.
* Cambiar cómo se obtiene la fecha de negocio de una lectura: `recordedAt` es de T-03. Aquí solo se adelanta el bean `Clock` del que ambos tirarán.

## Decisions

### 1. `Instant` en el dominio sobre `TIMESTAMPTZ`, con la sesión JDBC en UTC

Las cuatro fechas pasan a `java.time.Instant`, y `application.yml` fija:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
```

El motivo está comprobado, no supuesto. `TIMESTAMPTZ` **no almacena el desplazamiento**: insertando `2026-09-02T08:00:00+02:00` y `2026-09-02T08:00:00-05:00` en la misma tabla y leyéndolas con la sesión en UTC salen `06:00+00` y `13:00+00`; con la sesión en `Europe/Madrid`, `08:00+02` y `15:00+02`. El offset que se ve al leer es el de la sesión, nunca el que se escribió.

`OffsetDateTime` promete por tanto algo que la columna no cumple, y esa promesa rota tiene una consecuencia visible: como la zona de la sesión JDBC es hoy la de la JVM, el mismo instante se serializa `2026-09-01T18:05:40Z` en el contenedor (UTC) y `2026-09-01T20:05:40+02:00` en una máquina en CEST. El contrato del API depende de dónde se despliegue.

`Instant` corrige las dos cosas: dice exactamente lo que la columna guarda y se serializa siempre en UTC. **La entrada no se estrecha**: Jackson sigue aceptando `2026-09-02T08:00:00+02:00` de un cliente y lo normaliza, que es lo mismo que la base de datos iba a hacer de todos modos.

Alternativas descartadas:

* **Seguir con `OffsetDateTime` y limitarse a fijar la zona de la sesión**: elimina la dependencia de la máquina, pero deja el tipo prometiendo un offset que no se conserva — la próxima persona que lea la firma se lo creerá.
* **Guardar el desplazamiento en una columna aparte** (`TimeZoneStorageType.COLUMN` de Hibernate): es la única forma de conservarlo de verdad. Cuesta una columna por fecha y solo sirve si a alguien le importa la hora local del usuario, que hoy no la pide ninguna historia. Si algún día se pide, es una migración, no un cambio de tipo.
* **`LocalDateTime` con la convención "todo es UTC"**: descarta el problema por decreto y confía en que nadie se despiste.

### 2. `AbstractEntity<K>`, un `@MappedSuperclass` con las dos marcas

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

// com.cactify.domain — clase Kotlin normal: ni una anotación de Spring
class AuditingListener(private val clock: Clock) {
  @PrePersist
  fun onCreate(entity: AbstractEntity<*>) {
    val now = clock.instant()
    entity.createdAt = now
    entity.updatedAt = now
  }

  @PreUpdate
  fun onUpdate(entity: AbstractEntity<*>) {
    entity.updatedAt = clock.instant()
  }
}
```

Las siete entidades pasan a `class Plant(@EmbeddedId override val id: PlantId = PlantId.create(), …) : AbstractEntity<PlantId>()`.

Tres detalles que no son cosméticos:

* **El identificador se declara `abstract val id: K` en la superclase pero se sigue mapeando en cada subclase.** Así el tipo base expresa "toda entidad tiene identificador tipado" —que es lo que pedía la forma `AbstractEntity<K> : Entity<K>`— sin mover el `@EmbeddedId` hacia arriba, que obligaría a rehacer los constructores primarios de las siete entidades. La propiedad abstracta no tiene campo, así que Hibernate no mapea nada en la superclase.
* **`@PrePersist` fija las dos marcas al mismo valor**, no una cada una: en una fila recién creada `createdAt == updatedAt`, y eso es lo que hace verificable el primer escenario de la spec.
* **El `setter` es `internal`**: lo bastante abierto para que el listener escriba, cerrado para el resto. Las marcas las gestiona el ciclo de vida, no el código de aplicación; un servicio que quiera "tocar" una fila la modifica de verdad, no falsea su fecha.
* **Los callbacks viven en el listener, no en la entidad**, que es lo que permite inyectarles el reloj (decisión 4).

`Plant.createdAt` y `AIRecommendation.createdAt` dejan de declararse en sus entidades: las aporta la superclase. Eso retira de `Plant` el `@Generated(event = [EventType.INSERT])` con `insertable = false`, y **el `saveAndFlush` de `PlantService.create` deja de ser necesario**: con `@PrePersist` el valor está en el objeto antes del `INSERT`, así que el DTO lo lee sin bajar a la base de datos. Se simplifica a `save`.

Alternativas descartadas:

* **Repetir los dos campos en cada entidad**: sin superclase, la siguiente entidad que alguien escriba se olvidará de ellos, que es exactamente el problema que este change viene a cerrar.
* **Los callbacks dentro del propio `@MappedSuperclass`**: una clase menos, pero deja el reloj fuera del alcance de la inyección (ver decisión 4).
* **La jerarquía `AggregateRoot`/`BaseEntity` completa del monorepo de referencia**, que además aporta `entity_version` para bloqueo optimista: se toma solo la parte con demanda hoy. `@Version` queda anotado como evolución natural, no como deuda.

### 3. `plant_tag` recibe las columnas, pero no la herencia

La tabla de unión gana `created_at` y `updated_at` con su `DEFAULT now()`, y ahí acaba: no hay entidad que dispare `@PrePersist`, porque T-02 la eliminó a propósito (decisión 3c de su design) para que el reemplazo de tags fuese `plant.updateTags(...)` y no un borrado e inserción orquestado a mano.

Dos consecuencias que conviene tener escritas:

* **Su `updated_at` nunca avanzará.** Una fila de unión no se actualiza: se borra y se inserta. El valor será siempre igual al de creación, y eso es correcto, no un fallo.
* **Reasignar el mismo tag renueva su `created_at`.** Como `updateTags` vacía el conjunto y lo vuelve a llenar, Hibernate borra e inserta las filas; una asignación idempotente desde fuera produce una fila nueva por dentro. La marca dice cuándo se escribió esa fila, no desde cuándo la planta lleva ese tag. Si algún día importa lo segundo, `plant_tag` tendrá que volver a ser una entidad, y eso es una decisión de producto.

Alternativa descartada: **volver a convertirla en entidad** para que herede. Revertiría una decisión de T-02 tomada con motivo, y a cambio de una marca que no se consulta.

### 4. Un solo reloj en todo el sistema, inyectado en el listener

Los callbacks no van dentro de `AbstractEntity` sino en `AuditingListener`, y el listener recibe un `Clock` por constructor. El motivo es que **un test pueda congelar el tiempo para todo**: las marcas de auditoría y el `recordedAt` de una lectura pasan a medirse con el mismo reloj, así que un escenario puede afirmar instantes exactos en lugar de conformarse con "no está vacío".

El montaje respeta [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) sin trucos:

```kotlin
// com.cactify.infrastructure
@Configuration
class TimeConfiguration {
  @Bean fun clock(): Clock = Clock.systemUTC()
  @Bean fun auditingListener(clock: Clock) = AuditingListener(clock)
}
```

La clase `AuditingListener` vive en `domain` y no conoce Spring; quien la construye con su reloj es un `@Bean` de `infrastructure`. Así el `@EntityListeners` de la entidad apunta a una clase de su propia capa y **`domain` no importa `infrastructure`** — que es exactamente la trampa en la que caímos en T-02 al intentar poner un `AttributeConverter` sobre un `@Id`.

Que Hibernate use el listener del contenedor de Spring y no uno instanciado por su cuenta lo garantiza `SpringBeanContainer`, que Spring Boot registra en la `EntityManagerFactory` sin configuración adicional.

El bean `Clock` lo introduce **este** change. Estaba previsto en `api-lecturas-cultivo`, pero al adelantarse esta estandarización pasa a aportarlo aquí, y aquel lo hereda ya montado.

Alternativas descartadas:

* **`@PrePersist` dentro de la entidad con `Clock.systemUTC()` fijo** (la primera versión de este design): más simple y sin ninguna pieza de Spring en el camino, pero deja dos relojes en el sistema y hace que las marcas de auditoría sean el único dato que un test no puede fijar.
* **Anotar el listener con `@Component` y ponerlo en `domain`**: funciona y ahorra el `@Bean`, a cambio de meter una anotación de Spring en el dominio, que es justo lo que ADR-006 prohíbe.
* **Poner el listener en `infrastructure`**: la ubicación natural para algo que necesita inyección, pero obliga a que `domain` lo importe en su `@EntityListeners`, invirtiendo la dirección de dependencias.
* **Registrarlo como *default entity listener* en un `orm.xml`**: evita la anotación en la entidad por completo, a cambio de un fichero de mapeo XML que el proyecto no tiene y de que la asociación deje de verse leyendo la clase.

### 5. La aplicación sella y la base de datos respalda

Las dos columnas son `NOT NULL DEFAULT now()` en las ocho tablas, y además `@PrePersist` las fija desde la entidad. No es redundancia inútil: es la disciplina de [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) —el camino feliz no depende de que salte la restricción, pero la restricción está—. En la práctica compra dos cosas concretas: que las filas insertadas por SQL crudo (los tests de esquema lo hacen, y `plant_tag` siempre) queden bien, y que `SchemaMigrationTest` y `DomainConstraintsTest` sigan pasando **sin tocar ni una línea**.

Alternativa descartada: **solo la aplicación**, retirando el `DEFAULT` existente. Un único mecanismo es más limpio de contar, pero obligaría a reescribir todos los `INSERT` de los tests y dejaría `plant_tag` sin forma de rellenar sus marcas.

### 6. La migración `V3__` añade lo que falta en cada tabla, no lo mismo en todas

`V3__audit_timestamps.sql`:

* `soil_mix`, `species`, `location`, `tag`, `plant_tag`, `care_record` → `created_at` **y** `updated_at`.
* `plant`, `ai_recommendation` → solo `updated_at`: su `created_at` ya existe con el tipo y el `DEFAULT` correctos, así que no se toca.

`ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT now()` rellena las filas existentes en el mismo paso, de modo que las semillas de `V2__` quedan fechadas en el momento de migrar. Es correcto: no sabemos cuándo se "crearon" y fingir otra fecha sería peor.

**Esta migración se lleva el número `V3__`**, que el design de `api-lecturas-cultivo` tenía anotado. Ese change se actualiza a `V4__` después de archivar este, y T-04 se corre a `V5__`.

## Risks / Trade-offs

* **`@PrePersist` no se dispara en actualizaciones masivas** → Un `UPDATE` por JPQL, por SQL nativo o desde una migración no pasa por el ciclo de vida de la entidad, así que su `updated_at` no avanza. Hoy no existe ninguna operación así en el backend. Si aparece, la respuesta es un trigger en base de datos, no confiar en que alguien se acuerde; se anota en el ADR para que la decisión esté a la vista.
* **La propiedad `abstract val id: K` en un `@MappedSuperclass` es el punto frágil del diseño** → La forma habitual es subir el `@EmbeddedId` a la superclase, y aquí se deja abajo para no rehacer siete constructores. Si Hibernate se queja al arrancar de que hay una propiedad sin mapear en la jerarquía, el repliegue es inmediato y barato: quitar el parámetro genérico y dejar `AbstractEntity` con las dos marcas y nada más, perdiendo solo la expresividad del tipo. Se detecta en la primera tarea que arranca el contexto, no al final.
* **Cambiar `Plant.createdAt` toca código de un change archivado** → Es lo que retira el `@Generated` y el `saveAndFlush`. Lo cubren `PlantCreationApiTest` (que asserta que `createdAt` no llega vacío en el `201`) y `PlantDetailApiTest`; si el mecanismo nuevo fallara, fallan ellos.
* **El `createdAt` de las respuestas cambia de forma fuera del contenedor** → Mismo instante, distinta cadena: deja de llevar el desplazamiento local. En el contenedor (UTC) es idéntico a hoy, y el frontend aún no existe, así que no hay consumidor al que romper. Después de T-05 sería un cambio de contrato.
* **El listener depende de que Hibernate lo resuelva desde el contenedor de Spring** → Si `SpringBeanContainer` no interviniese, Hibernate intentaría instanciarlo por su cuenta. Es un riesgo benigno: `AuditingListener` no tiene constructor sin argumentos, así que el arranque falla ruidosamente en lugar de sellar fechas con un reloj equivocado en silencio. Lo detecta la primera tarea que levanta el contexto.
* **El escenario "`updatedAt` avanza" no se puede probar con un `Clock.fixed`** → Con el tiempo congelado, la marca de modificación coincidiría con la de creación y el test pasaría por el motivo equivocado. Hace falta un reloj de test que se pueda adelantar entre el `persist` y el `update`; va como tarea propia.
* **`updated_at` en `plant_tag` es una columna que nunca cambia** → Es el precio de la uniformidad del esquema. Documentado en la decisión 3 para que no se lea como un fallo.
* **Este change no aporta funcionalidad y consume presupuesto** → Del MVP de ~30 h ya hay parte gastada. Se hace ahora porque su coste crece con cada entidad y cada endpoint nuevo, y quedan cinco tickets; hacerlo después de T-04 significaría reescribir también sus fechas.

## Migration Plan

Una migración nueva, `V3__audit_timestamps.sql`, con los `ALTER TABLE` descritos en la decisión 6. Las filas existentes se rellenan con `now()` en el mismo paso; no hay datos que interpretar ni columnas que cambiar de tipo, porque las dos `created_at` que ya existen se conservan tal cual.

El despliegue no tiene paso especial: Flyway la aplica al arrancar. La vuelta atrás sería una migración que elimine las columnas; no se escribe por adelantado porque no hay entorno con datos que proteger.

**Orden respecto a los demás changes**: este se implementa y archiva primero. Después, `api-lecturas-cultivo` se actualiza con `/opsx:update` para heredar `Instant`, `AbstractEntity` y el número `V4__`.
