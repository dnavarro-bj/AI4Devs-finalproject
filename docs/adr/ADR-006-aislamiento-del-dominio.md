# ADR-006 - Aislamiento del dominio (DDD)

**Estado:** Aceptado
**Fecha:** 2026-08-17
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
