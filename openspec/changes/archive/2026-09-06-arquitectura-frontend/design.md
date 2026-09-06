# Design: arquitectura-frontend

## Context

Ver [proposal.md](proposal.md) y, sobre todo, [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md), que ya fija las capas, la estructura, `ServiceResponse` y la nomenclatura. Este design cubre solo **cómo se hace el movimiento sin romper nada**.

Lo que hay hoy: 5 composables que mezclan HTTP y estado, `app/utils/apiClient.ts`, `app/types/api.ts` con los DTOs de todo el API, un store de Pinia, 3 componentes de dominio y 27 ficheros de test.

## Goals / Non-Goals

**Goals:**

* Que la suite pase en verde en todo momento, no solo al final.
* Que los tests de pantalla cambien **solo** en sus rutas de importación: son la prueba de que el comportamiento no se ha movido.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se aprovecha el viaje para mejorar nada. Cualquier mejora que aparezca se anota y se hace después, con su test.

## Decisions

### `ApiError` se queda dentro del cliente HTTP

`httpClient` sigue lanzando `ApiError`; el **service** lo captura y lo convierte en `DomainError`. Nada fuera de `shared/services/` vuelve a ver un `ApiError`.

**Por qué**: cambiar a la vez el transporte y el contrato de errores obligaría a reescribir el cliente y sus tests. Así `api-client.nuxt.spec.ts` sobrevive intacto y el cambio de contrato se concentra en los services.

### Un service por feature, no uno por endpoint

`plants.api.service.ts` reúne listar, detalle y crear. Las features son pequeñas.

**Descartado**: un fichero por caso de uso. Multiplica ficheros sin separar nada que esté mezclado.

### El store de `plants` se conserva, pero se mira

ADR-015 dice que un store solo existe si el estado es cross-feature. El de `plants` guarda la página actual y la planta abierta para que volver del detalle no vuelva a pedirlo todo. Hoy lo usa una sola feature, así que **baja a `features/plants/store/`** en vez de vivir en `shared/`. Si el bloque 1 lo necesita desde otra feature, sube entonces.

### Los tipos se reparten por feature, sin capa DTO artificial

`app/types/api.ts` se rompe: `PlantSummary` y `PlantDetail` a `plants`, `CareRecord` a `care-records`, `Recommendation` a `recommendations`, `Location` y `Tag` a `catalogs`, `SpeciesSummary` y `SpeciesCare` a `species`. `PageResponse` y los tipos de error, a `shared`.

**Los DTOs de respuesta coinciden hoy con el modelo de pantalla**, así que se declara el tipo una vez y no se escribe mapper — ADR-015 lo permite explícitamente. La carpeta `dto/` de una feature se crea cuando haga falta, no por adelantado.

### El límite se verifica con un test de ficheros

`test/architecture.spec.ts` recorre las fuentes y falla si un componente importa un service, si un service importa el store o un composable, o si algo fuera de `shared/services/` importa `ApiError`.

**Por qué**: es el mismo mecanismo que `design-tokens.spec.ts` usa para ADR-014, y ha funcionado. Una regla que solo está escrita se rompe; una que falla en la suite, no.

### El orden del movimiento

`shared` → una feature entera → suite en verde → siguiente feature. Nunca dos features a medias a la vez.

**Por qué**: si algo se rompe, se sabe qué feature lo rompió. Mover todo y arreglar al final convierte veinte errores en un único frente.

## Risks / Trade-offs

* **Los tests de pantalla cambian de rutas de importación**, y eso los toca → se comprueba con `git diff` que en ellos no cambia nada más que la ruta. Es la misma garantía que dio T-10 con el renombrado.
* **Los aliases hay que declararlos en dos sitios**, Nuxt y Vitest, y desincronizarlos da un fallo confuso → se declaran en la misma tarea y se verifica que un test que importe por alias pasa.
* **Un service que devuelve `ServiceResponse` es más verboso** en el composable → es el precio de que el error esté en la firma, y es la decisión de ADR-015.
* **Nuxt auto-importa componentes por convención**; los de `src/features/**/components/` hay que declararlos → se configura y se verifica montando una pantalla que use uno.

## Migration Plan

No hay datos ni esquema. El único riesgo es dejar la suite roja a mitad, y lo cubre el orden feature a feature.
