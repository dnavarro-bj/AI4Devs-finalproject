# Proposal: especie-ampliada

**Ticket:** [T-17](../../../docs/tickets/T-17-especie-ampliada.md) — completo.
**Historias:** [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md)
**Pantallas del prototipo:** `species-detail` y `species-editor` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)
**Producto:** §9.2–§9.5 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

La especie sabe cuánta humedad, temperatura y luz admite, pero no **cómo** se cultiva: qué intensidad de sol pide, si va dentro o fuera, cuándo crece, cuándo descansa, cuándo florece y cuánto riego tolera en cada época. La ficha de especie ya reserva su sitio para todo eso —la rejilla «Año de cultivo», el perfil de floración, exposición y entorno— y hoy lo muestra **marcado como maqueta con T-17**. Es lo que desbloquea agrupar por características (T-21) y que las recomendaciones y tareas tengan en cuenta la época.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **«Soleado» frente a «pleno sol» (§24.6):** no hay umbral numérico. Se mantienen los cuatro valores y el formulario enseña **la definición funcional de cada uno** bajo el selector. Un umbral de horas acoplaría exposición y luz, y el ticket pide que ninguna derive de la otra.
* **Entorno de tres valores (§9.3):** interior, exterior o ambos. **No hay «estacional»**: la estacionalidad la dicen los periodos del calendario.

Y la decisión del [borrador de gestión](../../../docs/diagramas/borrador-modelo-datos-gestion.md) del 6 oct 2026, que **prevalece sobre el texto del ticket**: un **único calendario** de periodos por tipo —`crecimiento`, `reposo`, `floracion`, `riego`— y la floración deja de ser columnas para ser una fila más. El tipo `transicion` que citaba el ticket desaparece porque nadie lo pide; el ticket se corrige al cerrar.

## What Changes

**Esquema** — migraciones `V10` y `V11` (`crecimiento_maximo`): `species` gana `description`, `sun_exposure`, `environment` y cuatro datos de floración (`bloom_description`, `bloom_color`, `bloom_maturity`, `bloom_typical_duration`), **todos nulables**: las especies existentes no tienen valor que inventar, y «sin definir» es una respuesta honesta. Nueva tabla `species_period` con tipo, mes de inicio y de fin (1–12), intensidad y notas.

**Backend**

* `POST` y `PUT /species` aceptan los campos nuevos y la lista de `periods`; **`PUT` es reemplazo completo**, así que la lista que llega sustituye a la guardada y omitirla deja la especie sin calendario.
* **Un periodo puede cruzar el fin de año** (noviembre a febrero = inicio 11, fin 2). Dentro de un mismo tipo los periodos **no se solapan**, contando el cruce de año. La intensidad es obligatoria en `riego` y está prohibida en los demás.
* `GET /species/{id}` devuelve todo lo anterior; el listado no cambia.
* Los valores de exposición y entorno son enums con `value` explícito (ADR-007); un valor desconocido es un `400`, nunca un `500`.

**Frontend**

* La ficha deja de marcar maquetas: exposición y entorno reales, la rejilla «Año de cultivo» con los periodos, el perfil de floración con sus cuatro datos y la descripción en la cabecera.
* El formulario gana la sección «Crecimiento y floración» con selector de meses, y exposición, entorno y descripción en las que ya tiene. **Exposición como tarjetas con su definición visible**.
* **El calendario se edita sobre la propia rejilla del año**, como la de la ficha, y no con selectores: cada mes es pulsable y cada pulsación sube la intensidad (crecimiento en dos niveles, riego en tres; reposo y floración, uno). Es el `UiYearGrid` del kit con un modo `editable`.
* **Crecimiento máximo**: los meses en que la especie más crece, superpuestos al crecimiento (segunda pulsación). Es un tipo de periodo más, `crecimiento_maximo`, que debe caer dentro del crecimiento; migración `V11`.

## Capabilities

### Modified Capabilities

- `data-model`: columnas nuevas de `species`, tabla `species_period` y sus restricciones.
- `species-catalog`: el contrato del API de especies con los campos nuevos y el calendario.
- `plant-dashboard`: la ficha y el formulario de especie.
- `design-system`: la pauta anual editable.

## Non-goals

* **Sin «Estacional» en el entorno**, aunque el prototipo lo dibuje: decisión del usuario. Se marca como desviación consciente del wireframe.
* **Las «Notas de cultivo» del editor del prototipo no entran**: ni el ticket ni el borrador les dan campo. Queda anotado, no inventado.
* **Fotografías, grupos de cultivo y la lista de ejemplares siguen marcados** (T-19, T-21): no son de este ticket.
* **La exposición y el entorno de la planta no se sobrescriben** por ejemplar en este change; el modelo de [`cuidados-por-ejemplar`](../archive/2026-10-07-cuidados-por-ejemplar/proposal.md) admite añadirlos después.
* **La IA no usa todavía el calendario ni la exposición.** Entran en el contexto del análisis en un change propio.
* **Las notas de un periodo no se editan.** La rejilla no tiene dónde ponerlas: el API las admite, pero guardar desde el formulario las deja vacías.
* **Sin hemisferio ni clima**: los periodos son pauta de referencia para clima mediterráneo, como dice la maqueta.

## Impact

* `backend/src/main/resources/db/migration/V10__species_ampliada.sql`; `domain/` (`Species`, `SpeciesPeriod`, los enums, la validación del calendario), `SpeciesService`, DTOs y controller. Tests con Testcontainers.
* `frontend/` — tipos, service, mapper del calendario a filas de `UiYearGrid`, `SpeciesForm`, la ficha.
* `docs/diagramas/modelo-datos-actual.md`, el borrador de gestión, `README.md` y el ticket T-17.
