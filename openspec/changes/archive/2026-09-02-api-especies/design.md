## Context

Motivación en [proposal.md](proposal.md) — *Why*. Lo que condiciona el cómo:

* `Species` ya existe como entidad de dominio con sus invariantes en `init` ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)): tres `min <= max`, y `scientificName`, `commonName` y `wateringGuideline` no en blanco. **No hay que escribir ninguna regla nueva de dominio**, solo dejar que el alta pase por el constructor.
* `soil_mix_id` es `NOT NULL` en el esquema y `@ManyToOne(fetch = LAZY)` en la entidad. Toda especie tiene mezcla, sí o sí.
* `Species` **no tiene ningún mutador**: todos sus campos son `var … private set` y no hay método que los cambie. Editar exige añadir uno (ADR-011).
* `plant.species_id` es `BIGINT NOT NULL REFERENCES species (id)` **sin `ON DELETE`**, y `Plant` no tiene campo de cuidados propio: guarda la referencia a `Species` y lee de ella. `PlantRepository` no expone ninguna forma de saber si una especie tiene ejemplares.
* Los rangos ya se serializan en `SpeciesCareResponse` y el resumen en `SpeciesSummaryResponse`, ambos en `application/dto/PlantDtos.kt`, hoy solo alcanzables a través de `GET /plants` y `GET /plants/{id}`.
* `SpeciesRepository` (puerto en `domain/repos`) declara únicamente `findOneById` y `findByScientificName`; no hay listado.
* No existe `SoilMixRepository`, ni puerto ni interfaz Spring Data.
* `species` **no tiene** UNIQUE en `scientific_name` ni CHECK de `min <= max`; `soil_mix` sí tiene sus dos CHECK desde `V1__schema.sql`. La última migración aplicada es `V5__ai_recommendation_constraints.sql`.
* `AbstractApiIntegrationTest` ofrece `clearPlants()`, `clearLocations()` y `clearTags()`, y no `clearSpecies()`. `V2__seed.sql` siembra tres especies (`200001`–`200003`) y tres mezclas (`100001`–`100003`).
* `LocationController` y `TagController` fijan el patrón de un catálogo: `@SortDefault` (nunca `@PageableDefault`, que taparía el `default-page-size` configurado), `PageResponse.of`, servicio `@Transactional` que mapea a DTO dentro de la transacción porque `open-in-view` está a `false`.

## Goals / Non-Goals

**Goals:**

* Publicar el catálogo de especies con el mismo contrato y la misma forma que los catálogos ya construidos, sin inventar convenciones nuevas.
* Reutilizar los DTO de especie existentes sin duplicarlos ni cambiar el contrato de `/plants`.
* Cerrar la brecha de ADR-002: bajar a la base de datos las invariantes que `Species` ya defiende en memoria.
* Publicar el ciclo de vida completo del catálogo sin que la edición ni el borrado toquen el esquema ni el contrato de `/plants`.

**Non-Goals de diseño** (los de alcance están en el proposal):

* No se toca la forma de `SpeciesCareResponse` ni de `SpeciesSummaryResponse`: añadirles un campo cambiaría también `GET /plants/{id}` y `GET /plants`.
* No se introduce ningún ADR nuevo. Todas las decisiones de abajo se resuelven aplicando ADRs vigentes; ninguna es transversal ni nueva.

## Decisions

### 1. Alcance: el CRUD completo del catálogo

`GET /species`, `GET /species/{id}`, `POST /species`, `PUT /species/{id}` y `DELETE /species/{id}`.

Dos alternativas descartadas, por orden de ambición creciente:

* **Solo lectura** (`GET` y `GET /{id}`). Habría bastado para la historia 0.3 y para el criterio 2 de T-05, y **no habría gastado migración** — la opción más barata contra las ~30 h del MVP. Se descarta porque deja el criterio 1 de 0.6 (*"se puede crear una especie…"*) sin cubrir por ningún change ni ticket, y obliga al paso 1 de T-07 (*"crea una especie con rangos conocidos"*) a saltarse el API y apoyarse en las semillas, que es justo lo que el test E2E debería ejercitar.
* **Lectura más alta**, sin edición ni borrado. Cubre los criterios 1, 2 y 3 de 0.6 y deja el 4 pendiente. Se descarta porque ese criterio 4 **no depende de la historia 0.7**, como parecía: `Plant` no tiene campos de cuidados propios, así que la propagación de la ficha a los ejemplares es automática y lo único que falta para cerrarla es poder editar. Dejarlo fuera habría partido 0.6 entre este change y uno futuro sin motivo técnico, y habría dejado `PUT /species/{id}` en los "endpoints previstos" del README indefinidamente, porque ningún ticket lo reclama.

Con el CRUD entero, este change cierra 0.3 y **0.6 completa**. El borrado no lo pide ninguna historia; entra porque un catálogo del que solo se puede añadir acumula errores de tecleo sin salida, y porque su coste, una vez está el resto, es una consulta y un `@DeleteMapping` (decisión 10).

Lo que la edición **no** trae: el matiz *"los cactus que no hayan sobrescrito ese campo"* del criterio 4 sigue esperando a 0.7, que es la que introduce los overrides. Hoy no hay nada que sobrescribir, así que el criterio se cumple en su forma actual.

### 2. Reutilizar los DTO de especie tal cual, desde `PlantDtos.kt`

`GET /species` devuelve `PageResponse<SpeciesSummaryResponse>`; `GET /species/{id}` y el `201` de `POST /species` devuelven `SpeciesCareResponse`.

El resumen es exactamente lo que necesita un selector (`id`, `scientificName`, `commonName`) y evita cargar y serializar los seis rangos de cada fila de una página. La ficha ya tiene la forma que consume el frontend en `GET /plants/{id}`, así que el cliente reutiliza un único tipo.

Alternativas descartadas:

* **Devolver `SpeciesCareResponse` entero en el listado.** Ahorraría el segundo endpoint y permitiría al selector mostrar los rangos sin una segunda llamada, pero infla cada página y hace que el contrato del listado dependa de todos los campos de cuidado. Se descarta: el detalle es una llamada barata y el frontend solo necesita los rangos de la especie **seleccionada**, no de las 25 de la página.
* **DTO propios de la capability** (`SpeciesListItemResponse`, `SpeciesDetailResponse`). Duplicaría dos records con exactamente los mismos campos y obligaría a mantenerlos en paralelo con los de `/plants`. Se descarta por duplicación.

Los DTO se quedan donde están, en `application/dto/PlantDtos.kt`. Renombrar el archivo a `SpeciesDtos.kt` o partirlo es ruido de diff sin ganancia; se anota como limpieza opcional, no se hace aquí.

### 3. El detalle **no** expone la mezcla de tierra

Ni `soilMix` ni `soilMixId` aparecen en ninguna respuesta.

Exponerla obligaría a cambiar `SpeciesCareResponse` —y con ella el contrato de `GET /plants/{id}`—, a crear un `SoilMixResponse`, y a resolver el `@ManyToOne(LAZY)` de cada fila del listado, que es un **N+1** de una consulta por especie por página. Nada de lo que hay en alcance la necesita: los catálogos de mezclas son Non-goal (historia 0.8), el frontend de T-05 no la pinta, y el pH recomendado vive en `soil_mix` pero la lectura de T-03 registra su propio `soilPh` sin compararlo con él.

Consecuencia asumida y aceptada: `POST /species` y `PUT /species/{id}` reciben un `soilMixId` que sus respuestas no devuelven. Es asimétrico, pero es preferible a arrastrar el N+1 y a romper el contrato de `/plants` por un dato que nadie consume todavía. Cuando exista el catálogo de mezclas (0.8) se añadirá entonces, con su DTO y su `JOIN FETCH`.

Alternativa descartada: **exponerla solo en el detalle**, dejando el listado limpio. Evitaría el N+1 pero seguiría exigiendo cambiar `SpeciesCareResponse` (compartido con `/plants/{id}`) o duplicarlo, que es lo que la decisión 2 rechaza.

### 4. Orden por defecto: `scientificName`

`species` no tiene columna `name`, así que no vale copiar el `@SortDefault(sort = ["name"])` de los catálogos. Se ordena por `scientificName`: es el nombre canónico de la especie, es `NOT NULL`, y tras la migración de la decisión 6 será **único**, lo que lo convierte en un desempate total — el orden es estable entre páginas consecutivas sin necesidad de añadir el id como segundo criterio (ADR-009).

Alternativa descartada: ordenar por `commonName`, que es lo que un usuario hispanohablante lee primero. No es único ni tiene índice, y dos especies con el mismo nombre común podrían repetirse u omitirse entre páginas. El frontend puede ordenar la página que recibe si quiere.

### 5. Capability propia `species-catalog`, no dentro de `catalogs`

`catalogs` declara en su *Purpose* que cubre "catálogos de soporte reutilizables del inventario —localizaciones y tags—", listas de valores seleccionables cuya única propiedad es un nombre. `Species` es otra cosa: es la base de conocimiento determinista de cuidados que alimenta la ficha (0.3) y la recomendación de IA (0.4), con nueve campos y una referencia a otra entidad. Meterla ahí obligaría a reescribir el *Purpose* de una spec ya archivada y mezclaría dos contratos con vidas distintas.

Alternativa descartada: **extender `catalogs`**. Habría evitado una capability nueva y agrupado los tres selectores del formulario de alta de planta. Se descarta por lo anterior; la delimitación por naturaleza del dato pesa más que la coincidencia de que ambos alimenten un `<select>`.

### 6. Migración `V6__species_constraints.sql`

`V1__schema.sql` está aplicada y no se edita ([ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)). La siguiente libre es **`V6__`** — `V3__audit_timestamps.sql`, `V4__care_record_constraints.sql` y `V5__ai_recommendation_constraints.sql` ya están tomadas.

Contenido, siguiendo el patrón de `V4__` y lo que `soil_mix` ya tiene desde el principio:

```sql
ALTER TABLE species
    ADD CONSTRAINT species_scientific_name_unique UNIQUE (scientific_name),
    ADD CONSTRAINT species_humidity_range_valid CHECK (min_humidity <= max_humidity),
    ADD CONSTRAINT species_temperature_range_valid CHECK (min_temperature <= max_temperature),
    ADD CONSTRAINT species_light_hours_range_valid CHECK (min_light_hours <= max_light_hours);
```

Las tres especies semilla las cumplen, así que la migración no rompe una base existente. El UNIQUE crea además el índice que sostiene el `findByScientificName` de la comprobación de duplicado y el orden por defecto de la decisión 4.

[ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md) las exige aunque `Species` ya las defienda en `init`: la entidad protege el camino de la aplicación, la restricción protege la fila. Ninguna sustituye a la otra.

### 7. El duplicado se detecta en `application` y se traduce a `409`

`SpeciesService.create` consulta `findByScientificName` antes de guardar y lanza una `DuplicateScientificNameException` nueva en `application/ApplicationExceptions.kt`, que `ApiExceptionHandler` traduce a `409 Conflict` con un `@ExceptionHandler` gemelo del de `DuplicateTagNameException`.

Es "una regla que consulta otras filas", así que ADR-011 la sitúa en `application` y no en la entidad. La unicidad se compara **tal cual**, sin normalizar: a diferencia de los tags, un nombre científico es un binomio latino con capitalización canónica (`Echinocactus grusonii`), no texto libre del usuario; el UNIQUE de la base de datos es igualmente sensible a mayúsculas y las dos capas deben coincidir para que el `409` no se convierta en una `DataIntegrityViolationException` que acabaría en `500`. Sí se aplica `trim()` al recibirlo, como en los catálogos.

Queda una ventana de carrera entre la comprobación y el `INSERT`; la cierra el UNIQUE. Ver *Risks*.

### 8. Capas y puertos, según ADR-006 enmendado

Sin novedad respecto de lo ya construido:

* `domain/repos/SpeciesRepository` gana `fun findAll(pageable: Pageable): Page<Species>`, `fun save(species: Species): Species` y `fun delete(species: Species)`. `Pageable` y `Page` son los dos únicos tipos de Spring que ADR-006 admite en `domain`. Nada de `findAll()` sin paginar (ADR-009).
* `domain/repos/PlantRepository` gana `fun existsBySpeciesId(speciesId: SpeciesId): Boolean`, que es lo que sostiene el `409` del borrado. Es una consulta de existencia, no un listado: no la alcanza la prohibición de ADR-009.
* `domain/repos/SoilMixRepository` nuevo, con un único `findOneById(id: SoilMixId): SoilMix?`. Lo mínimo para resolver la referencia del alta; **no** es el catálogo de mezclas, que es Non-goal.
* `infrastructure/persistence/JpaSpeciesRepository` (ya existe, se amplía) y `JpaSoilMixRepository` nuevo: una sola interfaz `Jpa…Repository : …Repository, JpaRepository<…>`, sin clase adaptadora.
* `application/SpeciesService`: `create`, `update` y `delete` `@Transactional`, `list` y `findById` `@Transactional(readOnly = true)`; el mapeo a DTO ocurre dentro de la transacción.
* `web/controllers/SpeciesController` inyecta solo `SpeciesService`, con `@SortDefault(sort = ["scientificName"])` y sin `@PageableDefault`. El `@DeleteMapping` lleva `@ResponseStatus(HttpStatus.NO_CONTENT)` y no devuelve cuerpo.
* `SpeciesRequest` vive en `application`, junto a los DTO de respuesta, y `web` lo consume: la dirección que permite ADR-006 es `web → application`, así que el contrato de entrada puede vivir donde ya vive el de salida. Lleva `@field:NotBlank` en los tres textos; los seis rangos y `soilMixId` son campos **no nulos**, porque `jackson-module-kotlin` ya rechaza un campo ausente o a `null` y el manejador global lo traduce a `400`, sin `@NotNull` ni desempaquetado aguas abajo. `soilMixId` viaja como `String` y se tipa con `SoilMixId.from(...)`: la `NumberFormatException` de un id mal formado ya la traduce el handler existente a `400` (ADR-008). **Un solo tipo para el alta y para la edición**, porque el PUT es reemplazo completo (decisión 9) y su cuerpo es idéntico al del POST; dos records gemelos serían duplicación.

  > **Corregido tras la implementación.** El diseño situaba este tipo en el controller, junto a `CreateLocationRequest` y `CreateTagRequest`, con los seis rangos como `Int?` anotados con `@NotNull` y un `toCommand()` que los desempaquetaba contra un `SpeciesCommand` propio de `application`. Se unificaron en un solo tipo en `application`: los DTO de entrada y salida de esa capa son consumibles desde las capas superiores, y mantener dos records con los mismos diez campos solo para cruzar la frontera no compensaba. Los `Int` no nulos son lo que hace innecesario el desempaquetado.

Una mezcla inexistente es `InvalidReferenceException`, la que ya usa `PlantService` — dato inválido del cuerpo, luego `400`, no `404`. Una especie inexistente **en la ruta** de `GET /species/{id}` es `404`, con una `SpeciesNotFoundException` nueva y su handler, gemela de `PlantNotFoundException`.

### 9. `PUT /species/{id}` es reemplazo completo, no edición parcial

El cuerpo lleva los nueve campos, todos obligatorios, y sustituye la ficha entera. La operación es idempotente.

Es la forma que ya tiene el único PUT del proyecto, `PUT /plants/{id}/tags`, que reemplaza el conjunto completo de tags y cuya idempotencia sale precisamente de eso. Y evita el problema real de un PATCH en Kotlin: con `data class` y Jackson, un campo ausente y un campo enviado a `null` llegan indistinguibles como `null`, así que un parcial obligaría a envolver cada campo en un `Optional`/`JsonNullable` o a comparar contra el estado actual — un aparato desproporcionado para una ficha de nueve campos que el frontend edita en un formulario que ya los tiene todos cargados.

Alternativa descartada: **`PATCH` con campos opcionales**. Ahorra al cliente reenviar lo que no cambia, pero introduce esa ambigüedad y una segunda forma de validar (la invariante `min <= max` tendría que combinar campos entrantes con campos persistidos). Si algún día hace falta, se añade encima del PUT sin romperlo.

### 10. `DELETE /species/{id}` rechaza con `409` una especie en uso

`SpeciesService.delete` consulta `PlantRepository.existsBySpeciesId` antes de borrar y lanza una `SpeciesInUseException` nueva, que `ApiExceptionHandler` traduce a `409 Conflict`. Si no hay ejemplares, borra y el controller responde `204 No Content` sin cuerpo.

La FK `plant.species_id` es `NOT NULL` y no tiene `ON DELETE`: sin la comprobación previa, el `DELETE` reventaría contra la restricción y llegaría al handler como `DataIntegrityViolationException`, es decir, un `500` por un caso perfectamente previsible. La comprobación explícita convierte eso en un error del cliente con un mensaje que dice qué pasa.

Alternativas descartadas:

* **`ON DELETE CASCADE`.** Borrar una especie se llevaría por delante las plantas, sus lecturas y sus recomendaciones en silencio. La FK se declaró `NOT NULL` y sin cascada a propósito: el inventario no es un detalle de la especie.
* **Borrado lógico** (una columna `deleted_at` y filtrado en todas las consultas). Resuelve el caso de la especie en uso sin perder historial, pero exige migración, contamina todas las consultas del catálogo y del inventario, y plantea qué hacer con la unicidad de `scientific_name` frente a las filas dadas de baja. Fuera del MVP.
* **Devolver `204` también cuando no existe**, por idempotencia estricta de DELETE. Se descarta por coherencia con `GET /species/{id}`, que ya responde `404`: dos verbos sobre la misma ruta no deberían discrepar sobre si el recurso existe.

Sigue habiendo una carrera —registrar una planta justo entre la comprobación y el `DELETE`—; la cierra la FK, y el handler del `409` la cubre igual que la del duplicado (ver *Risks*).

### 11. La edición pasa por un método de dominio de `Species`

`Species` gana un único método que recibe los nueve valores, los asigna y **revalida las seis invariantes**, extraídas del bloque `init` a una función privada que ambos comparten. El constructor primario sigue cerrado y los campos siguen con `private set`.

Es literalmente lo que exige [ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md): el cambio pasa por métodos de dominio que revalidan, nunca por asignación directa desde `application`. Sin revalidar, un PUT podría dejar la entidad con `minHumidity > maxHumidity` en memoria y confiar el rechazo al CHECK de `V6__`, que llegaría como `500`.

El `updatedAt` lo sella `AuditingListener` con el `Clock` inyectado ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)); no hay que tocarlo ni exponerlo — `SpeciesCareResponse` no lleva timestamps y no se le añaden (decisión 2).

La comprobación de que el nombre científico no lo ocupe **otra** especie es "una regla que consulta otras filas", así que va en `application` (decisión 7), comparando el id de lo encontrado con el de la especie que se edita.

### 12. `clearSpecies()` en la base de tests

Los tests de listado y de paginación necesitan contar sobre un catálogo conocido, y `V2__seed.sql` mete tres especies. Se añade a `AbstractApiIntegrationTest`:

```kotlin
/** Deja el catálogo de especies vacío; exige que no queden plantas. */
protected fun clearSpecies() {
  clearPlants()
  jdbcTemplate.update("DELETE FROM species")
}
```

Borra plantas primero por la FK `plant.species_id`, exactamente como `clearLocations()` hace con `location`, y **no toca `soil_mix`**: el alta necesita una mezcla existente, y las semillas `100001`–`100003` son la fuente. Cada test de API corre en su propia transacción y revierte, así que `SeedDataTest` —que exige al menos dos especies tras migrar— sigue viendo las suyas.

Los tests que no necesitan el catálogo vacío (la ficha, el alta, el duplicado) cuentan las semillas en los totales en lugar de vaciarlas.

## Risks / Trade-offs

* **Carrera entre la comprobación de duplicado y el `INSERT`** → dos altas simultáneas con el mismo nombre científico pasan las dos por `findByScientificName`. El UNIQUE de `V6__` rechaza la segunda, que llega al handler como `DataIntegrityViolationException` y se convertiría en `500`. Mitigación: el `@ExceptionHandler` del duplicado cubre también ese caso, traduciéndolo a `409`; es el mismo `409` por el mismo motivo, llegue por la comprobación o por la restricción.
* **La migración falla si una base ya tiene datos incoherentes** → una instalación previa podría tener especies con el nombre científico repetido o un rango invertido, y el `ALTER TABLE` abortaría dejando Flyway en `failed`. Mitigación: el MVP no tiene despliegue con datos reales y las semillas cumplen las cuatro restricciones. No se añade limpieza previa; si apareciera, se resolvería con una migración de corrección antes de la de restricciones.
* **La respuesta del alta no devuelve la mezcla que se le pasó** (decisión 3) → un cliente no puede confirmar por la respuesta qué mezcla quedó asociada. Aceptado: nadie la consume en el MVP, y añadirla luego es aditivo, no rompe nada.
* **Borrar una especie semilla deja una base local sin catálogo mínimo** → nada impide un `DELETE` de las tres especies de `V2__seed.sql` en un entorno de desarrollo. Mitigación: ninguna en código —proteger las semillas exigiría una noción de "fila de sistema" que el modelo no tiene—; se recupera recreando el contenedor, y `SeedDataTest` corre sobre una base limpia, así que no lo enmascara.
* **`GET /species/{id}` es un endpoint que hoy solo usaría el frontend de T-05** si el selector quiere los rangos de la especie elegida → podría parecer prematuro. Se mantiene porque es lo que cierra la historia 0.3 fuera de la ficha de una planta, y porque sin él el listado tendría que engordar (alternativa descartada en la decisión 2).
* **Coste**: ~12–14 h de las ~30 h del MVP, frente a las ~8–10 h sin edición ni borrado y a las ~4–5 h de la versión de solo lectura. Se asume conscientemente por lo argumentado en la decisión 1; a cambio, 0.6 queda cerrada entera y el README se queda sin endpoints de `/species` pendientes.

## Migration Plan

1. `V6__species_constraints.sql` se aplica al arrancar, antes de que el código nuevo se use. No hay backfill ni transformación de datos: solo restricciones sobre filas que ya las cumplen.
2. Los cinco endpoints son nuevos; ninguno existente cambia de forma, así que no hay despliegue coordinado con el frontend. `dashboard-frontend` puede consumirlos en cuanto estén, y solo necesita `GET /species`.
3. **Rollback**: revertir el código deja el esquema con cuatro restricciones de más, que ninguna versión anterior viola. No hace falta migración de vuelta. Si aun así se quisiera, es un `DROP CONSTRAINT` de las cuatro en una migración nueva; nunca borrando `V6__`.

## Open Questions

Ninguna. Las decisiones que habrían cambiado las specs se resolvieron antes de escribirlas: el alcance es el CRUD completo (decisión 1), el PUT es reemplazo completo (decisión 9), el borrado de una especie en uso es `409` (decisión 10), y la exigencia de ticket de `config.yaml` se satisface abriendo T-08.
