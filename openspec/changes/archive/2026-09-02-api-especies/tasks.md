> Orden **test-first** ([ADR-005](../../../docs/adr/ADR-005-tdd.md)): cada bloque abre con la tarea de test que deja el escenario en rojo y sigue con la implementación mínima que lo pone en verde. Los comandos se ejecutan desde `backend/`.

## 1. Ticket y andamiaje

- [x] 1.1 Crear `docs/tickets/T-08-api-del-catalogo-de-especies.md` siguiendo el formato de T-02 (Área: Backend; Historias relacionadas: 0.3 y 0.6; Descripción, Alcance y Criterios de aceptación derivados del proposal), y verificar que sus enlaces relativos a `../user-stories/` resuelven
- [x] 1.2 Añadir la fila de T-08 al índice `docs/tickets/README.md`, entre T-07 y la nota final, con sus dos historias enlazadas
- [x] 1.3 Añadir `clearSpecies()` a `AbstractApiIntegrationTest` (llama a `clearPlants()` primero por la FK `plant.species_id`, borra `species` y no toca `soil_mix`), y verificar que `./gradlew test` sigue en verde sin ningún test nuevo

## 2. Restricciones en base de datos (escenarios de "Coherencia de los rangos en la base de datos")

- [x] 2.1 Añadir a `DomainConstraintsTest` los tests que insertan por `jdbcTemplate` una especie con `min_temperature > max_temperature` y una segunda especie con un `scientific_name` ya presente, esperando que la base de datos rechace ambas escrituras; verlos fallar (hoy la inserción pasa)
- [x] 2.2 Crear `V6__species_constraints.sql` con el `UNIQUE (scientific_name)` y los tres `CHECK (min_… <= max_…)` de la decisión 6 del design, y verificar que los tests de 2.1 pasan
- [x] 2.3 Verificar que `SchemaMigrationTest` y `SeedDataTest` siguen en verde: las tres especies semilla cumplen las cuatro restricciones y la migración no las duplica

## 3. Puertos y acceso a datos

- [x] 3.1 Añadir un test en `backend/src/test/kotlin/com/cactify/persistence/` que pida a `SpeciesRepository` una página de especies ordenada por `scientificName` y compruebe el orden y el total; verlo fallar por no compilar (el puerto no tiene listado)
- [x] 3.2 Ampliar el puerto `domain/repos/SpeciesRepository` con `findAll(pageable: Pageable): Page<Species>`, `save(species: Species): Species` y `delete(species: Species)`, declararlos como `override` en `JpaSpeciesRepository`, y verificar que el test de 3.1 pasa
- [x] 3.3 Crear el puerto `domain/repos/SoilMixRepository` con solo `findOneById(id: SoilMixId): SoilMix?` y su `infrastructure/persistence/JpaSoilMixRepository : SoilMixRepository, JpaRepository<SoilMix, SoilMixId>`, sin clase adaptadora, y verificar con un test que recupera la mezcla semilla `100001`
- [x] 3.4 Añadir un test que registre una planta y compruebe que `PlantRepository.existsBySpeciesId` devuelve `true` para su especie y `false` para otra; verlo fallar, añadir el método al puerto `PlantRepository` y su `override` en `JpaPlantRepository`, y verificar que pasa
- [x] 3.5 Verificar que `domain` no ha ganado ningún import de Spring fuera de `Page` y `Pageable` (ADR-006 enmendado): `grep -rn "org.springframework" src/main/kotlin/com/cactify/domain/`

## 4. Listado del catálogo (escenarios de "Listado del catálogo de especies")

- [x] 4.1 Crear `SpeciesApiTest` sobre `AbstractApiIntegrationTest` con los tests de `GET /species`: catálogo con dos especies conocidas devuelve `200` con `id`, `scientificName` y `commonName` de cada una, y el listado sin criterio de orden llega ordenado por `scientificName`; verlos fallar con `404` (no hay controller)
- [x] 4.2 Crear `application/SpeciesService` con `list(pageable)` `@Transactional(readOnly = true)` que devuelve `PageResponse.of(...) { SpeciesSummaryResponse(...) }` mapeando dentro de la transacción, y `web/controllers/SpeciesController` con `@GetMapping` y `@SortDefault(sort = ["scientificName"])` —nunca `@PageableDefault`—; verificar que los tests de 4.1 pasan
- [x] 4.3 Verificar que los ids del listado viajan como cadena decimal y no como número JSON (ADR-008), con una aserción de tipo sobre `content[0].id` en `SpeciesApiTest`

## 5. Paginación del listado (escenarios de "Paginación del catálogo de especies")

- [x] 5.1 Añadir a `SpeciesApiTest` los tres tests de paginación —envelope por defecto con el `default-page-size` configurado, 5 especies con `size=2` dando `totalElements=5` y `totalPages=3` sobre un catálogo vaciado con `clearSpecies()`, y un `size` por encima del máximo recortado al máximo—; verlos fallar
- [x] 5.2 Verificar que pasan sin tocar código de producción (el envelope y los límites ya los aporta la configuración de ADR-009); si alguno falla, corregir el controller, no la configuración
- [x] 5.3 Añadir `GET /species` a `PaginationEnvelopeTest` junto a los listados ya cubiertos y verificar que pasa

## 6. Ficha de la especie (escenarios de "Ficha de cuidados recomendados de una especie")

- [x] 6.1 Añadir a `SpeciesApiTest` los tests de `GET /species/{id}`: especie existente devuelve `200` con los dos nombres, los seis límites de rango y la pauta de riego; identificador inexistente devuelve `404` con el cuerpo de error uniforme; identificador no decimal devuelve `400` y nunca `500`; verlos fallar
- [x] 6.2 Añadir `SpeciesNotFoundException` a `application/ApplicationExceptions.kt` y su `@ExceptionHandler` a `404` en `ApiExceptionHandler`, gemelos de los de `PlantNotFoundException`
- [x] 6.3 Añadir `SpeciesService.findById` `@Transactional(readOnly = true)` devolviendo `SpeciesCareResponse` —el DTO existente de `PlantDtos.kt`, sin duplicarlo ni añadirle campos (decisiones 2 y 3 del design)— y el `@GetMapping("/{id}")` del controller con el id tipado en el borde; verificar que los tests de 6.1 pasan

## 7. Alta de especie (escenarios de "Alta de una especie…", "Validación…" y "Mezcla de tierra recomendada…")

- [x] 7.1 Añadir a `SpeciesApiTest` el test del alta correcta: `POST /species` con los dos nombres, los tres pares de rangos, la pauta de riego y `soilMixId` de una mezcla semilla devuelve `201` con el identificador asignado y los datos enviados; y el de que la especie recién creada aparece después en `GET /species`; verlos fallar
- [x] 7.2 Crear `SpeciesRequest` en `application` —un único tipo para el alta y la edición, consumido desde `web` (decisión 8 del design)— con `@field:NotBlank` en los tres textos y los rangos y `soilMixId` como campos no nulos, y `SpeciesService.create` `@Transactional` que tipa el id con `SoilMixId.from(...)`, resuelve la mezcla por `SoilMixRepository` y construye la entidad `Species`; verificar que los tests de 7.1 pasan
- [x] 7.3 Añadir los tests de validación —nombre científico en blanco, pauta de riego en blanco y humedad mínima 40 con máxima 20— esperando `400` con el cuerpo de error uniforme y que no se cree ninguna especie; verificar que pasan apoyándose en `@NotBlank` y en las invariantes que `Species` ya tiene en su `init` (ADR-011), sin duplicar reglas en `web`
- [x] 7.4 Añadir los tests de la mezcla de tierra —`soilMixId` inexistente y `soilMixId` ausente— esperando `400` y no `404` ni `500`; implementar el caso inexistente lanzando `InvalidReferenceException`, la que ya usa `PlantService`, y verificar que pasan
- [x] 7.5 Añadir el test de un `soilMixId` con formato no decimal esperando `400` por el handler de `NumberFormatException` ya existente (ADR-008), y verificar que pasa sin código nuevo

## 8. Unicidad del nombre científico al crear (escenario "Nombre científico duplicado al crear")

- [x] 8.1 Añadir a `SpeciesApiTest` el test de que crear una segunda especie con el `scientificName` de una existente devuelve `409` con el cuerpo de error uniforme y deja una sola especie con ese nombre; verlo fallar
- [x] 8.2 Añadir `DuplicateScientificNameException` a `ApplicationExceptions.kt` y su `@ExceptionHandler` a `409` en `ApiExceptionHandler`, gemelos de los de `DuplicateTagNameException`
- [x] 8.3 Comprobar el duplicado en `SpeciesService.create` con `findByScientificName` sobre el nombre ya recortado con `trim()`, sin normalizar mayúsculas —la comparación debe coincidir con el UNIQUE de `V6__` (decisión 7 del design)—, y verificar que el test de 8.1 pasa
- [x] 8.4 Extender el `@ExceptionHandler` del `409` para cubrir también la `DataIntegrityViolationException` de la violación del UNIQUE, de modo que la carrera entre la comprobación y el `INSERT` no acabe en `500`, y verificar con un test que fuerza la violación saltándose el servicio

## 9. Actualización de la especie (escenarios de "Actualización de una especie", "Propagación de la ficha a los ejemplares" y los dos de unicidad al actualizar)

- [x] 9.1 Añadir a `SpeciesInvariantsTest` el test de que el método de actualización de `Species` revalida: actualizar con `minHumidity` 40 y `maxHumidity` 20 lanza `IllegalArgumentException` y la entidad conserva sus valores; verlo fallar por no compilar (no hay mutador)
- [x] 9.2 Añadir a `Species` el método de dominio que recibe los nueve valores, extraer las seis invariantes del `init` a una función privada compartida y llamarla también desde el método (ADR-011), manteniendo el constructor cerrado y los `private set`; verificar que el test de 9.1 pasa
- [x] 9.3 Añadir a `SpeciesApiTest` los tests de `PUT /species/{id}`: actualización correcta devuelve `200` con los datos nuevos y la ficha posterior los refleja; la misma petición repetida deja el mismo estado (idempotencia); un identificador inexistente devuelve `404`; verlos fallar
- [x] 9.4 Añadir `SpeciesService.update` `@Transactional` —resuelve la especie o lanza `SpeciesNotFoundException`, resuelve la mezcla, llama al método de dominio y mapea a `SpeciesCareResponse` dentro de la transacción— y el `@PutMapping("/{id}")` del controller reutilizando `SpeciesRequest`; verificar que los tests de 9.3 pasan
- [x] 9.5 Añadir el test de actualización con datos inválidos (temperatura mínima 30 y máxima 10, y nombre común en blanco) esperando `400` y que la especie conserve sus datos anteriores; verificar que pasa sin duplicar reglas en `web`
- [x] 9.6 Añadir a `SpeciesApiTest` los tests de unicidad al actualizar: renombrar una especie al nombre científico de otra devuelve `409` sin cambiar ninguna, y guardar una especie con su propio nombre se acepta; implementar en `SpeciesService.update` la comprobación que compara el id de lo encontrado con el de la especie editada (decisión 11 del design), y verificar que pasan
- [x] 9.7 Añadir el test de propagación: una planta de una especie cuya humedad recomendada se actualiza de 10-30 a 20-40 devuelve 20-40 en `GET /plants/{id}`; verificar que pasa sin código nuevo y anotar en el test que esto es el criterio 4 de la historia 0.6
- [x] 9.8 Verificar que `AuditTimestampsTest` cubre el sellado de `updatedAt` en la especie actualizada (ADR-010); si no, añadir el caso

## 10. Borrado de la especie (escenarios de "Retirada de una especie del catálogo")

- [x] 10.1 Añadir a `SpeciesApiTest` los tests de `DELETE /species/{id}`: una especie sin ejemplares devuelve `204` y desaparece del catálogo y de su ficha; un identificador inexistente devuelve `404`; verlos fallar
- [x] 10.2 Añadir `SpeciesService.delete` `@Transactional` y el `@DeleteMapping("/{id}")` con `@ResponseStatus(HttpStatus.NO_CONTENT)` y sin cuerpo; verificar que los tests de 10.1 pasan
- [x] 10.3 Añadir el test de que borrar una especie con al menos una planta devuelve `409` con el cuerpo de error uniforme, y que ni la especie ni la planta desaparecen; verlo fallar (hoy sería un `500` por la FK)
- [x] 10.4 Añadir `SpeciesInUseException` a `ApplicationExceptions.kt` y su `@ExceptionHandler` a `409` en `ApiExceptionHandler`, y comprobar `existsBySpeciesId` en `SpeciesService.delete` antes de borrar; verificar que el test de 10.3 pasa y que no queda ninguna `DataIntegrityViolationException` sin traducir

## 11. Contrato transversal y cierre

- [x] 11.1 Añadir las rutas de `/species` a `ApiIdContractTest` y a `ApiErrorFormatTest` y verificar que los ids viajan como cadena y que los `400`, `404` y `409` traen `{status, error, message, path}`
- [x] 11.2 Ejecutar `./gradlew test` completo y verificar que toda la suite está en verde, incluidos `SeedDataTest`, `PlantDetailApiTest` y `PlantPaginationApiTest` (el contrato de `/plants` no ha cambiado)
- [x] 11.3 Ejecutar `./gradlew ktlintCheck` (o la tarea de estilo del proyecto) y dejarlo sin avisos
- [x] 11.4 Mover los cinco endpoints de `/species` a la tabla de endpoints implementados de la sección 4 del `README.md`, eliminando su fila de "Endpoints previstos" —que se queda solo con las soil-mixes— y verificar que la tabla queda coherente con lo implementado
- [x] 11.5 Actualizar la sección "Estado del proyecto" de `CLAUDE.md` con T-08 y verificar que `openspec validate api-especies --strict` pasa
