# Architecture Decision Records (ADR)

Registro de decisiones técnicas **transversales** del proyecto: las que aplican a todos los changes, no a uno concreto. Las decisiones específicas de un change viven en su `design.md` de OpenSpec y mueren archivadas con él; cuando una decisión de un design resulta ser global, se promociona aquí y el design pasa a referenciarla.

Los ADRs son inmutables: si una decisión cambia, se crea un ADR nuevo que supersede al anterior (y se anota en el antiguo).

## Formato

Cada ADR es un archivo `ADR-NNN-titulo-corto.md` creado a partir de [template.md](template.md), con las secciones: **Estado** (propuesto / aceptado / rechazado / supersedido por ADR-XXX), **Fecha**, **Origen**, **Contexto**, **Decisión**, **Alternativas consideradas** y **Consecuencias**.

## Índice

| ADR | Título | Estado |
|---|---|---|
| [ADR-000](ADR-000-registrar-decisiones-de-arquitectura.md) | Registrar las decisiones de arquitectura | Aceptado |
| [ADR-001](ADR-001-migraciones-flyway.md) | Migraciones con Flyway SQL versionado | Aceptado |
| [ADR-002](ADR-002-restricciones-en-base-de-datos.md) | Restricciones de dominio en la base de datos | Aceptado |
| [ADR-003](ADR-003-tsid-como-clave-primaria.md) | TSID como clave primaria | Aceptado |
| [ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md) | Testcontainers para tests de integración | Aceptado |
| [ADR-005](ADR-005-tdd.md) | Desarrollo dirigido por tests (TDD) | Aceptado |
| [ADR-006](ADR-006-aislamiento-del-dominio.md) | Aislamiento del dominio (DDD) | Aceptado (enmendado en T-02) |
| [ADR-007](ADR-007-enums-de-dominio.md) | Enums de dominio y sus converters | Aceptado |
| [ADR-008](ADR-008-identificadores-tipados.md) | Identificadores tipados y su representación en el API | Aceptado |
| [ADR-009](ADR-009-paginacion-obligatoria.md) | Paginación obligatoria en los endpoints de índice | Aceptado |
