# Proposal: buscador-global-y-exportacion

**Ticket:** [T-21](../../../docs/tickets/T-21-inventario-a-escala.md) — **3 de 3**, el último: cierra el ticket. **Depende de** `filtros-y-orden-del-inventario` (reutiliza `q`, el lenguaje de filtros y que el estado de la pantalla sea su URL) y de `vistas-guardadas-y-grupos-de-especies` (los criterios `PlantCriteria`/`SpeciesCriteria` que extrae, para que listado y exportación no puedan divergir).
**Historias:** [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md), [1.17](../../../docs/user-stories/1.17-vistas-guardadas-del-inventario.md) («se puede exportar el resultado de la vista»), [1.19](../../../docs/user-stories/1.19-importar-y-exportar-datos.md) (solo la mitad de exportar el resultado filtrado)
**Pantallas del prototipo:** `plants` y `species` (barra de herramientas) y la búsqueda global de la barra superior; `transfer` **no** se toca (ver Non-goals)
**Producto:** §5.1, §19 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

El buscador global de la barra superior encuentra **plantas y especies por código** y, para localizaciones y etiquetas, devuelve resultados de ejemplo marcados `· ejemplo`: es la última pieza de maqueta del buscador, y con 500–2000 ejemplares buscar por **apodo o nombre de especie** desde cualquier pantalla es lo que de verdad se hace. Por otro lado, el inventario filtrado no se puede sacar de Cactify: §5.1 pide «exportación de los resultados filtrados» y §19 «exportar el inventario completo o el resultado de un filtro». Con un lenguaje de filtros ya común (`q`, `species`, `status`…), exportar es **la misma consulta con otro formato**.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change: los filtros y el orden se expresan como parámetros planos y las vistas son consultas guardadas. De ahí se derivan las dos de este change, que **conviene confirmar** al revisarlo:

* **No hay endpoint de búsqueda unificado.** El buscador pide en paralelo `q` a los cuatro listados (plantas, especies, localizaciones, etiquetas): sin una superficie nueva, con la misma convención (ADR-016) y conservando que **cada tipo falle por separado**. El comentario del service actual anticipaba un endpoint único; se descarta con su motivo en el design.
* **La exportación es un `GET` con los mismos filtros que el listado**, con `/export` como sufijo, no un trabajo en segundo plano.

## What Changes

**Backend**

* **`GET /locations` y `GET /tags` ganan `q`** (nombre y código de la localización; nombre de la etiqueta), con el mismo tratamiento que en plantas y especies: parcial, sin distinguir mayúsculas, comodines como texto, en blanco no filtra.
* **`GET /plants/export` y `GET /species/export`** devuelven un **CSV** (`text/csv; charset=utf-8`, con BOM para que Excel lo abra bien, como descarga con nombre fechado) con **exactamente las filas que devolvería el listado** con los mismos parámetros, sin paginar. El resultado se acota por una configuración (`EXPORT_MAX_ROWS`, 5.000 por defecto): si lo supera **no se trunca en silencio**, responde `422` diciendo cuántas filas son y que hay que afinar. Toda celda que empiece por `=`, `+`, `-`, `@` o tabulador se neutraliza para que una hoja de cálculo no la interprete como fórmula.
* **ADR-017 — Exportación a CSV** (nace de este change; lo reutilizan T-24 y la importación): formato, codificación, acotación, neutralización de fórmulas y que exportar es un `GET` que comparte el lenguaje de filtros.

**Frontend**

* **Buscador global**: busca de verdad en los cuatro tipos y desaparece la maqueta (`search.mock.ts` y las marcas `· ejemplo`). Plantas se buscan por código, apodo y especie; especies por nombre y código. Cada grupo con más resultados de los que caben ofrece **«Ver los N resultados»**, que abre el inventario o el catálogo ya filtrado con `?q=`.
* **Exportar** en las barras de herramientas de `/plants` y `/species`: un botón que **declara su alcance antes de ejecutar** («Exportar 486 resultados») y descarga el CSV del estado actual de la pantalla —filtros y orden—. Con un resultado por encima del máximo el servidor responde `422` y la pantalla muestra su mensaje: el frontend no duplica el máximo.
* **Kit**: `UiGlobalSearch` admite un enlace «Ver todos» por grupo.

## Non-goals

* **La pantalla `transfer` (Importar / exportar) y la importación**: no tienen ticket todavía —`CLAUDE.md` ya lo señala— y siguen como maqueta marcada. Este change es la exportación **desde el listado**; el panel de exportación del prototipo (contenido a elegir, XLSX, PDF de etiquetas, actividad reciente) es de ese ticket.
* **XLSX y PDF**: solo CSV.
* **Constancia de las exportaciones** (1.19: «queda constancia de las operaciones»): sin usuarios ni un registro de actividad, no hay a quién atribuirla.
* **Exportar historial de cuidados, movimientos o fotografías**: el CSV es la tabla del listado, con columnas fijas; la cronología es T-20.
* **Las columnas visibles de la tabla no gobiernan el CSV**: la exportación lleva siempre el conjunto completo, que es lo útil fuera de Cactify. Ocultar una columna es presentación.
* **Búsqueda sin acentos, difusa o por relevancia**; ranking del código exacto.
* **Exportar una vista guardada por nombre**: se exporta el estado actual de la pantalla, que incluye una vista aplicada.
