# Tasks: arquitectura-frontend

Refactorización pura: **la suite tiene que estar en verde al terminar cada bloque**, no solo al final. Es la única prueba de que el comportamiento no se ha movido.

## 1. Cimientos

- [x] 1.1 Declarar los aliases `@features`, `@shared` y `@ui` en `nuxt.config.ts` y en `vitest.config.ts`, y configurar el auto-import de componentes desde `src/features/**/components/`; verificar con un test que importe por alias
- [x] 1.2 Crear `src/shared/types/api.types.ts` con `ServiceResponse`, `DomainError`, sus constructores y los códigos de error, más `PageResponse`; test de los constructores
- [x] 1.3 Mover `app/utils/apiClient.ts` a `src/shared/services/httpClient.ts` sin cambiar su contrato —sigue lanzando `ApiError`— y ajustar `test/api-client.nuxt.spec.ts` solo en la ruta de importación
- [x] 1.4 Crear `src/shared/services/errorNormalizer.ts`: `ApiError` → `DomainError` con código; test de sus casos, incluido el fallo sin respuesta
- [x] 1.5 Mover `useBreadcrumbs` y `useToast` a `src/shared/composables/`, y `app/fixtures/search.ts` a `src/shared/mocks/search.ts` tras su bandera; suite en verde

## 2. Feature `plants`

- [x] 2.1 Crear `services/plants.api.service.ts` con listar, detalle y crear, devolviendo `ServiceResponse`; test del service con el cliente doblado, incluido el camino de error
- [x] 2.2 Partir `usePlants` en composables por caso de uso que consuman el service y expongan `loading` y `error`
- [x] 2.3 Bajar `stores/plants.ts` a `features/plants/store/plants.store.ts` y mover `PlantSummary` y `PlantDetail` a `features/plants/types/`
- [x] 2.4 Ajustar las tres pantallas de plantas y verificar con `git diff` que sus tests solo cambian rutas de importación; suite en verde

## 3. Feature `care-records`

- [x] 3.1 Crear `services/careRecords.api.service.ts` con el alta y **el listado**, que hoy nadie consume; test del service
- [x] 3.2 Composable del alta sobre el service, con su `loading` y su `error`
- [x] 3.3 Mover `CareRecordForm.vue` y el tipo `CareRecord` a la feature; suite en verde

## 4. Feature `recommendations`

- [x] 4.1 Crear `services/recommendations.api.service.ts` con generar y consultar; test del service, incluido el `404` de «todavía no hay», que **no es un error de la pantalla**
- [x] 4.2 Composable sobre el service; mover `RecommendationPanel.vue` y los tipos `Recommendation`, `RiskLevel` y `Priority`; suite en verde

## 5. Features `catalogs`, `species`, `search` y `layout`

- [x] 5.1 `catalogs`: service y composable desde `useCatalogs`, con los tipos `Location` y `Tag`
- [x] 5.2 `species`: mover `SpeciesRanges.vue` y los tipos `SpeciesSummary` y `SpeciesCare`
- [x] 5.3 `search`: service que lee el mock y composable que agrupa por tipo, sacando esa lógica del layout
- [x] 5.4 `layout`: mover `navigation.ts` y `PendingSection.vue`; suite en verde

## 6. El límite, verificable

- [x] 6.1 Escribir `test/architecture.spec.ts` que falle si un componente importa un service, si un service importa el store o un composable, o si algo fuera de `shared/services/` importa `ApiError`. En rojo si se introduce una violación a propósito
- [x] 6.2 Corregir lo que el test saque, si saca algo

## 7. Cierre

- [x] 7.1 Comprobar que `app/composables/`, `app/utils/`, `app/types/`, `app/stores/` y `app/fixtures/` ya no existen, y que `app/components/` solo tiene `ui/`
- [x] 7.2 `yarn test` con toda la suite en verde, y `git diff` de los tests de pantalla y de kit mostrando solo cambios de ruta de importación
- [x] 7.3 Levantar el frontend y recorrer inventario, alta y ficha para confirmar que nada se ve ni funciona distinto
- [x] 7.4 `openspec validate arquitectura-frontend --strict` en verde y `CLAUDE.md` al día si algo se desvió del ADR
