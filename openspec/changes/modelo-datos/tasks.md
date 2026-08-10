# Tasks: modelo-datos

## 1. Bootstrap del backend

- [ ] 1.1 Crear el proyecto Gradle (Kotlin DSL) de Spring Boot 3 en `backend/` con Kotlin JVM, plugin `kotlin-jpa`, y dependencias `spring-boot-starter-data-jpa`, `flyway-core` + `flyway-database-postgresql`, driver PostgreSQL y `io.hypersistence:hypersistence-tsid`
- [ ] 1.2 Configurar `application.yml` con datasource por variables de entorno, `ddl-auto=validate` y Flyway habilitado
- [ ] 1.3 Ajustar `backend/Dockerfile` e `iac/local/` (compose/`.env.example`) para que el backend compile y arranque ejecutando las migraciones contra el PostgreSQL del compose
- [ ] 1.4 Verificar arranque limpio: `docker compose up --build` levanta base de datos y backend sin errores

## 2. Migración de esquema

- [ ] 2.1 Escribir `V1__schema.sql` con las 8 tablas, claves primarias TSID `bigint` (compuesta en `plant_tag`), claves foráneas y `NOT NULL` en campos obligatorios
- [ ] 2.2 Añadir en `V1__schema.sql` los `CHECK` de `soil_mix` (suma de porcentajes = 100, `ph_min <= ph_max`) y el índice único funcional `lower(trim(name))` en `tag`
- [ ] 2.3 Escribir `V2__seed.sql` con TSIDs fijos y literales: 2-3 mezclas de tierra, 2-3 especies completas (rangos + mezcla asociada), 2-3 localizaciones y 3+ tags

## 3. Entidades JPA

- [ ] 3.1 Crear las entidades Kotlin `SoilMix`, `Species`, `Location`, `Plant`, `Tag`, `PlantTag` (clave compuesta), `CareRecord` y `AIRecommendation` mapeadas al esquema, con id TSID generado en la entidad (sin `@GeneratedValue`)
- [ ] 3.2 Crear los repositorios Spring Data mínimos necesarios para los tests (al menos `SpeciesRepository`)
- [ ] 3.3 Verificar que Hibernate valida el mapeo contra el esquema real (`ddl-auto=validate`) al arrancar el contexto

## 4. Tests de integración (Testcontainers + PostgreSQL)

- [ ] 4.1 Configurar la infraestructura de test: Testcontainers con PostgreSQL y arranque del contexto Spring con Flyway
- [ ] 4.2 Test: las migraciones se ejecutan sin error sobre una base limpia y existen las 8 tablas
- [ ] 4.3 Test: violaciones de FK (planta con especie inexistente; lectura con planta inexistente) y de `NOT NULL` (especie sin nombre científico; lectura sin fecha)
- [ ] 4.4 Test: `CHECK` de `soil_mix` (porcentajes que no suman 100; rango de pH invertido)
- [ ] 4.5 Test: unicidad de tag insensible a mayúsculas/espacios (`globular` vs ` Globular `)
- [ ] 4.6 Test: datos semilla presentes tras migrar (especie completa con rangos y mezcla) y no duplicados tras re-arranque

## 5. Cierre

- [ ] 5.1 Actualizar `backend/README.md` (o crearlo) con cómo ejecutar tests y migraciones, y nota de que Testcontainers requiere Docker
- [ ] 5.2 Ejecutar `openspec validate modelo-datos --strict` y dejar todos los tests en verde
