# Tasks: api-lecturas-cultivo

Orden test-first según [ADR-005](../../../docs/adr/ADR-005-tdd.md): cada bloque funcional empieza por los tests de sus escenarios (rojo) y sigue con la implementación que los pone en verde. Los escenarios de referencia están en [`specs/care-records/spec.md`](specs/care-records/spec.md) y [`specs/data-model/spec.md`](specs/data-model/spec.md); el cómo, en [`design.md`](design.md).

## 1. Base: restricciones de datos y puertos

- [x] 1.1 Escribir los tests de los cuatro escenarios de "Restricciones de dominio de las lecturas de cultivo" insertando por SQL sobre `care_record` (humedad 150, acidez 15.0, riego -10 y la fila con los cinco valores vacíos que sí debe aceptarse), siguiendo el estilo de `DomainConstraintsTest`; recordar que el `assertFailsWith<DataIntegrityViolationException>` va como **última** sentencia porque el `CHECK` aborta la transacción — deben fallar
- [x] 1.2 Escribir `V4__care_record_constraints.sql` con los cinco `CHECK` tolerantes a nulos (`humidity IS NULL OR humidity BETWEEN 0 AND 100`, horas de luz `0-24`, temperatura `-50-80`, riego `>= 0`, acidez `0-14`) y el índice `(plant_id, recorded_at DESC)`, sin tocar ninguna migración aplicada (decisión 9 y [ADR-001](../../../docs/adr/ADR-001-migraciones-flyway.md)); verificar que 1.1 pasa y que `SchemaMigrationTest` y `SeedDataTest` siguen en verde
- [x] 1.3 Implementar el puerto `CareRecordRepository` en `domain/repos` (`save`, `findOneById(CareRecordId)`, `findAllByPlantId(plantId, pageable): Page<CareRecord>`, sin `findAll()` sin paginar) y `JpaCareRecordRepository` en `infrastructure/persistence` extendiendo también `JpaRepository<CareRecord, CareRecordId>`, sin clase adaptadora (decisión 1); verificar con un test de repositorio que el listado por planta devuelve solo las lecturas de esa planta
- [x] 1.4 Implementar el puerto `AIRecommendationRepository` en `domain/repos` con `findAllByCareRecordIdIn(ids): List<AIRecommendation>` y su `JpaAIRecommendationRepository` (decisión 4); verificar con un test de repositorio que devuelve las recomendaciones de los ids pedidos y ninguna más

## 2. Alta de una lectura y su fecha

- [x] 2.1 Escribir los tests de integración de los cuatro escenarios de "Alta de una lectura de cultivo" (los cinco valores → 201, lectura parcial → 201, lectura sin ningún valor → 400, y la lectura asociada a su planta que no aparece en el listado de otra) sobre `AbstractApiIntegrationTest`, con las semillas 200001 y 300001 — deben fallar
- [x] 2.2 Escribir los tests de integración de los tres escenarios de "Fecha de la lectura" (fecha ausente que sella el servidor, fecha del pasado aportada que se devuelve tal cual, y lectura antigua que se intercala en la posición que le toca del listado) — deben fallar
- [x] 2.3 Escribir los tests de integración de los dos escenarios de "Rechazo de lecturas con fecha futura" (fecha muy posterior → 400 identificando el campo, y fecha dentro del margen configurado → 201), con un `Clock` fijo para que el margen se mida de forma determinista — deben fallar
- [x] 2.4 Escribir los tests de integración de "Lectura sobre una planta inexistente" para el alta (planta `999999999` → 404 con el cuerpo de error uniforme) — debe fallar
- [x] 2.5 Implementar `CreateCareRecordRequest` en `web/controllers` con los cinco valores y `recordedAt` **opcionales**, y los identificadores como `String` ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)), más `CareRecordResponse` en `application/dto` con la acidez como `BigDecimal` (decisión 8); verificar que compila y que el `@PathVariable` mal formado ya cae en 400 sin código nuevo
- [x] 2.6 Añadir la propiedad `cactify.care-records.max-future-skew` en `application.yml` con el patrón `${CARE_RECORD_MAX_FUTURE_SKEW:PT5M}` (decisión 2b); el bean `Clock` ya existe en `infrastructure/TimeConfiguration` y el doble `MutableClock` ya está en los tests, así que aquí solo se consumen. Verificar que el contexto arranca y que un test puede congelar el reloj con `@Import(MutableClockConfiguration::class)`
- [x] 2.7 Implementar la anotación y el `ConstraintValidator` de fecha no futura, tomando el `Clock` y el margen por inyección, sobre el campo `recordedAt` del cuerpo (decisión 2b); verificar que los tests de 2.3 pasan y que el error llega con el mismo cuerpo `{status, error, message, path}` que el resto de errores de validación, sin ningún `@ExceptionHandler` nuevo
- [x] 2.8 Implementar `CareRecordService.create(...)` en `application`, usando `(request.recordedAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)` (decisiones 2 y 2c), resolviendo la planta con `PlantNotFoundException` cuando no existe y mapeando a DTO **dentro** de la transacción (decisiones 2 y 7); verificar que los tests de 2.1, 2.2 y 2.4 que no dependen del controller pasan
- [x] 2.9 Implementar `POST /plants/{id}/care-records` en `CareRecordController` (`web/controllers`) devolviendo `201`; verificar que todos los tests de 2.1 a 2.4 pasan
- [x] 2.10 Escribir el test de que la fecha sobrevive a la ida y vuelta con la precisión que guarda la columna —registrar una lectura con una fecha de nanosegundos y comprobar que el `201` y el `GET` posterior devuelven exactamente la misma cadena— y verificar que el recorte a microsegundos de 2.8 lo pone en verde (decisión 2c)

## 3. Validación de rangos y coherencia

- [x] 3.1 Escribir los tests de integración de los escenarios de "Validación de rangos de una lectura" (humedad -5, acidez 15.0, 25 horas de luz y riego negativo → 400 con el cuerpo de error uniforme y sin registrar nada) — deben fallar
- [x] 3.2 Escribir los tests de integración de los dos escenarios de "Distinción entre riego no medido y riego nulo" (riego `0` que se conserva como `0`, riego ausente que se conserva vacío) — deben fallar
- [x] 3.3 Implementar la validación sintáctica en `CreateCareRecordRequest` con `@Min`/`@Max` sobre humedad, horas de luz, temperatura y riego, y `@DecimalMin`/`@DecimalMax` sobre la acidez (decisión 5); verificar que los tests de 3.1 pasan
- [x] 3.4 Implementar la regla "al menos un valor" como `@AssertTrue` a nivel de clase sobre el cuerpo de la petición, de modo que salga por el mismo camino que el resto de errores de validación (decisión 5); verificar que el escenario "Lectura sin ningún valor" de 2.1 pasa con `400` y el cuerpo `{status, error, message, path}`
- [x] 3.5 Verificar que los tests de 3.2 pasan sin código adicional y que ningún mapeo colapsa `NULL` y `0` en la respuesta (decisión 6)

## 4. Listado paginado y ordenado

- [x] 4.1 Escribir los tests de integración de los escenarios de "Listado de lecturas de una planta" (varias lecturas en orden descendente, creadas mandando fechas explícitas en el cuerpo —ya no hace falta un `Clock` fijo—, planta existente sin lecturas → contenido vacío y total 0, y lecturas con la misma fecha que aparecen exactamente una vez al recorrer las páginas) — deben fallar
- [x] 4.2 Escribir los tests de integración de los escenarios de "Paginación del listado de lecturas" (por defecto con el tamaño configurado y el envelope completo, 5 lecturas con tamaño 2 → 2 elementos / total 5 / 3 páginas, página más allá del final, y el total que cuenta solo las lecturas de la planta consultada) y el escenario de listado sobre planta inexistente → 404 — deben fallar
- [x] 4.3 Implementar `CareRecordService.list(...)` devolviendo `PageResponse.of(...)` sobre `findAllByPlantId`, validando antes la existencia de la planta (decisiones 1 y 7); verificar que los tests de 4.1 y 4.2 que no dependen del controller pasan
- [x] 4.4 Implementar `GET /plants/{id}/care-records` en `CareRecordController` con `@SortDefault(sort = ["recordedAt", "id.id"], direction = Sort.Direction.DESC)` —nunca `@PageableDefault`, y con el desempate escrito sobre el atributo interno del identificador embebido (decisión 3)—; verificar que todos los tests de 4.1 y 4.2 pasan, incluido el de fechas repetidas

## 5. Recomendación embebida en el listado

- [x] 5.1 Escribir los tests de integración de los tres escenarios de "Recomendación de IA asociada a cada lectura" (lecturas sin recomendación que llegan con el campo vacío, lectura con una `AIRecommendation` persistida directamente que llega con su nivel de riesgo y su texto, y consulta del listado que no crea ninguna recomendación) — deben fallar
- [x] 5.2 Escribir el test que comprueba que el listado no dispara una consulta por lectura: con una página de varias lecturas, el número de sentencias preparadas no crece con el tamaño de la página, siguiendo el patrón de `PlantSpecsTest` con las estadísticas de Hibernate — debe fallar
- [x] 5.3 Implementar la resolución por página en `CareRecordService`: una sola llamada a `findAllByCareRecordIdIn` con los ids de la página y un mapa por lectura, **sin** mapear ninguna asociación inversa en `CareRecord` (decisión 4); verificar que 5.1 y 5.2 pasan
- [x] 5.4 Comprobar por revisión que `CareRecord` no ha ganado ningún `@OneToOne(mappedBy = ...)` y que la entidad sigue igual que la dejó T-01 salvo lo que este change declara; verificar que `TypedIdMappingTest` y `RelationshipMappingTest` siguen en verde

## 6. Cierre

- [x] 6.1 Ejecutar la suite completa (`./gradlew test`) y verificar que todos los tests, los de T-01 y T-02 incluidos, están en verde
- [x] 6.2 Levantar el entorno local (`docker compose up --build` en `iac/local`) y verificar manualmente el flujo: crear una planta sobre una especie semilla, registrar dos lecturas sin fecha y una tercera con una fecha del pasado, comprobar que llegan en orden descendente con la antigua en su sitio y su recomendación vacía, que una lectura fuera de rango da `400`, que una fecha futura da `400` y que una planta inexistente da `404`
- [x] 6.3 Comprobar que ningún controller inyecta repositorios, que `domain` no importa tipos de Spring salvo `Specification`, `Page` y `Pageable`, que los puertos nuevos no exponen ningún listado sin paginar y que el `Clock` es el único bean nuevo; verificar por revisión de los imports y de las firmas
- [x] 6.4 Actualizar `README.md` §4: mover `POST /plants/{id}/care-records` de la tabla de previstos a la de implementados y **añadir la fila del `GET`**, que hoy no figura en ninguna de las dos; actualizar también el recuento de tests de §2.6
- [x] 6.5 Dejar anotado en el `design.md` de este change que `V5__` queda reservada para T-04 (decisión 9), y verificar que ninguna migración existente se ha modificado
- [x] 6.6 Ejecutar `openspec validate api-lecturas-cultivo` y verificar que el change está listo para archivar
