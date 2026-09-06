# Proposal: arquitectura-frontend

**Ticket:** [T-25](../../../docs/tickets/T-25-arquitectura-del-frontend.md)
**ADR:** [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)
**Historias:** ninguna. Es un ticket estructural.

## Why

El frontend está organizado por tipo de fichero y no tiene capa de servicio: `usePlants` llama al API **y** escribe en el store en la misma función, que es lo que [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md) prohíbe al otro lado. [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md) fija la disciplina; este change la lleva al código.

Ahora, porque el frontend nunca va a ser más pequeño: son catorce ficheros de lógica y el bloque 0 está a punto de añadir doce pantallas.

## What Changes

* `src/shared/` con el cliente HTTP, el normalizador de errores, `ServiceResponse`, los composables transversales y los datos de ejemplo tras su bandera.
* `src/features/<dominio>/` para `plants`, `care-records`, `recommendations`, `species`, `catalogs`, `search` y `layout`.
* Los cinco composables se parten en su **service** y su **composable**.
* **Los errores pasan a ser valor**: todo service devuelve `ServiceResponse` y ninguno lanza.
* Aliases `@features`, `@shared` y `@ui`.
* Un test que vigile el límite entre capas.

**Ningún comportamiento cambia.** Ninguna pantalla se ve ni funciona distinto.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna: no cambia ningún comportamiento observable, así que el change declara `skip_specs`.

## Non-goals

* No se rediseña ninguna pantalla ni se añade funcionalidad.
* El UI kit **no se mueve** de `app/components/ui/` ([ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)).
* `pages/` y `layouts/` se quedan en `app/`: son convención de Nuxt.
* No se escriben mappers donde el DTO y el modelo coinciden.
* No se conecta nada nuevo al API.

## Impact

* Todo `frontend/app/composables/`, `utils/`, `types/` y `stores/` desaparece o se mueve.
* `frontend/app/components/` conserva solo `ui/`; los de dominio pasan a su feature.
* `nuxt.config.ts` y `vitest.config.ts` ganan los aliases.
* Los tests de service y composable se mueven junto a su feature; los de pantalla y kit se quedan y solo ajustan rutas de importación.
* Sin cambios en backend, esquema ni infraestructura.
