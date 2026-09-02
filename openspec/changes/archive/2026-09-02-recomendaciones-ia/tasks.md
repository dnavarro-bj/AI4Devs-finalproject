# Tasks: recomendaciones-ia

Orden test-first según [ADR-005](../../../docs/adr/ADR-005-tdd.md): cada bloque empieza por los tests de sus escenarios (rojo) y sigue con la implementación que los pone en verde. Los escenarios están en [`specs/ai-recommendations/spec.md`](specs/ai-recommendations/spec.md) y [`specs/data-model/spec.md`](specs/data-model/spec.md); el cómo, en [`design.md`](design.md).

## 1. Los dos enumerados y el esquema

- [x] 1.1 Escribir los tests **unitarios** de `RiskLevel` y `Priority` siguiendo el patrón de [ADR-007](../../../docs/adr/ADR-007-enums-de-dominio.md): `invoke()` normaliza espacios y mayúsculas, un valor desconocido lanza, y `toString()` devuelve el `value` persistido (`low`/`medium`/`high` y `immediate`/`soon`/`routine`) — deben fallar
- [x] 1.2 Implementar `RiskLevel` y `Priority` en `domain` y sus `AttributeConverter` con `@Converter(autoApply = true)` en `infrastructure/persistence/converters`, que hoy está vacío (decisión 2); verificar que 1.1 pasa
- [x] 1.3 Escribir los tests de integración de los cuatro escenarios de "Restricciones de dominio de las recomendaciones de IA" insertando por SQL: nivel de riesgo fuera del conjunto, prioridad fuera del conjunto, segunda recomendación para la misma lectura, y dos lecturas distintas que sí se aceptan; el `assertFailsWith<DataIntegrityViolationException>` va como **última** sentencia porque la violación aborta la transacción — deben fallar
- [x] 1.4 Escribir `V5__ai_recommendation_constraints.sql` con `recommended_action` y `priority` (ambas `TEXT NOT NULL`, sin `DEFAULT`), los `CHECK` de los dos enumerados y el `UNIQUE (care_record_id)` (decisión 9), sin tocar ninguna migración aplicada; verificar que 1.3 pasa y que la suite completa sigue en verde
- [x] 1.5 Migrar `AIRecommendation`: `riskLevel` pasa de `String` al enumerado —con lo que su `require(isNotBlank())` lo sustituye el propio tipo—, y gana `recommendedAction` y `priority` con sus invariantes ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)), manteniendo `private set`; verificar que los tests de T-03 que persisten recomendaciones siguen en verde tras ajustarlos al tipo nuevo

## 2. El puerto del proveedor y su doble de test

- [x] 2.1 Definir en `application` el puerto `CareAdvisor` con `AdviceRequest` y `Advice`, llevando los hechos ya resueltos —rangos de la especie, medidas de la lectura, desviaciones calculadas y último riego— y no una cadena de prompt (decisión 4); verificar que compila y que `domain` no gana ninguna dependencia nueva
- [x] 2.2 Implementar el doble de test: una implementación de `CareAdvisor` configurable y un `@TestConfiguration` con `@Primary`, siguiendo el patrón de `MutableClockConfiguration` (decisión 7); verificar que un test puede fijar la respuesta y también hacer que lance
- [x] 2.3 Ampliar el puerto `AIRecommendationRepository` con `save` y `findOneByCareRecordId`, y `CareRecordRepository` con la consulta del último riego —la lectura más reciente de la planta con `water_amount_ml > 0` cuya fecha no sea posterior a la de la lectura analizada (decisión 4)—; verificar con tests de repositorio que el último riego ignora los ceros, los nulos y las lecturas posteriores

## 3. Generación de la recomendación

- [x] 3.1 Escribir los tests de integración de los cuatro escenarios de "Generación de la recomendación de una lectura" (generada → 201 con los cuatro datos, queda asociada a su lectura, una lectura fuera de rango no se califica del riesgo más bajo, y planta sin ningún riego registrado), con el doble del proveedor — deben fallar
- [x] 3.2 Escribir los tests de integración de los cuatro escenarios de "Referencias inválidas en la ruta" (planta inexistente → 404, lectura inexistente → 404, lectura que cuelga de otra planta → 404, identificador mal formado → 400) — deben fallar
- [x] 3.3 Implementar `RecommendationService` en `application`: resolver planta y lectura comprobando que la lectura pertenece a esa planta, reunir los hechos, calcular las desviaciones contra `species.min_*`/`max_*`, resolver el último riego, llamar al puerto y persistir, mapeando a DTO **dentro** de la transacción (decisiones 4 y 5); verificar que los tests de 3.1 y 3.2 que no dependen del controller pasan
- [x] 3.4 Implementar `POST /plants/{id}/care-records/{careRecordId}/recommendation` en `web/controllers` devolviendo `201`, con los identificadores como `String` ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)); verificar que todos los tests de 3.1 y 3.2 pasan
- [x] 3.5 Escribir el test que comprueba que las desviaciones llegan al puerto **ya calculadas** y con los rangos de la especie: con una lectura fuera de rango, el doble recibe un `AdviceRequest` cuyas desviaciones señalan la medida y su rango (decisión 4, y la nota de la historia 0.4) — debe fallar, y ponerlo en verde si 3.3 no lo cubría

## 4. Unicidad, consulta y fallo del proveedor

- [x] 4.1 Escribir los tests de integración de los dos escenarios de "Una recomendación por lectura" (segunda solicitud → 200 con la existente y **sin consultar al proveedor**, comprobándolo con el doble; y dos solicitudes simultáneas que dejan una sola) — deben fallar
- [x] 4.2 Implementar la idempotencia del `POST` y la resolución de la carrera: comprobar antes de generar, y si el insert choca con el `UNIQUE`, releer **fuera de la transacción abortada** y devolver la que ganó (decisión 3); verificar que 4.1 pasa, incluido el caso concurrente
- [x] 4.3 Escribir los tests de integración de los dos escenarios de "Consulta de la recomendación de una lectura" (con recomendación → 200 con los cuatro datos; sin ella → 404, y después sigue sin existir ninguna) — deben fallar
- [x] 4.4 Implementar `GET /plants/{id}/care-records/{careRecordId}/recommendation` como operación de solo lectura que nunca genera; verificar que 4.3 pasa
- [x] 4.5 Escribir los tests de integración de los tres escenarios de "Fallo del proveedor de IA" (no responde → `5xx` con el cuerpo uniforme y sin persistir nada; respuesta ininterpretable —un nivel de riesgo desconocido— que **no** sale como `400`; y que tras el fallo la lectura sigue consultándose y se puede reintentar) — deben fallar
- [x] 4.6 Implementar la excepción del proveedor en `application/ApplicationExceptions.kt` y su `@ExceptionHandler` a `502` en `web/errors/ApiExceptionHandler.kt` (decisión 5); verificar que 4.5 pasa y **en particular** que el fallo de parseo no acaba en el handler de `IllegalArgumentException` que ADR-011 mapea a `400`
- [x] 4.7 Escribir los dos escenarios de "Vocabulario del nivel de riesgo y de la prioridad" (los valores devueltos pertenecen a sus conjuntos; un valor desconocido se rechaza al persistir) y verificar que pasan con los enumerados y los `CHECK` de 1.2 y 1.4

## 5. El adaptador de OpenAI

- [x] 5.1 Implementar el adaptador de `CareAdvisor` en `infrastructure` con el `RestClient` de Spring —sin dependencias nuevas—, pidiendo salida JSON y leyéndola con el `ObjectMapper` del proyecto, y **capturando todo fallo de red, timeout o parseo** para envolverlo en la excepción del proveedor (decisiones 5 y 6); verificar que el contexto arranca y que la suite sigue en verde con el doble activo
- [x] 5.2 Añadir a `application.yml` las propiedades del proveedor —clave, modelo, URL base y tiempo de espera— con el patrón `${VAR:default}`, y comprobar que `OPENAI_API_KEY` llega desde `iac/local/docker-compose.yml`; verificar que el contexto arranca sin clave configurada
- [x] 5.3 Escribir el prompt en `docs/prompts-ia.md`, con la especie y sus rangos, la lectura, el último riego y las desviaciones ya calculadas, y la forma de respuesta que se le pide al modelo (decisión 8); verificar que el adaptador construye exactamente ese prompt a partir de un `AdviceRequest`

## 6. Cierre

- [x] 6.1 Ejecutar la suite completa (`./gradlew test`) y verificar que todos los tests, los de T-01 a T-03 incluidos, están en verde
- [x] 6.2 *(Dada por verificada por decisión de David, sin ejecutarse: requiere una clave real de OpenAI y gasto. La contraparte sin clave sí se comprobó en 6.3.)* Levantar el entorno local (`docker compose up --build` en `iac/local`) **con una clave real** y verificar el flujo del ticket de punta a punta: crear planta, registrar una lectura con la humedad muy por debajo del rango de su especie, generar la recomendación y comprobar que el nivel de riesgo no es el más bajo, que la acción y la prioridad vienen informadas, y que un segundo `POST` devuelve la misma sin volver a llamar
- [x] 6.3 Verificar en el mismo entorno, **sin clave**, que la generación responde `502` con el cuerpo de error uniforme y que el resto del API sigue funcionando
- [x] 6.4 Comprobar que ningún controller inyecta repositorios, que `domain` no importa tipos de Spring salvo los tres admitidos, que el puerto del proveedor vive en `application` y su adaptador en `infrastructure`, y que en `web` no ha entrado ninguna validación que no sea de tipo o de rango (ADR-006 y ADR-011)
- [x] 6.5 Corregir la documentación que este change desmiente: `README.md` §3.2 y el criterio 1 de `docs/tickets/T-04-servicio-de-recomendaciones-con-ia.md`, que dicen `bajo/moderado/alto`; la referencia de T-04 y de la historia 0.4 a "prompts.md, pendiente de crear"; `docs/diagramas/modelo-datos.md` con las dos columnas nuevas y el `UNIQUE`; y `README.md` §4 y §2.6 con los dos endpoints y el recuento de tests
- [x] 6.6 Valorar si algo de este change merece ADR: la integración con un proveedor externo —puerto en `application`, adaptador en `infrastructure`, doble en test y `502` al fallar— es transversal y volverá a aparecer. Si se decide que sí, redactarlo siguiendo `docs/adr/template.md`, indexarlo y resumirlo en `openspec/config.yaml`; si se decide que no, dejar escrito el porqué en este `design.md`
- [x] 6.7 Ejecutar `openspec validate recomendaciones-ia --strict` y verificar que el change está listo para archivar
