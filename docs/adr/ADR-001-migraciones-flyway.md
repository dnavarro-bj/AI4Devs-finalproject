# ADR-001 - Migraciones con Flyway SQL versionado

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Origen:** change `modelo-datos` (T-01)

## Contexto

El esquema de PostgreSQL debe evolucionar de forma controlada y reproducible en todos los entornos (local con Docker Compose, CI con Testcontainers). El ORM (Hibernate) es capaz de generar DDL automáticamente, pero ese DDL no queda versionado ni es revisable.

## Decisión

El esquema se gestiona al 100% con **Flyway y migraciones SQL versionadas** (`V1__...sql`, `V2__...sql`) ejecutadas al arrancar la aplicación. Hibernate queda en `ddl-auto=validate`: nunca genera ni altera el esquema, solo verifica que las entidades JPA coinciden con él.

## Alternativas consideradas

* **Liquibase**: equivalente funcional, pero su formato XML/YAML es menos legible en revisión de PR que SQL plano; Flyway es el estándar de facto en Spring Boot.
* **`ddl-auto=update`**: sin historial, no reproducible, peligroso ante renombrados; descartado.

## Consecuencias

* Todo cambio de esquema es una migración nueva revisable en PR; nunca se edita una migración ya aplicada.
* `ddl-auto=validate` detecta en el arranque cualquier deriva entre entidades y esquema.
* Los datos semilla también se cargan como migraciones versionadas, lo que les da idempotencia gratis (tabla de historial de Flyway).
