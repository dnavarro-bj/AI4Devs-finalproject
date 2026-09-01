# ADR-006 - Aislamiento del dominio (DDD)

**Estado:** Aceptado
**Fecha:** 2026-08-17
**Enmendado:** 2026-09-01 — ver [Enmienda (T-02)](#enmienda-t-02-2026-09-01)
**Origen:** revisión del design de `modelo-datos` (T-01)

## Contexto

El README (§2.1) describe una arquitectura en capas típica de Spring Boot (controller → service → repository), pensada como capas técnicas de acceso a datos. El design de `modelo-datos` va un paso más allá y hace que las entidades JPA (`@Entity`, naming strategy de Hibernate, TSID generado en el constructor) sean directamente el modelo de dominio: no hay separación entre "cómo se persiste" y "qué es una `Plant`".

Falta decidir si el dominio (entidades, invariantes, reglas de negocio) queda aislado de las demás capas —persistencia, web, IA— o si, como hasta ahora, se apoya directamente en el framework.

## Decisión

Aplicamos **DDD con dominio aislado, en versión laxa**: el dominio solo se accede desde fuera a través de **servicios de la capa de aplicación** (application services); ninguna otra capa (web, persistencia) lo manipula directamente. Pero el paquete de dominio sí puede llevar anotaciones de **Jakarta Persistence** (`jakarta.persistence.*`: `@Entity`, `@Id`, `@Column`...), por ser un estándar (JSR 338) y no un framework concreto. Lo que no se permite en el dominio son anotaciones o tipos específicos de **Spring** ni de **Hibernate** (p. ej. nada de `@Component`, `@Transactional`, ni naming strategies o proxies de Hibernate filtrando en la lógica de negocio).

En la práctica, esto mantiene vigente la decisión 3 del design de `modelo-datos`: las entidades JPA (`@Entity` en Kotlin, TSID generado en el constructor) **son** el modelo de dominio, sin una clase de persistencia separada ni mapeo dominio↔persistencia.

Capas y dependencias permitidas (de fuera hacia dentro; el dominio no conoce a nadie):

* **`domain`**: entidades JPA (Jakarta Persistence) y objetos de valor con sus invariantes (p. ej. que `soil_mix` sume 100), interfaces de repositorio (puertos) que expresan qué necesita el dominio. Sin anotaciones de Spring ni de Hibernate.
* **`application`**: casos de uso/servicios que orquestan el dominio (cargar, validar, persistir vía los puertos). Es el único punto de entrada al dominio desde fuera.
* **`infrastructure`**: implementaciones de los puertos de repositorio con Spring Data JPA sobre las propias entidades de `domain`, y cualquier otro adaptador técnico (proveedor de IA, etc.).
* **`web`** (o `interfaces`): controllers REST, que solo llaman a servicios de `application`, nunca directamente a `domain` ni a `infrastructure`.

## Alternativas consideradas

* **Dominio sin ninguna anotación de framework, con modelo de persistencia separado**: aislamiento más estricto (el dominio se testea sin ningún classpath de persistencia), pero añade una capa de mapeo dominio↔persistencia que no compensa para el tamaño del MVP; descartada por ahora, queda como evolución posible si el dominio crece.
* **Entidades JPA accesibles desde cualquier capa (sin regla de acceso vía `application`)**: es lo que asumía implícitamente el design de `modelo-datos` hasta ahora; se descarta porque permite que un controller o un repositorio salten la lógica de negocio.
* **Arquitectura hexagonal completa con puertos explícitos para todo (incl. IA)**: correcta pero sobredimensionada para el alcance y tiempo del MVP (~30h); se aplica el aislamiento donde importa (regla de acceso al dominio) sin formalizar puertos para cada integración externa.

## Consecuencias

* El design de `modelo-datos` (T-01) mantiene su decisión 3 (entidades JPA = dominio) sin cambios; solo debe añadir que ningún acceso a esas entidades ocurre fuera de servicios de `application` (relevante sobre todo para T-02 en adelante, ya que T-01 no incluye capa web).
* Las reglas de negocio conviven en la misma clase que las anotaciones de persistencia; se acepta ese acoplamiento a Jakarta Persistence (no a Spring/Hibernate) a cambio de no duplicar modelo y mapeo.
* Los tests de invariantes de dominio pueden seguir siendo unitarios (no requieren Spring, aunque las anotaciones JPA estén presentes); [ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md) sigue aplicando para los tests que sí ejercitan la persistencia real.
* Condiciona la estructura de paquetes y la disciplina de acceso de todos los changes futuros (T-02 en adelante), no solo T-01: los controllers de T-02/T-03 no podrán inyectar repositorios de `domain` directamente, solo servicios de `application`.

## Enmienda (T-02, 2026-09-01)

**Origen:** change `api-crud-plantas` (T-02), decisiones 1, 2, 4 y 9 del design.

T-01 no tenía capa web, así que la disciplina de arriba se escribió sin haberla ejercitado. Al implementar T-02 —los primeros controllers, servicios y repositorios reales— tres puntos quedaron por concretar. Se concretan aquí, sin tocar nada de lo decidido más arriba.

### 1. `domain` admite `Specification`, `Page` y `Pageable` de Spring Data

La regla original prohíbe cualquier tipo de Spring en `domain`. Se admiten **esos tres y solo esos tres**, al mismo nivel que ya se admiten las anotaciones de `jakarta.persistence`:

* `Specification` es el vocabulario con el que el dominio expresa **qué** quiere consultar (`PlantSpecs.byLocation`, `PlantSpecs.byAllTags`), no un acoplamiento al motor que lo resuelve. Mantener cada filtro como una pieza nombrada y probable por separado es lo que permite añadir un filtro en un change futuro sin reescribir una consulta entera.
* `Page` y `Pageable` son el vocabulario con el que expresa **en qué tramos**, y son la forma en que la regla de [ADR-009](ADR-009-paginacion-obligatoria.md) llega hasta el puerto: si el puerto no puede hablar de páginas, la única firma posible es el `findAll()` sin límite que ADR-009 prohíbe.

Lo demás sigue prohibido en `domain`: `@Component`, `@Service`, `@Transactional`, `@Repository`, los repositorios de Spring Data y los tipos y anotaciones de Hibernate — con la excepción, ya en uso, de las anotaciones de mapeo que no tienen equivalente en Jakarta Persistence (`@BatchSize`, `@Generated`), que son configuración de persistencia sobre la propia entidad.

### 2. Puerto en `domain/repos` + interfaz Spring Data en `infrastructure/persistence`, sin clase adaptadora

El ADR decía que `domain` declara los puertos y que `infrastructure` los implementa, pero no cómo. El patrón es:

```kotlin
// com.cactify.domain.repos — interfaz Kotlin pura
interface TagRepository {
  fun save(tag: Tag): Tag
  fun findOneById(id: TagId): Tag?
  fun findAll(pageable: Pageable): Page<Tag>
  fun findByNormalizedName(name: String): Tag?
}

// com.cactify.infrastructure.persistence — una sola interfaz, sin implementación escrita a mano
@Repository
interface JpaTagRepository : TagRepository, JpaRepository<Tag, TagId> {
  @Query("SELECT t FROM Tag t WHERE lower(trim(t.name)) = :name")
  override fun findByNormalizedName(name: String): Tag?
}
```

* **No hay clase adaptadora ni delegación manual**: la única pieza escrita a mano es el puerto. Spring Data genera la implementación.
* `application` inyecta siempre el tipo del **puerto**, nunca la interfaz Spring Data, de modo que ninguna capa por encima ve tipos de Spring Data.
* El puerto declara el **contrato mínimo** que el dominio necesita, no la superficie completa de `JpaRepository`. En particular no expone el `findAll()` sin paginar.
* La búsqueda por identificador se llama **`findOneById`** y devuelve el tipo anulable de Kotlin: `findById` está tomado por `JpaRepository`, que lo devuelve envuelto en `Optional`, y dos métodos con el mismo nombre y parámetros no pueden diferir solo en el tipo de retorno.

Esto corrige el `SpeciesRepository` de T-01, que vivía en `domain` extendiendo `JpaRepository`.

### 3. Los servicios de `application` devuelven DTOs, con `open-in-view: false`

Ninguna entidad de dominio cruza hacia `web`. Los DTOs de respuesta viven en `application/dto` y los servicios los devuelven ya montados; el controller escribe el DTO sin más trabajo que el HTTP. Los cuerpos de petición sí viven en `web` —son la forma del mensaje HTTP, no del caso de uso— y el controller los traduce a parámetros del servicio.

No es solo disciplina de capas: es lo que sitúa el mapeo **dentro** de la frontera transaccional. Con `spring.jpa.open-in-view` activo (el valor por defecto de Spring Boot), un controller que mapeara entidades tocaría asociaciones `LAZY` con la sesión aún abierta y dispararía consultas que nadie ve. Se apaga explícitamente:

```yaml
spring:
  jpa:
    open-in-view: false
```

Con el mapeo dentro del servicio, todo lo que la respuesta necesita se carga antes de salir de la transacción, y un `LazyInitializationException` pasa a ser lo que debe ser: un fallo ruidoso que señala una consulta mal planteada, no un N+1 silencioso servido desde la capa web.

### Consecuencias de la enmienda

* La estructura de paquetes queda fijada para los changes siguientes: `domain` (entidades, `repos`, `specs`), `application` (servicios y `dto`), `infrastructure/persistence` (interfaces Spring Data y `converters`) y `web` (controllers, cuerpos de petición y manejador de errores).
* Apagar `open-in-view` convierte en error de ejecución lo que antes se resolvía solo; es el efecto buscado, y lo cubren los tests de integración del listado y del detalle.
* La excepción para `Specification`, `Page` y `Pageable` es cerrada: ampliarla exige otra enmienda o un ADR que la supersede.
