# Design: modelo-datos

## Context

El backend es hoy solo un Dockerfile: no existe proyecto Gradle, ni framework de migraciones, ni entidades. Este change debe dejar el esquema de la spec `data-model` funcionando sobre el PostgreSQL del docker-compose de `iac/local/`. Motivación en [proposal.md](proposal.md); requisitos en [specs/data-model/spec.md](specs/data-model/spec.md).

Aplican las convenciones transversales ya decididas en los ADRs del proyecto ([docs/adr/](../../../docs/adr/README.md)):

* [ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md): migraciones Flyway SQL versionadas, `ddl-auto=validate`.
* [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md): invariantes de dominio también como restricciones en base de datos.
* [ADR-003](../../../docs/adr/ADR-003-tsid-como-clave-primaria.md): claves primarias TSID (`bigint`, generado en aplicación con `hypersistence-tsid`).
* [ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md): tests de integración contra PostgreSQL real con Testcontainers.

## Goals / Non-Goals

**Goals:**

* Proyecto Spring Boot 3 + Kotlin mínimo pero con la estructura definitiva (paquetes, build, configuración) para que T-02+ solo añadan código.
* Materializar el esquema de la spec cumpliendo ADR-001…ADR-004.

**Non-Goals:**

* Capa web/REST (ni `spring-boot-starter-web`): se añade en T-02.
* Validación Bean Validation en DTOs (llegará con las APIs, según ADR-002).
* Estrategia de despliegue más allá del docker-compose local.

## Decisions

Decisiones específicas de este change (las transversales están en los ADRs referenciados en Context):

1. **Concreción de ADR-002 en este esquema**: `CHECK` en `soil_mix` para `organic_percentage + mineral_percentage = 100` y `ph_min <= ph_max`; `NOT NULL` en `species.scientific_name`, `plant.species_id` y `care_record.recorded_at`; unicidad de tags con índice funcional `UNIQUE (lower(trim(name)))`.
2. **Seeds como migración versionada** (`V2__seed.sql`) con TSIDs fijos y literales, no generados. Flyway garantiza ejecución única (escenario de idempotencia) y los ids estables facilitan los tests E2E de T-07. Consecuencia directa de ADR-003: la base de datos no puede generar TSIDs, así que las seeds los llevan explícitos.
3. **Entidades JPA en Kotlin con plugin `kotlin-jpa`** (constructores sin argumentos generados) y clases normales, no `data class` (problemas conocidos de `equals`/`hashCode` con proxies de Hibernate). Nombres de columna en snake_case vía la naming strategy por defecto de Spring Boot. El id TSID se genera en la entidad al construirla (`TSID.Factory.getTsid()` como default), sin `@GeneratedValue`.

## Risks / Trade-offs

* [Incluir el bootstrap del proyecto engorda el diff del ticket] → Mantener el bootstrap en tareas separadas y mínimas (sin web, sin lógica) para que la revisión distinga esqueleto de esquema.
* [Decisión pendiente de overrides por ejemplar (0.7) podría forzar una migración futura] → Aceptado a propósito: el modelo se amplía con una migración nueva cuando se decida; no se reserva sitio especulativo.

## Migration Plan

Solo local: `docker compose up --build` levanta PostgreSQL y el backend ejecuta Flyway al arrancar. Rollback en desarrollo = recrear el volumen de la base de datos; no hay datos productivos.

## Open Questions

Ninguna — la decisión sobre overrides de cuidados por ejemplar (0.7) queda explícitamente fuera de alcance y no afecta a este esquema.
