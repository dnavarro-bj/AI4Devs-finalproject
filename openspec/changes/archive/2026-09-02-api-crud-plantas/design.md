# Design: api-crud-plantas

## Context

Motivación en [`proposal.md`](proposal.md) — Why. Estado y restricciones que condicionan el enfoque:

* El backend, tras `modelo-datos` (T-01), tiene proyecto Spring Boot con Spring Data JPA, Flyway y entidades JPA en `com.cactify.domain` (`SoilMix`, `Species`, `Location`, `Plant`, `Tag`, `PlantTag`, `CareRecord`, `AIRecommendation`), pero **sin `spring-boot-starter-web`**: no hay capa HTTP de ningún tipo, ni manejo de errores, ni serialización JSON configurada.
* El único repositorio existente es `SpeciesRepository`, declarado en el paquete `domain` extendiendo `JpaRepository` de Spring Data.
* [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) fija la disciplina de capas: `web` → `application` → `domain`, con `infrastructure` implementando los puertos de repositorio. Los controllers no pueden inyectar repositorios; solo servicios de `application`. El paquete `domain` no admite anotaciones ni tipos de Spring.
* [ADR-003](../../../docs/adr/ADR-003-tsid-como-clave-primaria.md) fija TSID (`Long` de 64 bits) como clave primaria de todas las tablas.
* [ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md) exige PostgreSQL real en los tests de integración; ya existe `AbstractIntegrationTest` con el contenedor configurado.
* [ADR-005](../../../docs/adr/ADR-005-tdd.md) exige escribir los escenarios de las specs como tests antes que el código.
* Ya existe en base de datos el índice único `tag_name_normalized_unique ON tag (lower(trim(name)))`, coherente con [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md).

## Goals / Non-Goals

Alcance funcional y exclusiones de producto en [`proposal.md`](proposal.md). A nivel de diseño:

**Goals:**

* Establecer la estructura de paquetes y el patrón controller → service → repository que heredarán T-03 y T-04, no solo este change.
* Fijar el contrato JSON del API (IDs, forma de los errores, forma de los DTOs) que consumirá el frontend en T-05.
* Que el filtrado combinable se resuelva en una sola consulta a base de datos, sin filtrar en memoria.
* Que ningún endpoint de índice pueda devolver una colección sin límite, ni ahora ni en los changes que hereden este patrón.

**Non-Goals:**

* Especificación OpenAPI generada (springdoc): útil, pero no la pide T-02 y añade una dependencia; queda como posible change de soporte.
* Versionado del API (`/v1`): innecesario mientras solo haya un consumidor que se despliega a la vez.
* Optimización de consultas más allá de evitar el problema N+1 en el listado y el detalle.

## Decisions

### 1. Estructura de paquetes según ADR-006

```
com.cactify
├── domain
│   ├── (entidades JPA de T-01 + los tipos de identificador, ver decisión 3)
│   ├── repos         Puertos de repositorio (interfaces propias)
│   └── specs         Specifications de consulta (PlantSpecs), ver decisión 4
├── application
│   ├── (servicios de caso de uso: PlantService, LocationService, TagService)
│   └── dto           DTOs de respuesta que devuelven los servicios, y PageResponse
├── infrastructure
│   └── persistence
│       ├── (interfaces Spring Data que implementan los puertos)
│       └── converters  AttributeConverter de los enums de dominio (decisión 10)
└── web
    ├── controllers   Controllers REST y sus cuerpos de petición
    └── errors        Manejador global de errores y el cuerpo ErrorResponse
```

Los controllers solo conocen `application`; `application` solo conoce `domain`.

**Los DTOs de respuesta viven en `application/dto` y los devuelven los servicios ya montados**, como el `PostResponse` del monorepo. Ninguna entidad de dominio cruza hacia `web`: el controller recibe el DTO y lo escribe, sin más trabajo que el HTTP. Los cuerpos de petición sí viven en `web` —son la forma del mensaje HTTP, no del caso de uso— y el controller los traduce a los parámetros del servicio.

Esto no es solo disciplina de capas; es lo que sitúa el mapeo **dentro** de la frontera transaccional del servicio. Si el controller mapeara entidades, tocaría asociaciones `LAZY` (`plant.tags`, `plant.species`) con la sesión ya cerrada: o falla con `LazyInitializationException`, o —peor— funciona porque `spring.jpa.open-in-view` viene activo por defecto en Spring Boot y mantiene la sesión abierta durante toda la petición, dejando que la capa web dispare consultas que nadie ve. Se apaga explícitamente: `spring.jpa.open-in-view: false`. Con el mapeo dentro del servicio, todo lo que la respuesta necesita se ha cargado antes de salir de la transacción, y un `LazyInitializationException` pasa a ser lo que debe ser: un fallo ruidoso que señala una consulta mal planteada, no un N+1 silencioso servido desde el controller.

Alternativas descartadas: **exponer las entidades JPA como cuerpo JSON** (acopla el contrato público al esquema y arrastra proxies de Hibernate a la serialización); **devolver entidades desde el servicio y mapear en el controller** (es lo que obliga a `open-in-view` y mueve las consultas fuera de la transacción).

### 2. Puertos de repositorio en `domain`, implementación Spring Data en `infrastructure`

ADR-006 dice que `domain` declara "interfaces de repositorio (puertos) sin anotaciones de Spring ni de Hibernate" y que `infrastructure` las implementa con Spring Data. El `SpeciesRepository` actual incumple esa regla (vive en `domain` y extiende `JpaRepository`). Este change lo corrige y fija el patrón para los demás, siguiendo la convención ya establecida en `hub4fans/plataforma-monorepo/backend`:

* En `domain`: el puerto es una interfaz Kotlin pura que declara únicamente los métodos de acceso que el dominio necesita.

  ```kotlin
  // com.cactify.domain.repos
  interface TagRepository {
    fun save(tag: Tag): Tag
    fun findOneById(id: TagId): Tag?
    fun findAll(pageable: Pageable): Page<Tag>
    fun findByNormalizedName(name: String): Tag?
  }
  ```

* En `infrastructure`: **una sola interfaz** que extiende a la vez el puerto y `JpaRepository`, anotada con `@Repository`. Spring Data genera la implementación; las consultas que no salen del nombre del método se resuelven con `@Query` sobrescribiendo el método del puerto.

  ```kotlin
  // com.cactify.infrastructure.persistence
  @Repository
  interface JpaTagRepository :
    TagRepository,
    JpaRepository<Tag, TagId> {
    @Query("SELECT t FROM Tag t WHERE lower(trim(t.name)) = :name")
    override fun findByNormalizedName(name: String): Tag?
  }
  ```

La búsqueda por identificador se llama `findOneById` y devuelve el tipo anulable de Kotlin, no `findById`: ese nombre está tomado por `JpaRepository`, que lo devuelve envuelto en `Optional`, y dos métodos con el mismo nombre y parámetros no pueden diferir solo en el tipo de retorno. `findOneById` lo deriva Spring Data de la propiedad `id` sin ambigüedad.

**No hay clase adaptadora ni delegación manual**: la única pieza escrita a mano es la interfaz del puerto. `application` inyecta siempre el tipo del puerto (`TagRepository`), nunca `JpaTagRepository`, de modo que ninguna capa por encima ve tipos de Spring Data.

Los cuatro puertos de este change son `PlantRepository`, `LocationRepository`, `TagRepository` y `SpeciesRepository` (este último, reubicado). Los métodos del puerto se declaran explícitamente aunque `JpaRepository` ya los ofrezca (`save`, `findOneById`, `findAll`): el puerto define el contrato mínimo que el dominio necesita, no la superficie completa de Spring Data — y en particular **no expone el `findAll()` sin paginar** que `JpaRepository` traería de serie. Los puertos con listado declaran `findAll(spec, pageable): Page<T>` en lugar de `findAll(): List<T>`, porque en este API no existe el listado sin paginar (decisiones 4 y 9).

Alternativas descartadas:

* **Dejar las interfaces Spring Data en `domain`** (lo que hay hoy): más corto, pero contradice un ADR aceptado y es exactamente el punto que ADR-006 anticipaba corregir "de T-02 en adelante".
* **Puerto + clase adaptadora `@Repository` que delega en una interfaz Spring Data**: aislamiento algo más estricto (el puerto podría devolver tipos propios), a cambio de una capa de delegación por agregado que hay que escribir y mantener. Se descarta por coherencia con el patrón ya en uso en el monorepo de referencia.
* **Un puerto base genérico `Repository<T, ID>`** como el `core.domain.Repository` del monorepo: allí compensa por el número de contextos que lo comparten; aquí, con cuatro repositorios y sin paginación en el MVP, cada puerto declara directamente lo que necesita (incluido el `findAll(spec)` de `PlantRepository`). Si el backend crece, extraer la interfaz base es mecánico.

### 3. IDs tipados sobre TSID

Las entidades de T-01 usan `Long` pelado como identificador. Se adopta el tipado de identificadores
del monorepo de referencia: un tipo por entidad sobre el mismo TSID de 64 bits, mapeado a la
columna `BIGINT` que ya existe.

El mecanismo es `@Embeddable` + `@EmbeddedId`, **no** `AttributeConverter`: la especificacion JPA
excluye los atributos identificadores del alcance de `@Convert` (§11.1.10) e Hibernate lo cumple,
de modo que un converter sobre el `@Id` —con `autoApply` o declarado a mano— se ignora en silencio
y la columna acaba mapeada como `bytea` (el `Serializable` por defecto). La validacion de esquema
lo delata en el arranque: `wrong column type encountered in column [id]; found [int8], but
expecting [bytea]`.

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

// com.cactify.domain
@Entity
class Plant(
  @EmbeddedId val id: PlantId = PlantId.create(),
  …
)
```

El identificador es un embebido de una sola columna, asi que la clave primaria sigue siendo la
misma columna `id BIGINT` y las FK (`plant.location_id`, `care_record.plant_id`…) tampoco cambian.
**No hay migracion**: la columna sigue siendo `BIGINT` con el mismo valor; solo cambia el tipo
Kotlin que la representa. Como el valor es un `Long`, el paquete `infrastructure/persistence/
converters` no llega a tener ningun converter de identificador; queda para los converters de enum
de la decision 10.

Se tipan los identificadores de las siete entidades del modelo —`SoilMixId`, `SpeciesId`,
`LocationId`, `PlantId`, `TagId`, `CareRecordId`, `AIRecommendationId`—, no solo los cuatro que
este change usa: dejar la mitad del modelo con `Long` seria peor que no haber empezado, y
T-03/T-04 heredarian la inconsistencia.

Lo que compra: el compilador impide pasar un `SpeciesId` donde va un `LocationId`, que es
exactamente la confusion que `POST /plants` puede sufrir al recibir dos identificadores seguidos
en el mismo cuerpo.

Alternativas descartadas: **`AttributeConverter` sobre el `@Id`** (es lo que este design proponia
en su primera version; no funciona, ver arriba); un **`UserType` de Hibernate** por tipo de
identificador (si funciona sobre un `@Id`, pero obliga a anotar la entidad con `@Type(...)`
apuntando a una clase de `infrastructure`, es decir, una dependencia de `domain` hacia
`infrastructure` que ADR-006 prohibe); **guardar el `TSID` dentro del embebido** en lugar del
`Long` (requeriria un converter sobre un atributo que forma parte del id, con el mismo riesgo de
que se ignore, y nada del codigo necesita el `TSID` en si, solo su valor decimal); seguir con
`Long` pelado (menos codigo y no reabre las entidades de T-01, pero se aleja de la convencion del
otro backend y no impide cruzar identificadores de entidades distintas).

### 3b. Los IDs viajan como cadena, tipados en el borde

Un TSID es un entero de 64 bits; en JSON, un número mayor que 2^53 se redondea al parsearlo en JavaScript y corrompe la referencia en silencio. En el API los identificadores viajan siempre como **cadena decimal** (`"389471234567890123"`).

El mecanismo es el del monorepo: **no hay módulo Jackson global**. Los DTOs de `web` declaran `val id: String` y los `@PathVariable` son `String`; la conversión ocurre en el borde con `PlantId.from(str)` al entrar y `toString()` al salir. Así el contrato del API es explícito en la firma de cada DTO en lugar de depender de una regla global de serialización que hay que recordar.

Una cadena no numérica hace que `from(...)` lance `NumberFormatException`, que el manejador global traduce a `400` (decisión 5), no a `500`.

Alternativas descartadas: un **módulo Jackson global que serialice todo `Long` como cadena** (funciona, pero es una regla invisible y se rompería en cuanto un `Long` del contrato fuera una cantidad de verdad y no un id); el **`TSIDJacksonModule` del monorepo**, que escribe TSID como número — allí está registrado solo en el `json_format_mapper` de Hibernate, para columnas JSON, no en el `ObjectMapper` web, así que no aplica a este caso; **TSID canónico base32** (13 caracteres, más legible en URLs, pero expone un formato propio en todos los bordes); **número JSON crudo** (rompe el frontend).

### 3c. `Plant` ↔ `Tag` como `@ManyToMany`, sin entidad de unión

T-01 modeló `plant_tag` como una entidad `PlantTag` con `@IdClass` y dos `@ManyToOne`. Se sustituye por la relación N:M mapeada en `Plant`, que es la forma que usa `Post` con sus tags en el monorepo:

```kotlin
@Entity
@Table(name = "plant")
class Plant(
  @EmbeddedId val id: PlantId = PlantId.create(),
  var nickname: String,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id", nullable = false)
  var location: Location,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "species_id", nullable = false)
  var species: Species,
  @Column(name = "created_at", insertable = false, updatable = false)
  var createdAt: OffsetDateTime? = null,
) {
  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
    name = "plant_tag",
    joinColumns = [JoinColumn(name = "plant_id")],
    inverseJoinColumns = [JoinColumn(name = "tag_id")],
  )
  @BatchSize(size = 50)
  private val tagSet: MutableSet<Tag> = mutableSetOf()

  val tags: Set<Tag> get() = tagSet.toSet()

  fun updateTags(newTags: Set<Tag>) {
    tagSet.clear()
    tagSet.addAll(newTags)
  }
}
```

`plant_tag` no tiene columnas propias más allá de su clave compuesta: es una tabla de unión pura, no una entidad asociativa. `CreatorCategory` del monorepo sí es entidad porque `creator_categories` se consulta por sí misma (`findByCreatorId`, agregaciones por categoría); `post_tags`, que es el caso análogo a este, no tiene entidad y se mapea exactamente así. **La tabla no cambia**: mismas columnas, misma clave primaria compuesta, mismas FK; solo cambia cómo la ve JPA.

Tres cosas que esto resuelve de golpe:

* **El reemplazo de tags es una operación de dominio**, `plant.updateTags(...)`, en lugar de un borrado e inserción de filas orquestado desde el servicio. La idempotencia sale del `Set`, no de comparar conjuntos a mano.
* **El detalle ya no necesita una consulta aparte**: `plant.tags` está ahí. No hace falta ningún `PlantTagRepository`.
* **Las FK vuelven a estar mapeadas**, así que la integridad de la asociación no depende solo de la restricción de la base de datos.

`@BatchSize(size = 50)` es lo que hace que esto sea compatible con el listado paginado: los tags se cargan `LAZY`, y al recorrer una página de 25 plantas Hibernate resuelve todas sus colecciones en una consulta adicional en lugar de en 25. Lo que **no** se puede hacer es meter `tagSet` en el `fetch` de la decisión 4: una colección en el join fetch obliga a Hibernate a paginar en memoria.

**No se adopta** la jerarquía `AggregateRoot`/`BaseEntity` del monorepo: aporta `entity_version`, `created_at` y `updated_at` en todas las tablas, y el esquema de T-01 no tiene esas columnas. Añadirlas es una migración y una decisión de modelo que no pide T-02.

### 4. Filtrado combinable con el patrón Specification

`GET /plants?tag=…&tag=…&location=…` compone dos filtros opcionales, y ambos pueden faltar. Se resuelve con el patrón **Specification** tal como está implementado en el contexto `socialnetwork` de `hub4fans/plataforma-monorepo/backend`:

* En `domain/specs`: un `object PlantSpecs` con una factoría por filtro, cada una devolviendo `null` cuando su filtro no aplica, de modo que componerlas con `.and()` ignore sin ceremonia las que no se han pedido.

  ```kotlin
  // com.cactify.domain.specs
  object PlantSpecs {
    fun byLocation(locationId: LocationId?): Specification<Plant> =
      Specification { root, _, cb ->
        locationId?.let { cb.equal(root.get<Location>("location").get<LocationId>("id"), it) }
      }

    /**
     * Trae especie y localización en la misma consulta (problema N+1). El `fetch` se omite en la
     * consulta de recuento que Spring Data lanza al paginar: un join fetch cuyo propietario no
     * está en el `SELECT` hace fallar esa consulta.
     */
    fun withSpeciesAndLocation(): Specification<Plant> =
      Specification { root, query, _ ->
        if (query!!.resultType != Long::class.java) {
          root.fetch<Plant, Species>("species")
          root.fetch<Plant, Location>("location")
        }
        null
      }

    /** Semántica AND: la planta debe tener *todos* los tags indicados. */
    fun byAllTags(tagIds: Set<TagId>): Specification<Plant> =
      Specification { root, query, cb ->
        if (tagIds.isEmpty()) return@Specification null
        val sub = query!!.subquery(Long::class.java)
        val other = sub.from(Plant::class.java)
        val tag = other.join<Plant, Tag>("tagSet")
        sub.select(cb.count(tag)).where(
          cb.equal(other, root),
          tag.get<TagId>("id").`in`(tagIds),
        )
        cb.equal(sub, tagIds.size.toLong())
      }
  }
  ```

* En `infrastructure`: `JpaPlantRepository` extiende además `JpaSpecificationExecutor<Plant>`, que aporta la ejecución de las especificaciones sin escribir nada.

  ```kotlin
  @Repository
  interface JpaPlantRepository :
    PlantRepository,
    JpaRepository<Plant, PlantId>,
    JpaSpecificationExecutor<Plant>
  ```

* En `application`: `PlantService` compone las especificaciones que correspondan a los filtros recibidos y llama a `findAll(spec)` del puerto.

  ```kotlin
  fun search(locationId: LocationId?, tagIds: Set<TagId>, pageable: Pageable): Page<Plant> =
    plantRepository.findAll(
      PlantSpecs
        .withSpeciesAndLocation()
        .and(PlantSpecs.byLocation(locationId))
        .and(PlantSpecs.byAllTags(tagIds)),
      pageable,
    )
  ```

El puerto `PlantRepository` declara `findAll(spec: Specification<Plant>?, pageable: Pageable): Page<Plant>`, igual que el `Repository<T, ID>` base del monorepo, pero sin introducir esa interfaz genérica (ver decisión 2). Frente a una consulta JPQL con parámetros anulables, el patrón mantiene cada filtro como una pieza nombrada y probable por separado, y hace que añadir un filtro en T-05/T-06 sea añadir una factoría, no reescribir un `@Query`.

La semántica **AND** de los tags —la planta debe tener *todos* los tags indicados— no se expresa con un `IN` sobre el join, que daría OR (es lo que hace `CreatorSpecs.byCategories` en el monorepo, donde OR es lo correcto). Se implementa con la subconsulta de recuento de arriba: plantas cuyo número de tags coincidentes con el conjunto pedido es igual al tamaño del conjunto.

**Consecuencia sobre ADR-006**: `Specification`, `Page` y `Pageable` son tipos de Spring Data, y el ADR-006 vigente prohíbe tipos de Spring en `domain`. Se **enmienda ADR-006** para admitir esos tres explícitamente, al mismo nivel que ya admite las anotaciones de `jakarta.persistence`: son el vocabulario con el que el dominio expresa *qué* quiere consultar y *en qué tramos*, no un acoplamiento a la infraestructura que lo resuelve. Es la misma excepción acotada que hace el monorepo de referencia en su `core.domain.Repository`. Se registra como tarea del change (7.4); el resto de la prohibición (`@Component`, `@Transactional`, tipos de Hibernate) sigue en pie.

Alternativas descartadas: una **consulta JPQL única** con parámetros anulables (`:locationId IS NULL OR …`) — cabe en un `@Query` y no toca ADR-006, pero mezcla todos los filtros en una cadena que hay que reescribir entera cada vez que se añade uno, y no es el patrón de la casa; un `INNER JOIN` por cada tag (SQL que crece con el número de filtros); filtrar en memoria tras traer el inventario (no escala y contradice el goal).

### 5. Manejo de errores centralizado con `@RestControllerAdvice`

Un único manejador global traduce a la forma de error uniforme que exige la spec:

| Situación | Excepción | HTTP |
|---|---|---|
| Cuerpo inválido (nickname en blanco, campo ausente) | `MethodArgumentNotValidException` | 400 |
| ID mal formado en ruta o query | `MethodArgumentTypeMismatchException` / `HttpMessageNotReadableException` | 400 |
| Referencia inexistente en el cuerpo (especie, localización, tag) | `InvalidReferenceException` (application) | 400 |
| Recurso de la ruta inexistente (`/plants/{id}`) | `PlantNotFoundException` (application) | 404 |
| Nombre de tag ya existente | `DuplicateTagNameException` (application) | 409 |

La distinción 400 vs 404 sigue la regla: lo que falta en la **ruta** es 404; lo que es inválido en el **cuerpo o los parámetros** es 400. El ticket admite ambos ("400/404"), y lo que exige es que nunca sea 500.

El cuerpo de error es un objeto estable `{ "status": 400, "error": "Bad Request", "message": "…", "path": "/plants" }`. Alternativa descartada: RFC 7807 `application/problem+json` — más estándar, pero añade ceremonia sin consumidor que la aproveche en el MVP.

### 6. Validación en dos niveles

* **Sintáctica**, en los DTOs de `web` con Bean Validation (`@field:NotBlank` sobre `nickname` y `name`): es validación del formato del mensaje HTTP, propia de la capa web.
* **Semántica**, en `application`: que la especie, la localización y los tags referenciados existan, y que el nombre de tag no esté duplicado. Requiere consultar el estado del sistema, así que no puede vivir en una anotación del DTO.

La base de datos sigue siendo la última red de seguridad (FK e índice único, ADR-002), pero el camino feliz nunca depende de que salte: se comprueba antes y se devuelve un error controlado.

### 7. Reemplazo completo del conjunto de tags

`PUT /plants/{id}/tags` es un reemplazo (semántica PUT), no un `PATCH` incremental: el servicio carga los tags pedidos, los pasa a `plant.updateTags(...)` y deja que Hibernate sincronice las filas de `plant_tag` dentro de la transacción (decisión 3c). La idempotencia y el vaciado con conjunto vacío salen de la semántica del `Set`, sin comparar conjuntos a mano. Esto hace la operación idempotente y permite vaciar los tags con una lista vacía, tal como pide la spec. Se validan **todos** los IDs de tag antes de tocar nada, para que un tag inválido no deje la planta a medio actualizar.

### 8. Tests de integración de API sobre MockMvc + Testcontainers

Los escenarios de las specs se escriben como tests `@SpringBootTest` con `MockMvc` sobre el `AbstractIntegrationTest` existente (PostgreSQL real, ADR-004). Se ejercita el ciclo HTTP completo —serialización, validación, manejador de errores, SQL— que es justo donde viven los riesgos de este change. Se añaden tests unitarios solo para la normalización de nombres de tag, que es lógica pura.

Cada test parte de un estado conocido: los datos semilla de `V2__seed.sql` sirven de catálogo base (especies, localizaciones, tags) y cada test crea las plantas que necesita, con rollback transaccional entre tests.

### 9. Paginación obligatoria en todos los listados, con límites configurables

Ningún endpoint de índice devuelve una colección sin límite: `GET /plants`, `GET /locations` y `GET /tags` devuelven siempre una página. Es una regla del API, no una optimización que se añade cuando el volumen aprieta: un listado sin límite es una consulta cuyo coste lo decide el dato, no el contrato, y quitarlo después es un cambio incompatible para el frontend.

* **Entrada**: el controller recibe `Pageable` resuelto por Spring (`?page=`, `?size=`), con `@SortDefault(sort = …)` fijando un orden estable —`createdAt` en plantas, `name` en los catálogos— para que la paginación sea determinista. Sin orden explícito, dos páginas consecutivas pueden repetir u omitir filas. El orden va en `@SortDefault` y no en `@PageableDefault`: este último fija también el tamaño de página (10 por defecto) y taparía el `default-page-size` configurado, que es justo lo que la spec exige aplicar en ausencia de `size`.
* **Salida**: un envelope `PageResponse<T>` en `application/dto` con `content`, `totalElements`, `totalPages`, `pageNumber` y `pageSize`, calcado del `core.application.PageResponse` del monorepo. Se define propio en lugar de serializar el `Page` de Spring directamente: la serialización de `PageImpl` no tiene contrato estable entre versiones y Spring Boot 3 ya avisa de ello.
* **Límites configurables**, vía las propiedades nativas de Spring, sin resolver nada a mano:

  ```yaml
  spring:
    data:
      web:
        pageable:
          default-page-size: ${PAGE_SIZE_DEFAULT:25}
          max-page-size: ${PAGE_SIZE_MAX:500}
  ```

  Por defecto 25 elementos por página y 500 como máximo; ambos sobreescribibles por variable de entorno, también desde `iac/local`.
* **Tamaño por encima del máximo**: Spring **recorta** al máximo configurado en lugar de rechazar la petición, y la respuesta declara el `pageSize` realmente aplicado. Se adopta ese comportamiento nativo: el cliente nunca recibe más de lo que el servidor admite y se entera por el propio envelope. Alternativa descartada: responder `400`, que obliga al frontend a conocer el límite de antemano para no romperse.

Alternativa descartada: **paginación por cursor**, más robusta frente a inserciones concurrentes durante el recorrido, pero exige un orden total sobre una clave opaca y no permite saltar a una página concreta; el TSID daría ese cursor natural, así que queda como evolución posible sin romper el envelope.

### 10. Enums de dominio con converter, como convención del proyecto

El modelo tiene un campo con forma de enumerado, `ai_recommendation.risk_level`, pero pertenece a T-04: **este change no escribe ningún enum**. Aun así se fija ahora la convención, calcada del monorepo, para que T-04 no la improvise:

```kotlin
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

@Converter(autoApply = true)
class RiskLevelConverter : AttributeConverter<RiskLevel, String> {
  override fun convertToDatabaseColumn(attribute: RiskLevel?): String? = attribute?.value
  override fun convertToEntityAttribute(dbData: String?): RiskLevel? = dbData?.let { RiskLevel(it) }
}
```

Tres propiedades que la hacen valer la pena frente a `@Enumerated(EnumType.STRING)`: el valor persistido es explícito y no depende del nombre de la constante (renombrar `Low` no corrompe la base de datos), la entrada se normaliza (`trim` + `lowercase`) y un valor desconocido falla en el acto en vez de convertirse en `null`.

La convención se documenta como **ADR-007** (tarea 7.5) en lugar de adelantar aquí el `RiskLevel`: escribir en T-02 un enum que nadie ejercita hasta T-04 es código muerto que envejece sin tests.

## Risks / Trade-offs

* **El tipado de identificadores reescribe las siete entidades de T-01, un change ya archivado** → Es el cambio de mayor superficie de este change, pero es mecánico y sin migración: la columna sigue siendo `BIGINT` con el mismo valor. La red de seguridad son los tests de T-01 (`EntityMappingTest`, `RelationshipMappingTest`, `DomainConstraintsTest`, `SeedDataTest`), que se ejecutan contra PostgreSQL real y fallan si algún converter no se aplica. Se hace al principio del change, antes de escribir nada encima.
* **El identificador embebido es un mapeo que solo la base de datos real desmiente** → Un embebido mal declarado (columna con otro nombre, o el tipo que no baja a `BIGINT`) no da error de compilación: aparece como fallo de validación de esquema en el arranque o como una comparación que nunca casa en una `Specification`. Se cubre con un test que persiste y recupera cada entidad por su id tipado, y con uno que comprueba que la columna sigue llevando el mismo valor numérico.
* **Desaparece la entidad `PlantTag` que entregó T-01** → La tabla no cambia, así que no hay migración ni riesgo sobre los datos, pero `RelationshipMappingTest` prueba hoy esa entidad y hay que reescribirlo para la asociación `@ManyToMany` antes de tocar `Plant`.
* **Apagar `open-in-view` convierte en error de arranque de consulta lo que antes se resolvía solo** → Es el efecto buscado, pero cualquier asociación `LAZY` que el DTO necesite y el servicio no haya cargado falla en tiempo de ejecución, no de compilación. Los tests de integración cubren el detalle y el listado, que son los dos sitios donde hay asociaciones que tocar.
* **`@BatchSize` es la única cosa que separa el listado paginado de un N+1 en los tags** → Sin él, una página de 25 plantas dispara 25 consultas de colección; con él, una. Es una anotación fácil de perder en un refactor y su ausencia no rompe ningún test funcional, solo el rendimiento. Se deja anotado en la propia entidad.
* **La reubicación de `SpeciesRepository` toca código de un change ya archivado** → El cambio es mecánico (el puerto se queda en `domain`, la interfaz pasa a extender también `JpaRepository` en `infrastructure`) y `EntityMappingTest` / `SeedDataTest` lo cubren; se hace al principio del change para que el resto se construya ya sobre el patrón correcto.
* **Serializar todos los `Long` como cadena es una regla global de Jackson** → Hoy los únicos `Long` del contrato son IDs, así que no hay falsos positivos; si en T-03 aparece un `Long` que sea una cantidad de verdad (p. ej. mililitros), la regla global habría que estrecharla a los campos de ID. Se documenta en el ADR propuesto en la decisión 3.
* **La subconsulta de recuento para el AND de tags es la parte menos obvia del change** → Se cubre con un test explícito de "planta con solo uno de los dos tags no aparece", que es el que detecta un OR mal implementado.
* **Con paginación, Spring Data ejecuta cada `Specification` dos veces: una para el contenido y otra para el `count`** → La subconsulta de `byAllTags` se comporta igual en ambas, pero un `root.fetch(...)` sin guardar hace fallar la de recuento (`query specified join fetching, but the owner of the fetched association was not present in the select list`). De ahí el guard por `query.resultType` de `withSpeciesAndLocation()`: es el único punto del change donde hay que acordarse, así que lleva su propio test —listar con `size` menor que el total, que obliga a Spring a lanzar el `count`— y el comentario que explica el porqué.
* **El `fetch` solo es seguro con asociaciones `*-to-one`** → `species` y `location` lo son, así que la paginación la resuelve la base de datos. Si en T-05/T-06 alguien añade al fetch una colección (los tags, por ejemplo), Hibernate pasaría a paginar en memoria (`HHH000104`) trayéndose el inventario entero; los tags del detalle se cargan por separado precisamente por eso.
* **Carga lazy y N+1 en listado y detalle** → `Plant` referencia `Location` y `Species` como `LAZY`; el listado del inventario provocaría una consulta por planta. Se resuelve con `fetch join` (o `@EntityGraph`) en las consultas del listado y del detalle, y se vigila con un test que compruebe que el detalle no dispara errores de sesión cerrada al mapear el DTO.
* **El envelope de paginación se convierte en contrato para T-03 y T-05 antes de tener consumidor real** → Si el dashboard pide algo distinto (scroll infinito, por ejemplo), habrá que añadir campos al envelope; añadir es compatible, cambiar la forma no. Se mitiga copiando un envelope ya probado en producción en el monorepo en lugar de inventar uno.
* **Devolver 200 con lista vacía al filtrar por un tag inexistente** (spec de listado) es indistinguible de "existe pero no tiene plantas" → Aceptado: el filtro no es un recurso, y el frontend ya conoce el catálogo válido; validar la existencia obligaría a dos consultas extra por listado para un beneficio nulo en el MVP.

## Migration Plan

No aplica: no hay migraciones de base de datos ni datos existentes en producción. El único paso de despliegue es que el backend ahora abre puerto HTTP en `:8080`, ya previsto en `iac/local/docker-compose`.

## Decisiones que se promocionan a ADR

Cuatro de las decisiones de este design son transversales —condicionan T-03 en adelante, no solo este change— así que salen del `design.md`, que se archiva, y pasan a `docs/adr/` (tareas 7.4 a 7.7):

| Decisión | Destino |
|---|---|
| 1, 2, 4, 9 (parte de dominio) | Enmienda de **ADR-006**: qué tipos de Spring Data admite `domain`, patrón de puertos y repositorios, y DTOs devueltos desde `application` con `open-in-view: false` |
| 10 | **ADR-007** — Enums de dominio y sus converters |
| 3 y 3b | **ADR-008** — Identificadores tipados y su representación en el API |
| 9 | **ADR-009** — Paginación obligatoria en los endpoints de índice |

La decisión 9 se reparte a propósito: la parte de "el `domain` puede hablar de `Page`/`Pageable`" es una regla de aislamiento y va en ADR-006; la parte de "ningún endpoint de índice devuelve una colección sin límite" es una regla del API y merece su propio ADR, porque es la que se incumple en silencio al escribir el primer `GET` de un change futuro.
