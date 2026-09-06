# T-25 - Arquitectura del frontend orientada a features

**Área:** Frontend
**Historia relacionada:** — (ticket estructural, sin historia)
**Bloque:** 0 — esqueleto de la web. **Va justo después de [T-10](T-10-armazon-y-navegacion-de-la-aplicacion.md) y antes de [T-11](T-11-kit-de-datos-a-escala.md)**

## Descripción

Llevar al código la disciplina de [ADR-015](../adr/ADR-015-arquitectura-del-frontend.md): organización por features, capas de orden estricto `Component → Composable → Service → HTTP`, y errores como valor.

El frontend está hoy organizado por tipo de fichero y no tiene capa de servicio: `usePlants` llama al API y escribe en el store en la misma función, que es lo que [ADR-006](../adr/ADR-006-aislamiento-del-dominio.md) prohíbe en el backend. Se hace **ahora** porque el frontend nunca va a ser más pequeño: son catorce ficheros de lógica, y el bloque 1 añade siete tickets de pantallas.

No cambia el comportamiento de ninguna pantalla.

## Alcance

* `src/shared/`: `httpClient` (desde `app/utils/apiClient.ts`), `errorNormalizer`, `api.types` con `ServiceResponse` y `DomainError`, `useBreadcrumbs` y `useToast`, y `mocks/` con su bandera —que absorbe `app/fixtures/search.ts`—.
* `src/features/` con un directorio por dominio: `plants`, `care-records`, `recommendations`, `species`, `catalogs`, `search` y `layout`.
* Los cinco composables actuales se parten en su service y su composable; el store de `plants` se revisa contra el árbol de decisión de ADR-015 y se conserva solo si el estado es cross-feature.
* Aliases `@features`, `@shared` y `@ui` en `nuxt.config.ts` y en la configuración de Vitest.
* Los componentes de dominio (`CareRecordForm`, `RecommendationPanel`, `SpeciesRanges`) se mueven a su feature. El kit **no se mueve**.
* Los tests de service y de composable se mueven junto a su feature; los de pantalla y los del kit se quedan.
* Un test que vigile el límite: ningún componente importa un service, ningún service importa el store.

## Criterios de aceptación

* Toda llamada al API pasa por un service, y ningún composable hace HTTP directo.
* Todo service devuelve `ServiceResponse` y ninguno lanza: el error queda en la firma.
* Ningún DTO llega a un componente.
* Existe un test que falla si un componente importa un service o si un service importa el store.
* La suite entera sigue en verde y **ninguna pantalla cambia de comportamiento**: los tests de pantalla pasan sin reescribirse, salvo los ajustes de ruta de importación.
* `app/fixtures/` deja de existir; sus datos viven en `src/shared/mocks/`.

## Notas

* Es la deuda de haber crecido sin la regla escrita. Se paga una vez.
* No toca [ADR-014](../adr/ADR-014-sistema-de-diseno-del-frontend.md): el kit sigue donde está, con sus tokens y su galería.
