# ADR-004 - Testcontainers para tests de integración

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Origen:** change `modelo-datos` (T-01)

## Contexto

Los tests de integración de persistencia necesitan una base de datos. La opción clásica ligera es una base embebida (H2) en modo compatibilidad PostgreSQL; la alternativa es levantar un PostgreSQL real por test con Testcontainers.

## Decisión

Los tests de integración corren contra **PostgreSQL real con Testcontainers**. H2 no reproduce fielmente la sintaxis específica de PostgreSQL de la que depende el esquema (restricciones `CHECK`, índices funcionales como `lower(trim(...))`, tipos), y un test que pasa en H2 puede fallar en producción.

## Alternativas consideradas

* **H2 en modo PostgreSQL**: arranque más rápido y sin Docker, pero compatibilidad parcial; descartado porque las restricciones del [ADR-002](ADR-002-restricciones-en-base-de-datos.md) son justo lo que H2 no cubre bien.
* **Base de datos compartida de desarrollo**: tests no aislados ni reproducibles; descartado.

## Consecuencias

* Ejecutar los tests requiere Docker corriendo (mismo requisito que ya impone `iac/local/`).
* Los tests validan el esquema real, incluidas migraciones Flyway completas.
* Arranque de tests algo más lento; se mitiga reutilizando el contenedor entre clases de test.
