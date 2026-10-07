# Proposal: filtros-y-orden-del-inventario

**Ticket:** [T-21](../../../docs/tickets/T-21-inventario-a-escala.md) — **1 de 3**: el lenguaje de filtros y orden y su uso en inventario y catálogo de especies. Lo siguen `vistas-guardadas-y-grupos-de-especies` y `buscador-global-y-exportacion`.
**Historias:** [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md), [1.17](../../../docs/user-stories/1.17-vistas-guardadas-del-inventario.md) (columnas y ordenación), [1.18](../../../docs/user-stories/1.18-agrupar-especies-por-caracteristicas.md) (los filtros que luego se guardan)
**Pantallas del prototipo:** `plants` y `species` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §5.1 y §15 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

Con 500–2000 ejemplares el inventario solo se puede recorrer: filtra por localización, etiqueta, estado y código, pero **no por apodo ni por especie**, y el filtro de especie del prototipo está en pantalla como maqueta marcada con T-21. La ordenación acepta cualquier propiedad que el cliente escriba: `sort=species` ordena por la clave de la FK, no por el nombre, así que la columna «Especie» ordena **plausible y mal**. El catálogo de especies, por su parte, solo filtra por código, aunque el prototipo pinta Exposición, Temperatura, Riego y Crecimiento.

Y no existe una convención escrita: cada filtro nuevo se ha inventado su forma. Las vistas guardadas (change 2) y la exportación (change 3) necesitan **un lenguaje único y serializable** de filtros y orden; este change lo fija antes de que dos más lo den por hecho.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **Parámetros planos y `sort`**, no un cuerpo de búsqueda: se conserva lo que ya hay (`tag`, `status`, `location`, `code`) y se añade lo nuevo con la misma forma. Una vista guardada será, sencillamente, una *query string*.
* **Solo grupos dinámicos** de especies (§24.11): cierra la pregunta; los grupos son filtros guardados (change 2).
* **«Última revisión» y «nivel de atención» quedan fuera** de la ordenación: dependen de T-20 y T-23. Se ven en el selector como no disponibles, con su ticket.

## What Changes

**ADR-016 — Filtros y orden en los listados** (nace de este change): parámetros planos; repetible = cualquiera de los valores (`OR`) salvo `tag`, que ya es `AND`; criterios sin valor no filtran; `sort=<clave>,<asc|desc>` con **claves públicas por recurso** y no propiedades de entidad; clave u opción desconocida → `400`; desempate por `id` para que el orden sea estable.

**Backend**

* **`GET /plants`** gana `q` (texto parcial sobre código, apodo y nombre científico y común de la especie), `species` (repetible), `exposure` y `environment` (repetibles, **de la especie**). Orden: `code`, `nickname`, `species`, `location`, `createdAt` —`species` y `location` ordenan por **nombre**, no por id—. Una clave de orden desconocida responde `400`.
* **`GET /species`** gana `q` (científico, común y código), `exposure`, `environment`, `soilMix`, `minTemperatureFrom`/`minTemperatureTo`, y `growthMonth` y `bloomMonth` (repetibles, AND: la especie tiene un periodo que cubre **todos** los meses pedidos, contando el que cruza fin de año). Orden: `code`, `scientificName`, `commonName`, `exposure`.

**Frontend**

* **Inventario** (`plants`): la caja pasa a «Código, apodo o especie» y busca por `q`; el selector de **Especie** deja de ser maqueta; «Más filtros» trae exposición, entorno y etiqueta; los criterios aplicados se ven y se quitan uno a uno (ya existe en `UiFilterBar`). **Los filtros, el orden y las columnas viven en la URL**: recargar o compartir el enlace reproduce la pantalla, y es lo que el change 2 guardará con nombre.
* **Especies** (`species`): la barra de filtros del prototipo —búsqueda, exposición, temperatura, crecimiento— con criterios aplicados, el filtro «Mostrando N de 74 especies» y orden por columna.
* **Marcados con su ticket en su sitio:** «Última revisión» (T-20) y «Atención» (T-23) como criterio de orden no disponible; selección múltiple y acciones por lote siguen en T-22/T-24; las vistas guardadas y los grupos de la fila superior de especies son el change 2.

## Non-goals

* Vistas guardadas, columnas guardadas y grupos de especies: change 2.
* Buscador global unificado y exportación CSV: change 3.
* Búsqueda sin acentos ni difusa: el texto parcial es sensible a acentos hasta que haya evidencia de que molesta (se anota en el design).
* Filtro por riego (`wateringGuideline` es texto libre) y orden por número de ejemplares: sin modelo estructurado, no hay filtro honesto.
* Índices por rendimiento: se **miden** con 2000 ejemplares y se decide en el design; no se añaden por anticipado.
