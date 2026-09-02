# Tasks: invariantes-de-dominio

Orden test-first según [ADR-005](../../../docs/adr/ADR-005-tdd.md): cada bloque empieza por los tests de sus escenarios (rojo) y sigue con la implementación que los pone en verde. Los escenarios de referencia están en [`specs/data-model/spec.md`](specs/data-model/spec.md); el cómo, en [`design.md`](design.md), y el catálogo completo de invariantes en su decisión 4.

Este change es un refactor del modelo: **los 134 tests existentes son la red principal**. Cualquiera que se ponga rojo por algo que el proposal no declara es un fallo, no un ajuste.

## 1. La primera entidad, y con ella el patrón

- [x] 1.1 Escribir el test **unitario** —sin contenedor, sin Spring (decisión 6)— de los escenarios "Entidad creada en estado inválido" y "Entidad creada en estado válido" sobre `SoilMix`: porcentajes que suman 180 → falla, rango de pH invertido → falla, nombre en blanco → falla, y la mezcla correcta se construye — deben fallar
- [x] 1.2 Reescribir `SoilMix` con los parámetros fuera del constructor primario, las propiedades en el cuerpo con `private set`, sus anotaciones de columna mudadas con ellas, y el bloque `init` con sus `require` (decisiones 1 y 4); verificar que 1.1 pasa y que `EntityMappingTest`, `TypedIdMappingTest` y `SeedDataTest` siguen en verde — si alguno cae, es que una anotación se quedó atrás al mudar la propiedad
- [x] 1.3 Escribir el test de que una invariante violada desde una petición del API responde `400` con el cuerpo `{status, error, message, path}` y no `500` (escenario "Una regla violada no es un fallo interno del servidor") — debe fallar
- [x] 1.4 Añadir el `@ExceptionHandler(IllegalArgumentException::class)` a `web/errors/ApiExceptionHandler.kt`, traduciendo a `400` y **registrando la excepción en el log**, porque que salte significa que `web` y el dominio han divergido (decisión 3); verificar que 1.3 pasa

## 2. El resto de las entidades

- [x] 2.1 Escribir los tests unitarios de las invariantes de `Species`, incluidos los cuatro escenarios de "Restricciones de dominio de las especies" (humedad, temperatura y horas de luz invertidas → fallan; extremos iguales → se acepta) — deben fallar
- [x] 2.2 Escribir los tests unitarios de las invariantes de `Location`, `Tag`, `Plant` y `AIRecommendation` (nombre, nickname y textos no en blanco) — deben fallar
- [x] 2.3 Escribir los tests unitarios de las invariantes de `CareRecord`: cada medida fuera de rango falla; una lectura con todas las medidas vacías falla ("al menos un valor", que baja al dominio); y una lectura parcial —con una sola medida— se construye sin protestar (decisión 4) — deben fallar
- [x] 2.4 Aplicar el patrón de 1.2 a las seis entidades restantes: propiedades en el cuerpo con `private set`, anotaciones mudadas y bloque `init`; verificar que 2.1, 2.2 y 2.3 pasan y que la suite completa sigue en verde
- [x] 2.5 Escribir los tests unitarios de `CareRecord.record(...)` con un `Clock` fijo: fecha ausente que toma la del reloj, fecha aportada que se conserva, fecha recortada a microsegundos, fecha fuera del margen que falla y fecha dentro del margen que se acepta (decisión 1) — deben fallar
- [x] 2.6 Implementar la factoría `CareRecord.record(...)` en el `companion object`, recibiendo `Clock` y margen como parámetros, y hacer **privado** el constructor primario (decisión 1); verificar que 2.5 pasa y ajustar los tests y el código que hoy construyen `CareRecord` directamente para que entren por la factoría
- [x] 2.7 Mover a la factoría el valor por defecto de la fecha y su recorte a microsegundos, que hoy están en `CareRecordService.stamp(...)`, y dejar el servicio llamando a `record(...)` con el reloj y el margen que ya tiene inyectados; verificar que los tests de API de T-03 sobre la fecha siguen en verde
- [x] 2.8 Retirar del cuerpo de petición de lecturas el `@NotFarInFuture` y el `@AssertTrue atLeastOneValue`, y **borrar el paquete `web/validation`** (decisión 2); verificar que los escenarios de fecha futura y de lectura sin valores siguen respondiendo `400` con el cuerpo uniforme, ajustando los tests que afirman el prefijo del campo en el mensaje
- [x] 2.9 Comprobar por revisión que en `web` no queda ninguna validación que no sea de tipo o de rango: ninguna anotación con colaboradores inyectados y ninguna regla que mire más de un campo (decisión 2)
- [x] 2.10 Añadir `Location.rename(name)` con su `require`, y ajustar `AuditTimestampsTest` para que lo use en lugar de asignar el campo (decisión 1); verificar que ese test sigue comprobando que `updatedAt` avanza y `createdAt` no

## 3. Modificación protegida

- [x] 3.1 Escribir los tests unitarios de los escenarios "Modificación que rompería una regla" y "Modificación válida" sobre `Location.rename` (renombrar a vacío falla y deja el nombre anterior intacto; renombrar a un nombre válido lo cambia) — deben fallar
- [x] 3.2 Verificar que 3.1 pasa con el `require` de `rename` escrito en 2.5, y comprobar por revisión que ninguna entidad conserva un `set` público
- [x] 3.3 Comprobar que este change **no ha añadido ninguna migración** y que `V5__` sigue libre: la invariante de `Species` se queda solo en el dominio (decisión 5); verificar listando `db/migration` y que ninguna migración existente se ha modificado

## 4. Cierre

- [x] 4.1 Ejecutar la suite completa (`./gradlew test`) y verificar que los 134 tests previos más los nuevos están en verde, y que ninguno de los 134 se ha modificado salvo `AuditTimestampsTest`, que pasa a usar `rename`
- [x] 4.2 Comprobar que los tests de invariantes corren **sin contenedor**: ejecutarlos con Docker parado y verificar que pasan igualmente (decisión 6). Si arrancan un contenedor, es que heredan de la clase base equivocada
- [x] 4.3 Levantar el entorno local (`docker compose up --build` en `iac/local`) y verificar que el backend arranca con las cuatro migraciones de siempre y que el flujo de T-02 y T-03 sigue funcionando: crear planta, registrar lectura, listar historial
- [x] 4.4 Redactar **ADR-011 — Invariantes de negocio en el dominio** en `docs/adr/` siguiendo la plantilla de `docs/adr/template.md`: `require` en `init` frente a anotaciones; `private set` más métodos de dominio, y por qué el `init` solo no basta; el reparto entre las tres capas y quién manda cuando divergen (decisión 2); el `400` con log para la invariante violada y el riesgo del tipo genérico (decisión 3); qué **no** es una invariante de entidad (reglas que consultan otras filas, y "al menos un valor"); que los tests de invariantes no necesitan contenedor; **qué clase de regla admite `web`** —solo tipo y rango— y la factoría del companion para las invariantes que necesitan un colaborador; y la excepción consciente de `Species`, que se queda sin `CHECK` mientras no exista vía de entrada que escriba especies (decisión 5). Verificar que queda referenciado desde el índice de ADRs
- [x] 4.5 Añadir la línea de ADR-011 al resumen de `openspec/config.yaml`, como exige ADR-000; verificar que `openspec instructions proposal --change <cualquiera> --json` lo devuelve dentro del `context`
- [x] 4.6 Actualizar `README.md` §3.2 anotando las invariantes junto a los campos a los que aplican, y el recuento de tests de §2.6
- [x] 4.7 Ejecutar `openspec validate invariantes-de-dominio --strict` y verificar que el change está listo para archivar
- [x] 4.8 Dejar anotado que la invariante de `Species` queda pendiente de respaldo en base de datos y que su disparador es la apertura de la API de especies (decisión 5); `V5__` sigue reservada para T-04
