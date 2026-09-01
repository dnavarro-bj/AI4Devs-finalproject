# ADR-003 - TSID como clave primaria

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Origen:** change `modelo-datos` (T-01)
**Revisado parcialmente por:** [ADR-008](ADR-008-identificadores-tipados.md) — la representación en el API es cadena decimal, no base32; el resto sigue vigente

## Contexto

La documentación inicial del modelo (README §3, diagrama, ticket T-01) proponía UUID como clave primaria. Los UUID v4 aleatorios fragmentan los índices B-tree (inserciones en posiciones aleatorias), ocupan 16 bytes y no son ordenables por tiempo de creación.

## Decisión

Las claves primarias son **TSID** (Time-Sorted ID): entero de 64 bits ordenado por tiempo, almacenado como `bigint` en PostgreSQL y **generado en la aplicación** con la librería `io.hypersistence:hypersistence-tsid`. En las APIs se expondrá en su representación canónica de cadena (Crockford base32, 13 caracteres). <!-- Revisado por ADR-008: en el API los identificadores viajan como cadena decimal, no base32. -->

Este ADR supersede la elección de UUID registrada en la documentación inicial; README y diagrama quedan actualizados, el ticket T-01 se conserva tal como se redactó.

## Alternativas consideradas

* **UUID v4 aleatorio**: portable y sin coordinación, pero 16 bytes, no ordenable e índices fragmentados.
* **UUID v7 (ordenado por tiempo)**: resuelve la fragmentación pero sigue ocupando 16 bytes y el soporte nativo en PostgreSQL/JPA aún requiere extensiones o librerías adicionales.
* **`BIGSERIAL` autoincremental**: compacto y ordenado, pero secuencial-adivinable, acoplado a la base de datos (el id no existe hasta insertar) e inviable si algún día hay generación distribuida.

## Consecuencias

* Índices más compactos (8 bytes) y con buena localidad de inserción; los ids ordenan cronológicamente.
* El id se conoce antes de persistir (se genera en aplicación), lo que simplifica tests y creación de agregados.
* La base de datos no puede generar TSIDs por sí sola: toda inserción (incluidas seeds y scripts manuales) debe aportar el id explícito.
* El generador necesita un identificador de nodo si algún día hay múltiples instancias; en el MVP (instancia única) se usa la configuración por defecto.
