# Proposal: modelo-datos

**Ticket:** [T-01 - Modelo de datos de plantas y lecturas](../../../docs/tickets/T-01-modelo-de-datos-de-plantas-y-lecturas.md)
**Historias relacionadas:** [0.1](../../../docs/user-stories/0.1-registrar-cactus.md), [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md), [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md), [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md), [0.9](../../../docs/user-stories/0.9-registrar-localizacion.md), [0.10](../../../docs/user-stories/0.10-etiquetar-cactus-con-tags.md)

## Why

Todo el MVP de Cactify (CRUD de plantas, lecturas, recomendaciones de IA, dashboard) depende de que exista el esquema de base de datos con el catálogo de especies, el inventario de plantas y las lecturas de cuidado. Es el primer ticket del MVP y bloquea a T-02…T-07; el backend aún no tiene código de aplicación.

## What Changes

* Migraciones PostgreSQL con las 8 tablas del modelo: `soil_mix`, `species`, `location`, `plant`, `tag`, `plant_tag`, `care_record`, `ai_recommendation`.
* Claves primarias TSID (`bigint` ordenado por tiempo, generado en aplicación — ver [ADR-003](../../../docs/adr/ADR-003-tsid-como-clave-primaria.md)), claves foráneas e integridad referencial según el [diagrama del modelo de datos](../../../docs/diagramas/modelo-datos.md).
* Restricciones de dominio: porcentajes de `soil_mix` suman 100, `ph_min <= ph_max`, `NOT NULL` en campos obligatorios, `UNIQUE` en `tag.name` (normalización insensible a mayúsculas/espacios a nivel de aplicación).
* Datos semilla para poder probar el flujo E2E: 2-3 especies, 2-3 mezclas de tierra, 2-3 localizaciones y tags de ejemplo.
* Entidades JPA en Kotlin correspondientes a las tablas, como base para las APIs de T-02/T-03.
* **Asunción registrada**: como el backend no tiene todavía proyecto de aplicación, este change incluye el bootstrap mínimo del proyecto Spring Boot 3 (Gradle + Kotlin, Spring Data JPA, Flyway, conexión a PostgreSQL) imprescindible para ejecutar migraciones y definir entidades. No incluye ningún endpoint HTTP.

## Capabilities

### New Capabilities

- `data-model`: esquema de base de datos del MVP (tablas, claves, restricciones de integridad y de dominio), datos semilla y entidades JPA que lo representan.

### Modified Capabilities

Ninguna (no existen specs previas; es el primer change del proyecto).

## Non-goals

* Endpoints HTTP / API REST (T-02 y T-03).
* Lógica de recomendaciones con IA (T-04).
* Frontend (T-05).
* Campos de override individual de cuidados por ejemplar (pendiente de decisión de producto, historia [0.7](../../../docs/user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md)); el esquema no los incluye.
* Jerarquía de localizaciones (catálogo plano en el MVP, ver [F.1](../../../docs/user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md)).

## Impact

* `backend/`: pasa de contener solo un Dockerfile a tener el proyecto Spring Boot (build Gradle, configuración, migraciones Flyway, entidades JPA y sus tests).
* `iac/local/`: puede requerir ajustes menores del docker-compose/variables de entorno para que el backend ejecute migraciones al arrancar.
* Nuevas dependencias: Spring Boot 3, Spring Data JPA, Flyway, driver PostgreSQL, Kotlin JVM.
* `frontend/`: se adelantó el bootstrap de un proyecto Nuxt 4 + Vue 3 + Pinia (yarn) fuera del alcance de este change — pertenece a T-05 (ver Non-goals). Se deja documentado aquí para que no se confunda con trabajo de `data-model`.
