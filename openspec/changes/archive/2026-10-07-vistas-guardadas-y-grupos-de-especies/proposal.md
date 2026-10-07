# Proposal: vistas-guardadas-y-grupos-de-especies

**Ticket:** [T-21](../../../docs/tickets/T-21-inventario-a-escala.md) — **2 de 3**. **Depende de** `filtros-y-orden-del-inventario` (archivado): guarda **su** lenguaje de filtros y orden.
**Historias:** [1.17](../../../docs/user-stories/1.17-vistas-guardadas-del-inventario.md), [1.18](../../../docs/user-stories/1.18-agrupar-especies-por-caracteristicas.md)
**Pantallas del prototipo:** `plants` (el botón «Configurar columnas» y la barra de filtros) y `species` (la fila `species-groups`, «Grupos de cultivo guardados») en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §5.1 y §15.1 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

Con 500–2000 ejemplares la gente trabaja siempre con las mismas combinaciones («las de Invernadero 1 en cuarentena», «las sensibles al frío»), y hoy tiene que reconstruirlas cada vez. El producto pide guardar una combinación de filtros, orden y columnas con un nombre (§5.1) y agrupar especies por cultivo **sin duplicar datos** (§15.1). Las dos cosas son la misma: **una consulta con nombre**. Un grupo de especies es una vista guardada del catálogo; una vista del inventario, una del listado de plantas.

## Decisiones de partida

* **Solo grupos dinámicos** (§24.11, resuelta): no hay lista de especies que mantener; entrar y salir de un grupo es consecuencia de evaluar su regla.
* **Las vistas viven en el backend**, en una tabla, no en el navegador: sobreviven al cambio de equipo y los grupos son datos de la colección, no preferencias de un navegador. Aún no hay usuarios, así que son **globales a la colección**.
* Una vista **es** la *query string* de `filtros-y-orden-del-inventario`: lo que se guarda es exactamente lo que `useUrlState` ya escribe en la URL.

## What Changes

**Esquema** — migración `V14` (el siguiente número libre tras `V13` de `cronologia-del-ejemplar`; si ese change aún no estuviera archivado, se toma el siguiente libre en ese momento): `saved_view(id, scope, name, query, columns, created_at, updated_at)`. `scope` ∈ `plants`, `species`; el nombre es único por ámbito **sin distinguir mayúsculas ni espacios de los extremos** (el mismo criterio que `tag`); `columns` solo se admite en `plants`.

**Backend**

* `POST /saved-views`, `GET /saved-views?scope=` (paginado, ADR-009), `GET/PUT/DELETE /saved-views/{id}`.
* Al guardar, el servidor **interpreta la consulta con el mismo criterio que el listado** y rechaza con `400` lo que el listado rechazaría: una vista no puede quedar guardada ya inservible. La paginación (`page`, `size`) no forma parte de una vista y se descarta si llega.
* Una vista cuyo valor deja de existir más tarde (una localización retirada) **no falla**: devuelve un resultado vacío, igual que el listado.
* En el ámbito `species`, cada vista trae `matchCount`: cuántas especies cumplen **hoy** su regla (una consulta de recuento por grupo, no una por especie). En `plants` no se calcula: es una consulta cara por vista y ninguna pantalla lo pide.

**Frontend**

* **Inventario**: un selector «Vistas» junto a la barra de herramientas —aplicar, «Guardar la vista actual…», renombrar, reemplazar con el estado actual, borrar—. Aplicar una vista **escribe su estado en la URL** (filtros, orden y columnas) y la pantalla no sabe si vino de una vista o de un enlace.
* **Especies**: la fila de **grupos de cultivo** del prototipo con «Todas» y un grupo por vista guardada, con su recuento, y «Guardar los filtros como grupo…». El grupo seleccionado es el que **coincide con la URL**.
* **Kit**: `UiGroupNav` —la navegación de grupos con símbolo, nombre y subtítulo del prototipo—, con su test y su muestra en `/ui-kit`.

## Non-goals

* Grupos manuales, perfiles de cuidado reutilizables (§15.2), vistas compartidas por usuario y vista por defecto: no hay usuarios todavía y no hay evidencia de que hagan falta.
* **Los grupos de la historia 1.18 se limitan a los filtros que existen**: exposición, entorno, sustrato, temperatura mínima, crecimiento y floración. **Horas de luz, humedad y riego** no tienen filtro (los dejó fuera el change 1) y por tanto no pueden formar parte de un grupo; añadirlos es ampliar el filtro y se haría ahí.
* Símbolos y colores por grupo: el símbolo se **deriva** (☼ y ◐ por exposición, el neutro en el resto), no se guarda.
* Semillas de ejemplo: no se siembran los cuatro grupos del prototipo. Un grupo es dato del usuario; la pantalla vacía ofrece crearlos.
* Orden manual de las vistas, carpetas y fijar vistas en la navegación lateral.
* Exportar una vista: change 3.
