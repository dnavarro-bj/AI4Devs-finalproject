# ADR-002 - Restricciones de dominio en la base de datos

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Origen:** change `modelo-datos` (T-01)

## Contexto

Varias reglas de dominio son invariantes de los datos (porcentajes de una mezcla de tierra que suman 100, rangos de pH coherentes, unicidad de nombres de tag). Pueden validarse solo en la capa de aplicación o también en la base de datos.

## Decisión

Las invariantes de datos se imponen **también en la base de datos** mediante `CHECK`, `NOT NULL`, `UNIQUE` (incluidos índices funcionales) y claves foráneas. La capa de aplicación añade además su propia validación (Bean Validation en las APIs) para producir errores amigables.

## Alternativas consideradas

* **Solo validación en aplicación**: deja pasar datos inválidos insertados por otros caminos (seeds, scripts, futuros consumidores); descartado.
* **Solo validación en base de datos**: los errores de constraint son crípticos para el usuario final; por eso se duplica la validación en la capa de API.

## Consecuencias

* La base de datos es la última línea de defensa: los invariantes se cumplen aunque una escritura no pase por la aplicación.
* Algunas restricciones usan sintaxis específica de PostgreSQL (p. ej. índices funcionales), lo que condiciona que los tests corran contra PostgreSQL real (ver [ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md)).
* La validación existe en dos capas y debe mantenerse alineada.
