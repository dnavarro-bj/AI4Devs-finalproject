# Tasks: api-crud-plantas

Orden test-first según [ADR-005](../../../docs/adr/ADR-005-tdd.md): cada bloque funcional empieza por los tests de sus escenarios (rojo) y sigue con la implementación que los pone en verde. Los escenarios de referencia están en [`specs/plant-inventory/spec.md`](specs/plant-inventory/spec.md) y [`specs/catalogs/spec.md`](specs/catalogs/spec.md); el cómo, en [`design.md`](design.md).

## 1. Base: capa web y estructura de paquetes

- [x] 1.1 Añadir `spring-boot-starter-web` y `spring-boot-starter-validation` a `backend/build.gradle.kts` y retirar el comentario que dice que aún no hay capa web; verificar que `./gradlew build` sigue en verde y que la aplicación arranca sirviendo HTTP en `:8080`
- [x] 1.2 Crear los paquetes `com.cactify.application` (con `dto`), `com.cactify.infrastructure` (con `persistence` y `persistence.converters`) y `com.cactify.web` (decisión 1 del design), y fijar `spring.jpa.open-in-view: false` en `application.yml`; verificar que el proyecto compila y arranca
- [x] 1.3 Escribir los tests de que cada entidad se persiste y se recupera por su identificador tipado sobre PostgreSQL real, y reescribir `RelationshipMappingTest` para la asociación `@ManyToMany` entre `Plant` y `Tag` (asignar, reemplazar y vaciar tags sobre la tabla `plant_tag`) — deben fallar
- [x] 1.4 Implementar `EntityId<T>` y los tipos `SoilMixId`, `SpeciesId`, `LocationId`, `PlantId`, `TagId`, `CareRecordId` y `AIRecommendationId` en `domain` como `@Embeddable` sobre la columna `BIGINT` existente (decisión 3); verificar que la parte de identificadores de 1.3 pasa
- [x] 1.5 Migrar el identificador de las siete entidades a los tipos nuevos (`@EmbeddedId`), y sustituir la entidad `PlantTag` por el `@ManyToMany` con `@JoinTable(name = "plant_tag")`, `@BatchSize(size = 50)`, la vista de solo lectura `tags` y `updateTags(...)` en `Plant` (decisión 3c); verificar que `EntityMappingTest`, `RelationshipMappingTest`, `DomainConstraintsTest` y `SeedDataTest` quedan en verde sin tocar ninguna migración de base de datos
- [x] 1.6 Reubicar `SpeciesRepository` según ADR-006: puerto sin Spring en `domain/repos` (con `findOneById`), e interfaz `@Repository JpaSpeciesRepository : SpeciesRepository, JpaRepository<Species, SpeciesId>` en `infrastructure/persistence` (decisión 2, sin clase adaptadora); verificar que `EntityMappingTest`, `SeedDataTest` y el resto de tests de T-01 siguen pasando
- [x] 1.7 Escribir el test que comprueba que los IDs se serializan como cadena en una respuesta JSON, que una cadena numérica se acepta como ID de entrada y que una cadena no numérica da `400` (escenarios de "Identificadores en el contrato del API") — debe fallar
- [x] 1.8 Declarar los identificadores como `String` en los DTOs y `@PathVariable` de `web`, convirtiéndolos en el borde con `XId.from(...)` y `toString()` (decisión 3b); verificar que 1.7 pasa
- [x] 1.9 Escribir el test de que un listado sin `page` ni `size` devuelve la primera página con el tamaño por defecto configurado y el envelope completo (`content`, `totalElements`, `totalPages`, `pageNumber`, `pageSize`), y de que un `size` por encima del máximo se recorta al máximo (escenarios de paginación de ambas specs) — deben fallar
- [x] 1.10 Configurar `spring.data.web.pageable.default-page-size` (25) y `max-page-size` (500) en `application.yml`, sobreescribibles por variable de entorno, e implementar el envelope `PageResponse<T>` en `application/dto` (decisión 9); verificar que 1.9 pasa para al menos un listado
- [x] 1.11 Escribir los tests del formato uniforme de error para un `400` de validación y un `404` de ruta (escenarios de "Formato uniforme de los errores del API") — deben fallar
- [x] 1.12 Implementar el `@RestControllerAdvice` global con el cuerpo de error `{status, error, message, path}`, la traducción de `NumberFormatException` a `400` y las excepciones de aplicación `InvalidReferenceException`, `PlantNotFoundException` y `DuplicateTagNameException` (decisión 5); verificar que 1.11 pasa

## 2. Catálogo de localizaciones

- [x] 2.1 Escribir los tests de integración de los escenarios de "Alta de localizaciones", "Listado de localizaciones" y la parte de localizaciones de "Paginación de los listados de catálogo" (creación correcta, nombre en blanco → 400, catálogo con localizaciones, localización recién creada visible, 5 localizaciones con tamaño 2 → 2 elementos / total 5 / 3 páginas) — deben fallar
- [x] 2.2 Implementar el puerto `LocationRepository` en `domain/repos` —con `findAll(pageable): Page<Location>`, sin exponer el `findAll()` sin paginar— y `JpaLocationRepository` en `infrastructure/persistence` (decisiones 2 y 9); verificar que el contexto arranca inyectando el puerto, no la interfaz Spring Data
- [x] 2.3 Implementar `LocationService` en `application` (alta y listado paginado, devolviendo DTOs de `application/dto`) y `LocationController` con el cuerpo de petición, `@field:NotBlank` sobre el nombre y `@SortDefault(sort = ["name"])` en el listado; verificar que todos los tests de 2.1 pasan

## 3. Catálogo de tags

- [x] 3.1 Escribir el test unitario de normalización de nombre de tag (recorte de espacios, comparación insensible a mayúsculas) — debe fallar
- [x] 3.2 Escribir los tests de integración de los escenarios de "Alta de tags con nombre normalizado", "Unicidad de los nombres de tag en el catálogo", "Listado de tags" y la parte de tags de "Paginación de los listados de catálogo" (creación correcta, espacios sobrantes, nombre en blanco → 400, duplicado exacto → 409, duplicado con distinta capitalización → 409, listado, paginación por defecto) — deben fallar
- [x] 3.3 Implementar el puerto `TagRepository` en `domain/repos` (con `findAll(pageable): Page<Tag>` y `findByNormalizedName`) y `JpaTagRepository` en `infrastructure/persistence`, con `@Query` sobrescribiendo la búsqueda por nombre normalizado (decisión 2); verificar que el test unitario 3.1 pasa
- [x] 3.4 Implementar `TagService` en `application` (normalización + comprobación de duplicado antes de persistir, listado paginado, devolviendo DTOs) y `TagController` con el cuerpo de petición y `@SortDefault(sort = ["name"])`; verificar que todos los tests de 3.2 pasan

## 4. Alta y detalle de plantas

- [x] 4.1 Escribir los tests de integración de los escenarios de "Alta de una planta" y "Validación de las referencias de una planta" (creación válida → 201, aparece en el inventario, nickname en blanco → 400, especie inexistente → 400, localización inexistente → 400, ID mal formado → 400) — deben fallar
- [x] 4.2 Escribir los tests de integración de los escenarios de "Detalle de una planta" (cuidados heredados de la especie, planta sin tags, planta inexistente → 404) — deben fallar
- [x] 4.3 Implementar el puerto `PlantRepository` en `domain/repos` (incluido `findAll(spec, pageable): Page<Plant>`) y `JpaPlantRepository` en `infrastructure/persistence` extendiendo también `JpaSpecificationExecutor<Plant>` (decisiones 2, 4 y 9); verificar que compila y arranca
- [x] 4.4 Implementar `PlantService` en `application` con la validación semántica de especie y localización (`InvalidReferenceException`), la recuperación del detalle (`PlantNotFoundException`) y el mapeo a DTO **dentro** de la transacción (decisiones 1 y 6); verificar con los tests de 4.1 y 4.2 que dependen del servicio
- [x] 4.5 Implementar `PlantController` (`POST /plants`, `GET /plants/{id}`) con el cuerpo de petición y el DTO de detalle de `application/dto`, que incluye los datos de cuidado heredados de la especie y la lista de tags leída de `plant.tags`; verificar que todos los tests de 4.1 y 4.2 pasan

## 5. Asignación de tags a una planta

- [x] 5.1 Escribir los tests de integración de los escenarios de "Asignación de tags a una planta" (asignación de varios tags, reemplazo del conjunto, vaciado, asignación repetida idempotente, tag inexistente → 400 sin modificar los tags previos, planta inexistente → 404) — deben fallar
- [x] 5.2 Implementar en `PlantService` el reemplazo transaccional del conjunto de tags sobre `plant.updateTags(...)`, validando todos los IDs antes de modificar nada (decisiones 3c y 7); verificar que los tests de 5.1 que no dependen del controller pasan
- [x] 5.3 Implementar `PUT /plants/{id}/tags` en `PlantController` con el DTO `{ "tagIds": [...] }`; verificar que todos los tests de 5.1 pasan

## 6. Listado del inventario con filtros

- [x] 6.1 Escribir los tests de integración de los escenarios de "Listado del inventario con filtros combinables" (sin filtros, por localización, por un tag, por varios tags con semántica AND —incluyendo que una planta con solo uno de los dos tags no aparece—, filtros combinados, sin coincidencias → contenido vacío, referencia inexistente → contenido vacío, el total refleja el filtro) — deben fallar
- [x] 6.2 Escribir los tests de integración de los escenarios de "Paginación del listado de inventario" (por defecto, tamaño explícito 5/2 → 3 páginas, página siguiente, página más allá del final, tamaño por encima del máximo, paginación combinada con filtros) — deben fallar
- [x] 6.3 Implementar `PlantSpecs` en `domain/specs` con las factorías `byLocation(locationId)` y `byAllTags(tagIds)` —cada una devolviendo `null` cuando su filtro no aplica, y el AND de tags con la subconsulta de recuento (decisión 4)—; verificar con tests de repositorio que cada especificación por separado devuelve el conjunto esperado
- [x] 6.4 Implementar `PlantSpecs.withSpeciesAndLocation()` con el `root.fetch` de especie y localización guardado por `query.resultType` —sin incluir `tagSet`, que forzaría paginación en memoria (decisiones 3c y 4)—; verificar con un test que lista con `size` menor que el total, el que fuerza el `count`, y que el mapeo del DTO no dispara una consulta por planta
- [x] 6.5 Componer las especificaciones con `.and()` en `PlantService.search(...)` sobre `findAll(spec, pageable)` del puerto; verificar que la combinación de ambos filtros y el caso sin filtros devuelven los conjuntos esperados y que `totalElements` cuenta el filtro, no el inventario
- [x] 6.6 Implementar `GET /plants` en `PlantController` con los parámetros opcionales `tag` (repetible) y `location` y `@SortDefault(sort = ["createdAt"])`, devolviendo el envelope `PageResponse`; verificar que todos los tests de 6.1 y 6.2 pasan

## 7. Cierre

- [x] 7.1 Ejecutar la suite completa (`./gradlew test`) y verificar que todos los tests, los de T-01 incluidos, están en verde
- [x] 7.2 Levantar el entorno local (`docker compose up --build` en `iac/local`) y verificar manualmente el flujo del ticket: crear localización y tag, crear una planta sobre una especie semilla, asignarle tags, filtrar el inventario por tag y localización, y comprobar que el tamaño de página por defecto y el máximo se pueden cambiar por variable de entorno
- [x] 7.3 Comprobar que ningún controller inyecta repositorios ni recibe entidades de dominio, que `domain` no importa tipos de Spring salvo `Specification`, `Page` y `Pageable` (ADR-006 enmendado), y que ningún puerto ni endpoint expone un listado sin paginar; verificar por revisión de los imports del paquete `domain`, de las firmas de los puertos y de los tipos de retorno de los servicios
- [x] 7.4 Enmendar [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) con lo que este change concreta sobre el aislamiento del dominio: admitir `Specification`, `Page` y `Pageable` de Spring Data en `domain` al mismo nivel que las anotaciones de Jakarta Persistence (decisiones 4 y 9); el patrón puerto en `domain/repos` + `JpaXRepository` en `infrastructure/persistence` sin clase adaptadora (decisión 2); y que los servicios de `application` devuelven DTOs, no entidades, con `open-in-view: false` (decisión 1). Mantener la prohibición del resto de tipos y anotaciones de Spring; verificar que el ADR enmendado describe el patrón realmente implementado
- [x] 7.5 Redactar **ADR-007 — Enums de dominio y sus converters** en `docs/adr/` (`value` explícito, `invoke()` que normaliza y falla, `toString()`, `@Converter(autoApply = true)`, decisión 10), siguiendo la plantilla de `docs/adr/template.md`; verificar que queda referenciado desde el índice de ADRs
- [x] 7.6 Redactar **ADR-008 — Identificadores tipados y su representación en el API** en `docs/adr/` (`EntityId<TSID>` con un tipo y un converter por entidad, e ids como cadena decimal tipada en el borde; decisiones 3 y 3b), siguiendo la plantilla; verificar que queda referenciado desde el índice de ADRs
- [x] 7.7 Redactar **ADR-009 — Paginación obligatoria en los endpoints de índice** en `docs/adr/` (ningún listado sin límite, envelope `PageResponse`, orden estable, tamaño por defecto y máximo configurables; decisión 9), siguiendo la plantilla; verificar que queda referenciado desde el índice de ADRs
- [x] 7.8 Ejecutar `openspec validate api-crud-plantas` y verificar que el change está listo para archivar
