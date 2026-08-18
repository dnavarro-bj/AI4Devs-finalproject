# Backend

Kotlin + Spring Boot 3. En este change (`modelo-datos`, T-01) solo cubre esquema de base de datos (migraciones Flyway), datos semilla y entidades JPA — todavía no hay capa web (llega en T-02).

## Tests

```bash
./gradlew test
```

Los tests de integración levantan un PostgreSQL real con Testcontainers ([ADR-004](../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)), reutilizado entre clases de test. **Requieren Docker en ejecución.**

## Migraciones

Migraciones Flyway versionadas en `src/main/resources/db/migration/` ([ADR-001](../docs/adr/ADR-001-migraciones-flyway.md)):

* `V1__schema.sql`: las 8 tablas del modelo, claves foráneas, `NOT NULL` y restricciones de dominio (`CHECK`, unicidad de tags).
* `V2__seed.sql`: datos semilla con TSIDs fijos y literales para poder probar el flujo E2E sin cargar catálogos manualmente.

Se ejecutan automáticamente al arrancar la aplicación (`spring.flyway.enabled=true`); `ddl-auto=validate` verifica que las entidades JPA coincidan con el esquema migrado, no lo genera.

## Arrancar en local

Ver [iac/local/README.md](../iac/local/README.md) para levantar el stack completo con Docker Compose.
