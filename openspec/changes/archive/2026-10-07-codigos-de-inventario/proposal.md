# Proposal: codigos-de-inventario

**Ticket:** [T-15](../../../docs/tickets/T-15-codigos-de-inventario.md) — primera mitad: la identidad. La búsqueda por código es el change `busqueda-por-codigo`, que se propone después y depende de este.
**Historias:** sin escribir; sale del §6 del [documento de producto](../../../docs/producto/definicion-funcional-y-ux.md)
**Pantallas del prototipo:** `plants`, `plant-detail`, `plant-create`, `species`, `species-detail` y `species-editor` en [docs/wireframes/cactify-admin/index.html](../../../docs/wireframes/cactify-admin/index.html)

## Why

Un ejemplar no tiene identidad legible. Se identifica por un apodo —que cualquiera puede repetir o cambiar— y por un TSID de 18 cifras que nadie va a escribir en una etiqueta. Con 500 a 2000 plantas eso no escala: no se puede pegar una etiqueta en una maceta, ni dictar «la 24 de los grusonii», ni buscar una planta sin conocer su apodo.

El código resuelve eso: `CAT-GRUSS` para la especie y `CAT-GRUSS-01` para el ejemplar. Es estable, corto, imprimible y único. El prototipo lo pinta en casi todas las pantallas, y hoy lo inventa el frontend: `mockCode()` fabrica `CAT-GRUSS-<últimos dos dígitos del id>` en el inventario, y la ficha y el formulario usan una constante `MOCK_CODE`. Una planta mostrada con el código de otra es peor que una sin código.

Va antes que T-16 y T-21: la ficha ampliada, la búsqueda y las etiquetas físicas con QR dependen de que el código exista.

## What Changes

**Esquema** — una migración nueva (`V7`), con relleno de lo que ya hay:

* `species.code`: único, obligatorio, con su formato comprobado en la base.
* `species.next_sequence`: el contador del siguiente número de ejemplar de esa especie.
* `plant.code`: único, obligatorio e inmutable.
* Las especies y plantas existentes **reciben su código en la propia migración**, de modo que las columnas nacen `NOT NULL` sin un estado intermedio.

**Backend**

* **Código de especie.** Es **obligatorio al dar de alta**: lo escribe quien da de alta la especie (`CAT-GRUSS`), porque es el prefijo de las etiquetas que se van a pegar y no es un dato que el sistema deba adivinar. Se normaliza a mayúsculas y se rechaza si falta o no tiene el formato (`400`) o si ya existe (`409`).
* **Corrección del código de una especie.** Se puede cambiar **mientras la especie no tenga ejemplares**; con ejemplares responde `409` explicando que el código ya identifica plantas. Conservar el mismo código no es un cambio. Como la actualización es reemplazo completo, el código también va siempre en ella.
* **Código de ejemplar.** Se asigna al dar de alta como `código de especie + número correlativo` (`CAT-GRUSS-01`), **es inmutable** y no cambia ni al editar la planta ni al cambiarle la especie. Crece con naturalidad más allá de dos dígitos (`CAT-GRUSS-100`).
* **Generación segura.** El contador vive en la especie y se toma con **bloqueo de fila**, no con `MAX(...)+1`: dos altas simultáneas de la misma especie obtienen números distintos y consecutivos. Un número usado no se reutiliza.
* `code` viaja en las respuestas de especie y de planta, en el listado y en la ficha; la **ficha de especie** gana además su **recuento de ejemplares**, que es lo que permite al formulario saber si el código está bloqueado.

**Frontend** — sustituir el dato inventado por el real:

* El inventario, la cabecera de la ficha y la edición muestran el código del ejemplar que devuelve el API; se borran `mockCode()` y `MOCK_CODE`.
* El alta enseña **qué código llevará** la planta al elegir especie (`CAT-GRUSS-··`, el número se asigna al guardar), sin inventar el número.
* El formulario de especie gana el campo **Código**, obligatorio y **propuesto a partir del nombre científico** mientras se escribe; con ejemplares está deshabilitado y explica por qué.
* El catálogo y la ficha de especie muestran su código real.

## Capabilities

### Modified Capabilities

- `data-model`: nace el requisito de los códigos de inventario en el esquema.
- `species-catalog`: el código de la especie, obligatorio, y su corrección mientras no tenga ejemplares.
- `plant-inventory`: el código de ejemplar, su generación segura y su inmutabilidad.
- `plant-dashboard`: los códigos reales en inventario, ficha, alta, edición y especies.

## Non-goals

* **La búsqueda por código no entra aquí.** Filtrar `GET /plants` por código y que el buscador global encuentre ejemplares por él es `busqueda-por-codigo`, que necesita este change hecho. Partirlo deja cada change revisable y con un único tema.
* **No hay código de localización.** El `LOC-···` del prototipo es de las localizaciones y T-15 cubre especies y ejemplares. Queda para un ticket posterior; el esquema de este change no lo anticipa.
* **No hay QR ni etiquetas físicas.** El código es lo que imprimirán, pero generar el PDF con QR es otra pieza. La opción «Etiquetas físicas» de importar/exportar sigue siendo maqueta.
* **El formato del código no es configurable, y el sistema no lo genera.** El código de especie lo escribe una persona, así que no hay prefijo ni propuesta que configurar. La pantalla de configuración de códigos sigue siendo maqueta sin ticket.
* **El servidor no genera el código de especie.** Lo exige y lo valida. La **propuesta** (`Echinocactus grusonii` → `CAT-ECHIN`, las cinco primeras letras del género) es solo una comodidad del formulario: se rellena sola mientras se escribe el nombre y el usuario puede cambiarla. No comprueba la unicidad —eso lo dice el `409` junto al campo—, y el prototipo mezcla géneros y epítetos, así que no pretende ser *la* regla.
* **No se corrige un código de ejemplar.** Es inmutable por decisión: ni un administrador puede cambiarlo desde el API.
* **No se cambia el código de una especie con ejemplares.** Decidido: no. Si algún día hace falta, será un ticket con su propia migración de datos.
* **Sin recuento por fila ni lista de ejemplares de la especie.** La ficha de especie sí gana su recuento real —decide si el código se puede corregir—, pero la columna «Ejemplares» del catálogo (una consulta por fila) y la lista de ejemplares de la especie siguen siendo maqueta, ahora marcadas con T-21 (filtro de plantas por especie), que es quien las alimenta.
* **No se regenera el código al cambiar la especie** de una planta: se conserva el que tenía, aunque ya no coincida con el código de su especie actual. Es lo que pide el ticket y lo que permite que una etiqueta ya pegada siga siendo válida.

## Impact

* `backend/src/main/resources/db/migration/V7__inventory_codes.sql` — columnas, relleno (que sí necesita derivar un código para las especies ya existentes) y restricciones ([ADR-001](../../../docs/adr/ADR-001-flyway-para-migraciones.md), [ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)).
* `backend/` — `domain/Species.kt` y `domain/Plant.kt`, `application/SpeciesService.kt` y `PlantService.kt`, `SpeciesRepository` con la lectura bloqueante, DTOs, `SpeciesRequest`. Tests de integración con Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).
* `frontend/` — tipos, `PlantForm`, `PlantHeader`, inventario, edición, `SpeciesForm`, catálogo y ficha de especie; se retiran dos mocks.
* `docs/diagramas/modelo-datos-actual.md` y el modelo del `README.md` (cambia el esquema) y el borrador de gestión (lo hecho sale de «pendiente»).
