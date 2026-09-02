# Proposal: fechas-y-auditoria

**Ticket:** ninguno. Este change **no nace de un ticket ni de una historia de usuario**, sino de una decisión técnica transversal tomada al preparar T-03: es deuda de base que conviene saldar antes de que crezca el número de entidades y de endpoints que la arrastran. La convención de tickets del proyecto queda anotada como excepción consciente, y el resultado se promociona a ADR para que los changes siguientes la hereden.

**Origen:** revisión del design de [`api-lecturas-cultivo`](../api-lecturas-cultivo/design.md) (T-03), decisión 2 — al abrir la fecha de una lectura al cliente quedó a la vista que el tipo elegido en T-01 promete algo que el esquema no cumple.

## Why

Dos problemas que hoy son pequeños y que cada change nuevo hace más caros:

1. **El tipo de las fechas miente.** El dominio usa `OffsetDateTime` sobre columnas `TIMESTAMPTZ`, y **PostgreSQL no guarda el desplazamiento**: convierte a un instante y, al leer, aplica el de la sesión. Verificado insertando `08:00+02:00` y `08:00-05:00` y recuperando ambas con el offset de la sesión, no con el suyo. Como `application.yml` tampoco fija la zona de la sesión JDBC, **el mismo instante se serializa distinto según dónde corra el backend**: `2026-09-01T18:05:40Z` en el contenedor y `2026-09-01T20:05:40+02:00` en una máquina en CEST. El contrato del API depende de la infraestructura.
2. **No se sabe cuándo cambió una fila.** Solo `plant` y `ai_recommendation` tienen `created_at`; ninguna tabla tiene `updated_at`. Sin eso no hay forma de ordenar por antigüedad un catálogo, ni de depurar "esto ayer no estaba así", ni de resolver un conflicto de sincronización cuando llegue la app móvil de [F.5](../../../docs/user-stories/F.5-app-movil-sincronizacion-sensores-bluetooth.md).

## What Changes

* **Todas las fechas del dominio pasan a `Instant`**, sobre columnas `TIMESTAMPTZ`. Es el tipo que dice la verdad sobre lo que la columna guarda, y hace la salida JSON determinista: siempre en UTC, corra donde corra el servidor. Alcanza a `Plant.createdAt`, `AIRecommendation.createdAt`, `CareRecord.recordedAt` y a los DTOs de plantas que ya exponen `createdAt`.
* **Se fija `hibernate.jdbc.time_zone: UTC`**, de modo que la sesión JDBC no dependa de la zona de la máquina.
* **Las ocho tablas ganan `created_at` y `updated_at`**, ambas `TIMESTAMPTZ NOT NULL DEFAULT now()`.
* **Nueva jerarquía `AbstractEntity<K>` en el dominio**, un `@MappedSuperclass` que aporta esas dos marcas. Las **siete entidades** heredan de ella.
* **Las marcas las mantiene un `EntityListener` que recibe el reloj por inyección**, de modo que haya **un solo reloj en todo el sistema** y un test pueda congelar por igual las fechas de auditoría y las de negocio. El listener vive en `domain` —clase Kotlin con los callbacks de `jakarta.persistence` y ni una anotación de Spring— y lo construye un `@Bean` de `infrastructure` pasándole el `Clock`, de modo que `domain` no depende de `infrastructure` ([ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md)).
* **Se introduce el bean `Clock`**, que hasta ahora iba a traer `api-lecturas-cultivo`: al ir este change primero, lo aporta él y aquel lo hereda.
* **`plant_tag` recibe las dos columnas pero no la herencia**: es una tabla de unión pura sin entidad ([T-02](../archive/2026-09-02-api-crud-plantas/design.md), decisión 3c), así que sus marcas las pone Postgres con el `DEFAULT` y su `updated_at` nunca cambiará, porque nadie actualiza una fila de unión: se borra y se inserta.
* **La aplicación manda y la base de datos es la red**: los callbacks `@PrePersist`/`@PreUpdate` del listener sellan el valor, y el `DEFAULT now()` cubre cualquier inserción por SQL crudo, como exige [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md). Los tests que insertan por SQL siguen funcionando sin tocarlos.
* **Migración `V3__`** con las columnas nuevas sobre las ocho tablas. Las dos `created_at` existentes se conservan tal cual: ya son `TIMESTAMPTZ NOT NULL DEFAULT now()` y no hay nada que migrar en ellas.
* **Se promociona a [ADR-010](../../../docs/adr/README.md)**: fechas como `Instant` sobre `TIMESTAMPTZ`, y marcas de auditoría en toda tabla con entidad. Es una convención que condiciona a T-03 en adelante, así que no puede morir archivada en este design.

## Capabilities

### New Capabilities

Ninguna. Este change no abre ninguna vía de entrada nueva ni ningún endpoint.

### Modified Capabilities

- `data-model`: se añade el requisito de marcas de tiempo de auditoría (toda tabla registra cuándo se creó y cuándo se modificó por última vez su fila) y el de representación temporal (las fechas se guardan como instantes, sin desplazamiento horario propio).

## Non-goals

* **Exponer `updatedAt` en el API**: las marcas se persisten, pero ningún DTO las publica todavía. Publicarlas es un cambio de contrato que debe pedir quien lo necesite —previsiblemente F.5 para resolver conflictos de sincronización— y no hay consumidor hoy.
* **Auditoría de *quién* modificó**: `created_by`/`updated_by` no tienen sentido en un MVP monousuario sin autenticación.
* **Histórico de versiones de una fila**: `updated_at` dice *cuándo* cambió, no *qué* cambió. Un registro de cambios es otra cosa y nadie la pide.
* **Bloqueo optimista** (`@Version`): el monorepo de referencia lo lleva en su jerarquía base, pero aquí no hay concurrencia de escritura sobre la misma fila ni historia que lo justifique. Se deja anotado como evolución natural de `AbstractEntity`.
* **Convertir `plant_tag` en entidad** para que herede: revertiría la decisión 3c de T-02, que la eliminó a propósito.
* **Guardar el desplazamiento horario original** que manda un cliente: exigiría una columna aparte, y ninguna historia pide conocer la hora local del usuario.
* **Tocar la funcionalidad de T-03**: `api-lecturas-cultivo` se actualiza *después* de archivar este change (ver Impact).

## Impact

* `backend/src/main/kotlin/com/cactify/domain/`: `AbstractEntity<K>` y el listener de auditoría, nuevos, y las siete entidades (`SoilMix`, `Species`, `Location`, `Plant`, `Tag`, `CareRecord`, `AIRecommendation`) pasan a heredarla. `Plant.createdAt` y `AIRecommendation.createdAt` dejan de declararse por separado: las aporta la superclase.
* `backend/src/main/kotlin/com/cactify/application/dto/PlantDtos.kt`: los dos `createdAt` pasan de `OffsetDateTime?` a `Instant?`.
* `backend/src/main/resources/db/migration/V3__audit_timestamps.sql`: `created_at` y `updated_at` sobre las ocho tablas. **Ninguna migración existente se edita** ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)).
* `backend/src/main/kotlin/com/cactify/infrastructure/`: el `@Configuration` con el bean `Clock` y el que construye el listener de auditoría con ese reloj.
* `backend/src/main/resources/application.yml`: `hibernate.jdbc.time_zone: UTC`.
* `backend/src/test/`: los tests que construyen fechas pasan a `Instant`; los que insertan por SQL crudo no cambian, porque el `DEFAULT` los cubre. Los 87 tests actuales son la red que verifica que nada de comportamiento cambia.
* `docs/adr/ADR-010`: la convención, más su entrada en el índice.
* `README.md` §3.2: las entidades documentan `createdAt` y `updatedAt`, y se corrige que `recordedAt` es "Timestamp (automático)" — desde T-03 puede aportarlo el cliente.
* **`openspec/changes/api-lecturas-cultivo`**: queda desactualizado en tres puntos —`recordedAt` como `OffsetDateTime`, el número de migración `V3__` y la tarea que creaba el bean `Clock`, que ahora aporta este change—. Se actualiza con `/opsx:update` **después** de archivar este change, y pasa a `V4__`; T-04 se corre a `V5__`.
* Contrato público: el `createdAt` de las respuestas de plantas pasa a serializarse siempre en UTC. En el contenedor la cadena es idéntica a la de hoy; en una máquina con otra zona, deja de llevar su desplazamiento.
