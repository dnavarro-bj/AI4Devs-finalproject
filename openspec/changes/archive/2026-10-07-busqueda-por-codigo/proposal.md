# Proposal: busqueda-por-codigo

**Ticket:** [T-15](../../../docs/tickets/T-15-codigos-de-inventario.md) — segunda mitad; **cierra el ticket**. Depende de [`codigos-de-inventario`](../archive/2026-10-07-codigos-de-inventario/proposal.md).
**Pantallas del prototipo:** `plants` (la caja de búsqueda del inventario) y el diálogo de búsqueda global, en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)

## Why

Un código que no se puede buscar no sirve para lo que se creó. La etiqueta pegada en la maceta dice `CAT-GRUSS-01`; quien la lee quiere llegar a la ficha de esa planta sin conocer su apodo ni abrir el inventario entero. Hoy:

* `GET /plants` solo filtra por localización y etiqueta, y `GET /species` no filtra por nada.
* La caja «Buscar» del inventario está deshabilitada y marcada T-21.
* El buscador global —el de la barra superior— sirve **datos de ejemplo**: escribes `gruss` y aparecen plantas inventadas que no existen en la base.

El criterio de aceptación del ticket es explícito: *buscar por código encuentra el ejemplar*.

## What Changes

**Backend** — un filtro, sin esquema nuevo:

* `GET /plants?code=` y `GET /species?code=`: coincidencia **parcial, sin distinguir mayúsculas**, sobre el código. `gruss` encuentra `CAT-GRUSS-01`, y `CAT-GRUSS-0` encuentra los diez primeros. Se combina con los demás filtros de plantas (localización, etiqueta) y con la paginación; un texto vacío no filtra.
* Los caracteres especiales de `LIKE` (`%`, `_`) se tratan como **texto literal**: nadie busca un comodín.

**Frontend**

* **Inventario**: la caja «Buscar» deja de ser maqueta y **busca por código** mientras se escribe, con un pequeño retardo, y aparece como filtro aplicado. Buscar por apodo o por especie sigue siendo T-21 y se declara en la propia caja.
* **Búsqueda global**: las plantas y las especies salen **del API, por código**, y se retiran sus entradas de ejemplo. Las localizaciones y las etiquetas siguen siendo datos de ejemplo —ya marcados— hasta T-21. Una respuesta tardía de una búsqueda anterior no pisa a la actual.

## Capabilities

### Modified Capabilities

- `plant-inventory`: el listado gana el filtro por código.
- `species-catalog`: el listado gana el filtro por código.
- `plant-dashboard`: la búsqueda por código en el inventario.
- `app-navigation`: la búsqueda global encuentra plantas y especies reales por su código.

## Non-goals

* **No se busca por apodo, nombre científico ni nombre común.** Es la búsqueda a escala de [T-21](../../../docs/tickets/T-21-inventario-a-escala.md), con su propio diseño (normalización de acentos, ordenación por relevancia, índices). Este change hace lo que el código permite sin ninguna de esas decisiones.
* **No hay endpoint de búsqueda unificado.** Cada listado filtra el suyo; el buscador global hace dos peticiones pequeñas, una por tipo. Un endpoint único que reparta por tipo es T-21.
* **No se buscan localizaciones ni etiquetas por código**: no tienen. Sus resultados de ejemplo se quedan, marcados, hasta T-21.
* **No hay ordenación por relevancia.** El orden es el del listado: los códigos más cortos no van primero por ser «más exactos».
* **Sin índice nuevo.** Una coincidencia parcial no se beneficia de un índice normal, y con una colección de 2000 plantas el recorrido es inmediato. Si T-21 mide lo contrario, será ese ticket quien lo añada.
* **El código de localización sigue fuera.**

## Impact

* `backend/` — `domain/specs/PlantSpecs.kt` y una especificación equivalente para especies, `PlantService.search`, `SpeciesService.list`, los dos controllers y los puertos. Tests de integración con Testcontainers.
* `frontend/src/features/` — servicios de plantas y especies, `search` (service y composable), el mock de búsqueda; `app/pages/plants/index.vue`.
* Sin cambios en el esquema ni en la infraestructura.
