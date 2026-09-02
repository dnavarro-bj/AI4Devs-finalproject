## Why

El catálogo de especies es la base de conocimiento determinista de todo el producto —los rangos de humedad, temperatura y luz que la ficha muestra y que la IA consume— y hoy **no tiene API**. `Species` existe como tabla, semillas y entidad JPA desde T-01, pero no hay `SpeciesController` ni servicio: los rangos solo salen embebidos en `GET /plants/{id}` (`SpeciesCareResponse`), y no hay forma de listar las especies ni de crear una. T-02 lo declaró explícitamente Non-goal.

Eso bloquea dos cosas que ya están escritas y esperando:

* El criterio 2 de [T-05](../../../docs/tickets/T-05-dashboard-frontend.md) exige que los rangos de la especie se vean **antes** de guardar la lectura, y su formulario de alta necesita un selector de especie. El change `dashboard-frontend`, ya propuesto, declara en su proposal que asume `GET /species` publicado por "un change previo aparte" — este.
* El paso 1 de [T-07](../../../docs/tickets/T-07-test-e2e-del-flujo-principal.md) arranca creando una especie con rangos conocidos; sin `POST /species` el E2E tendría que saltarse su primer paso apoyándose en las semillas.

Este change nace de las historias [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md) (consultar los rangos recomendados de la especie) y [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md) (registrar especie y cuidados recomendados), y las cierra **enteras**: el catálogo se publica con su CRUD completo, no solo con la parte que consume el frontend.

### El criterio 4 de 0.6 se cierra aquí

El cuarto criterio de 0.6 —*"si se actualiza la ficha de una especie, los cactus que no hayan sobrescrito ese campo reciben el cambio"*— parece depender de la herencia con overrides de la historia [0.7](../../../docs/user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md). No lo hace, no todavía: `Plant` **no tiene ningún campo de cuidados propio**, solo una referencia a su `Species`, y lee de ella los rangos que sirve `GET /plants/{id}`. Mientras 0.7 no exista, ninguna planta puede haber sobrescrito nada, y la propagación es automática: basta con que la ficha se pueda editar, que es lo que aporta `PUT /species/{id}`. Lo que 0.7 añadirá más adelante es el matiz —*los que no hayan sobrescrito*—, no la propagación en sí.

### Ticket: se abre T-08

`openspec/config.yaml` exige que cada change se derive de un ticket, y **ninguno cubre el API de especies**: la historia 0.6 figura mapeada a [T-01](../../../docs/tickets/T-01-modelo-de-datos-de-plantas-y-lecturas.md), que solo creó la tabla y las semillas, y ni T-02 ni ningún otro asumen su endpoint. En lugar de documentar una excepción a la regla o de reabrir un ticket ya archivado, este change **abre `T-08 — API del catálogo de especies`** (Backend, historias 0.3 y 0.6) y lo cita con normalidad. El ticket forma parte del entregable, no es un prerrequisito externo.

## What Changes

* **`GET /species`** — listado paginado del catálogo, con el envelope `PageResponse` y orden estable por nombre científico ([ADR-009](../../../docs/adr/ADR-009-paginacion-obligatoria.md)). Devuelve el resumen (`id`, `scientificName`, `commonName`), que es lo que necesita un selector.
* **`GET /species/{id}`** — ficha de una especie con sus seis rangos y la pauta de riego: es lo que cierra 0.3 fuera de la ficha de una planta concreta. `404` si no existe.
* **`POST /species`** — alta de una especie con nombre científico, nombre común, los tres pares de rangos, la pauta de riego y la mezcla de tierra recomendada, seleccionada del catálogo semilla por `soilMixId`. Cubre los criterios 1, 2 y 3 de 0.6.
* **`PUT /species/{id}`** — edición de la ficha por **reemplazo completo**, con los mismos datos obligatorios y las mismas validaciones que el alta. Idempotente. `404` si la especie no existe. Cierra el criterio 4 de 0.6, como se explica arriba.
* **`DELETE /species/{id}`** — retirada de una especie del catálogo. `204 No Content` si no tiene ejemplares; **`409 Conflict` si los tiene**, sin borrar nada; `404` si no existe.
* **Unicidad del nombre científico**: crear —o renombrar— una especie con un nombre científico que ya ocupa **otra** especie es un `409 Conflict`, no un `500`. Es la misma forma que ya tiene el catálogo de tags. Guardar una especie conservando su propio nombre no es un conflicto.
* **Migración `V6__species_constraints.sql`**: la unicidad de `scientific_name` y los tres CHECK de `min <= max` no existen hoy en `species` (sí en `soil_mix`), y [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) obliga a bajar a la base de datos toda invariante de dominio. `Species` ya las tiene como `require(...)` en su bloque `init`.
* **El puerto `SpeciesRepository` gana el listado paginado** que hoy no tiene (solo `findOneById` y `findByScientificName`), más el borrado; aparece un puerto mínimo de lectura de mezclas de tierra para resolver el `soilMixId`, y `PlantRepository` gana la comprobación de si una especie tiene ejemplares. Sin catálogo ni endpoint de soil-mixes, que siguen fuera de alcance.
* **`Species` gana un método de dominio para actualizarse** que revalida sus seis invariantes ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)); hoy todos sus campos son `private set` y no hay ningún mutador. El constructor primario sigue cerrado.
* **Documentación**: nuevo `docs/tickets/T-08-api-del-catalogo-de-especies.md` y su fila en el índice; la sección 4 del README mueve `/species` de "Endpoints previstos / sin ticket" a la tabla de endpoints implementados, **sin dejar nada en previstos**.

**Sin ruptura de contrato**: `SpeciesCareResponse` y `SpeciesSummaryResponse` se reutilizan tal cual desde `PlantDtos.kt`. Ningún endpoint existente cambia de forma.

## Capabilities

### New Capabilities
- `species-catalog`: el catálogo de especies como API REST — alta, edición y retirada de una especie con sus rangos de cuidado recomendados y su mezcla de tierra, listado paginado para seleccionarla, y consulta de la ficha con los rangos que sirven de base determinista a la recomendación de IA.

### Modified Capabilities

Ninguna. `catalogs` (localizaciones y tags), `plant-inventory`, `care-records` y `ai-recommendations` conservan sus requirements sin tocar.

## Impact

* **`backend/src/main/kotlin/com/cactify/`**: `domain/Species.kt` (método de actualización que revalida); `domain/repos/SpeciesRepository.kt` (listado paginado y borrado), `domain/repos/SoilMixRepository.kt` (nuevo, solo `findOneById`) y `domain/repos/PlantRepository.kt` (comprobación de ejemplares por especie); `infrastructure/persistence/JpaSpeciesRepository.kt`, `JpaPlantRepository.kt` y `JpaSoilMixRepository.kt`; `application/SpeciesService.kt` (nuevo) y `application/ApplicationExceptions.kt` (especie no encontrada, nombre científico duplicado y especie en uso); `web/controllers/SpeciesController.kt` (nuevo) y `web/errors/ApiExceptionHandler.kt` (sus `@ExceptionHandler` a `404` y a `409`).
* **`backend/src/main/resources/db/migration/V6__species_constraints.sql`**: nueva, y **la única**. La edición y el borrado no cambian el esquema: la FK `plant.species_id` ya es `NOT NULL` y sin `ON DELETE`, que es justo lo que sostiene el `409` de la especie en uso, y el `updatedAt` de la edición ya lo sella `AuditingListener` ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)). La última aplicada es `V5__ai_recommendation_constraints.sql`; `V1__schema.sql` no se edita ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)).
* **`backend/src/test/kotlin/com/cactify/`**: tests de API nuevos y un `clearSpecies()` en `AbstractApiIntegrationTest` (borra plantas antes por la FK `plant.species_id`, y no toca `soil_mix`). Las semillas `200001-200003` de `V2__seed.sql` se cuentan en los totales o se vacían dentro de la transacción del test, que revierte: `SeedDataTest` sigue viendo sus especies.
* **`docs/tickets/`**: `T-08-api-del-catalogo-de-especies.md` nuevo y fila en `README.md`.
* **`README.md`**: sección 4, tabla de endpoints.
* **Desbloquea** `dashboard-frontend` (T-05), que ya declara este change como dependencia previa.

## Non-goals

* **Reasignar los ejemplares de una especie que se retira**: el borrado de una especie con plantas se rechaza con `409`, y no se ofrece forma de mover esas plantas a otra especie antes — tampoco existe hoy un endpoint que cambie la especie de una planta.
* **Borrado lógico** de especies: `species` no tiene columna de baja y no se le añade. El borrado es físico o no es.
* **Catálogo de mezclas de tierra** (`POST/GET /soil-mixes`, historia [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md)): el alta de especie referencia una mezcla por su id, pero el catálogo no se expone ni se puede crear una mezcla nueva. El MVP las consume de las semillas, como ya dice el README.
* **Overrides de cuidados por ejemplar** (historia 0.7).
* **Frontend**: ninguna pantalla. El selector de especie es T-05 (`dashboard-frontend`).
* **Documentación de OpenAPI/Swagger** y **autenticación**: no las hay en el proyecto y no se introducen aquí.
* **Limpieza documental** más allá de la fila del README y del ticket T-08.
