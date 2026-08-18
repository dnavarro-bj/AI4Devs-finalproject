# Tasks: modelo-datos

Orden test-first según [ADR-005](../../../docs/adr/ADR-005-tdd.md): cada bloque empieza por los tests de sus escenarios (rojo) y termina con la implementación que los pone en verde.

## 1. Bootstrap del backend

- [x] 1.1 Crear el proyecto Gradle (Kotlin DSL) de Spring Boot 3 en `backend/` con Kotlin JVM, plugin `kotlin-jpa`, y dependencias `spring-boot-starter-data-jpa`, `flyway-core` + `flyway-database-postgresql`, driver PostgreSQL, `io.hypersistence:hypersistence-tsid` y Testcontainers (PostgreSQL + JUnit 5)
- [x] 1.2 Configurar `application.yml` con datasource por variables de entorno, `ddl-auto=validate` y Flyway habilitado
- [x] 1.3 Montar la infraestructura de test: contenedor PostgreSQL con Testcontainers reutilizado entre clases y arranque del contexto Spring con Flyway
- [x] 1.4 Ajustar `backend/Dockerfile` e `iac/local/` (compose/`.env.example`) para que el backend compile y arranque ejecutando las migraciones contra el PostgreSQL del compose

## 2. Esquema de tablas (escenarios: migraciones, integridad referencial, campos obligatorios)

- [x] 2.1 🔴 Test: las migraciones se ejecutan sin error sobre una base limpia y existen las 8 tablas con sus claves primarias
- [x] 2.2 🔴 Tests: violaciones de FK (planta con especie inexistente; lectura con planta inexistente) y de `NOT NULL` (especie sin nombre científico; lectura sin fecha)
- [x] 2.3 🟢 Escribir `V1__schema.sql` con las 8 tablas, claves primarias TSID `bigint` (compuesta en `plant_tag`), claves foráneas y `NOT NULL` en campos obligatorios, hasta poner 2.1 y 2.2 en verde

## 3. Restricciones de dominio (escenarios: soil_mix y unicidad de tags)

- [x] 3.1 🔴 Tests: `CHECK` de `soil_mix` (porcentajes que no suman 100; rango de pH invertido)
- [x] 3.2 🔴 Test: unicidad de tag insensible a mayúsculas/espacios (`globular` vs ` Globular `)
- [x] 3.3 🟢 Añadir a `V1__schema.sql` los `CHECK` de `soil_mix` y el índice único funcional `lower(trim(name))` en `tag`, hasta poner 3.1 y 3.2 en verde

## 4. Datos semilla (escenarios: especie completa e idempotencia)

- [x] 4.1 🔴 Tests: tras migrar existe al menos una especie completa (rangos + mezcla asociada) y las seeds no se duplican tras re-arranque
- [x] 4.2 🟢 Escribir `V2__seed.sql` con TSIDs fijos y literales (2-3 mezclas, 2-3 especies completas, 2-3 localizaciones, 3+ tags), hasta poner 4.1 en verde

## 5. Entidades JPA

- [x] 5.1 🔴 Test: el contexto Spring arranca con `ddl-auto=validate` contra el esquema migrado (falla mientras no existan entidades correctamente mapeadas)
- [x] 5.2 🟢 Crear las entidades Kotlin `SoilMix`, `Species`, `Location`, `Plant`, `Tag`, `PlantTag` (clave compuesta), `CareRecord` y `AIRecommendation` con id TSID generado en la entidad (sin `@GeneratedValue`), y los repositorios mínimos para los tests (al menos `SpeciesRepository`), hasta poner 5.1 en verde. Solo anotaciones Jakarta Persistence, nada de Spring/Hibernate en la lógica de las entidades ([ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md)); T-01 no tiene capa `application`/`web`, así que la regla de acceso solo vía servicios de aplicación se hereda como restricción para T-02, no se testea aquí

## 6. Cierre

- [x] 6.1 Verificar arranque completo: `docker compose up --build` levanta base de datos y backend sin errores
- [x] 6.2 Actualizar `backend/README.md` (o crearlo) con cómo ejecutar tests y migraciones, y nota de que Testcontainers requiere Docker
- [x] 6.3 Ejecutar `openspec validate modelo-datos --strict` y dejar toda la suite en verde
