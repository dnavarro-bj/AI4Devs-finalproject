# Design: catalogo-especies

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-dashboard/spec.md).

De lo que se parte:

* `/species` y `/species/[id]` son dos de las doce pantallas marcador de T-10.
* `catalogsApiService` ya tiene `listSpecies` y `speciesCare`, que usa el alta de planta. Le faltan crear, corregir y retirar.
* El kit tiene 34 componentes; todos los que estas pantallas necesitan existen ya, incluidos `UiEditorNav` y `UiSummaryGrid`, que nacieron en el change anterior.
* El API: `GET /species` devuelve **solo** `id`, nombre científico y común; `GET /species/{id}` añade los seis rangos y la pauta de riego. Ni recuento de ejemplares, ni mezcla de sustrato.

## Goals / Non-Goals

**Goals:**

* Cumplir la historia 0.6 en la interfaz, que es donde falta.
* Que la ficha reserve el sitio de lo que llega en T-17 sin fingir que ya está.

**Non-Goals:** los de la propuesta. A nivel de diseño: **no se añade ningún componente al kit**. Si algo lo necesitara, sería señal de que T-11 o T-12 se dejaron algo, y se anota en vez de resolverlo aquí.

## Decisions

### El service de especies se separa de `catalogs`

Nace `species.api.service.ts` en su feature, y `catalogsApiService` conserva `listSpecies` y `speciesCare` mientras el alta de planta los use.

**Por qué**: las especies dejan de ser «un catálogo que puebla un selector» para ser un dominio con su CRUD. Meter cuatro operaciones más en `catalogs` lo convertiría en el cajón donde acaba todo lo que no es una planta.

**Descartado**: mover también lo que usa el alta de planta en este change. Tocaría `PlantForm` sin necesidad; se hará cuando `catalogs` se reduzca a localizaciones y etiquetas.

### El `409` se traduce en la pantalla, no en el service

`errorNormalizer` ya devuelve `CONFLICT` para un `409`; la ficha lo traduce a «no puede retirarse mientras tenga ejemplares».

**Por qué**: el código es del transporte y el mensaje es del dominio de esa pantalla. Un service que supiera qué significa un `409` *aquí* estaría decidiendo por la pantalla, y el mismo código significa otra cosa en otro sitio.

**El mensaje del API se prefiere al propio** cuando viene: lo escribe quien conoce la regla. El texto de la pantalla es la red por si llega un cuerpo sin `message`.

### La validación de rangos es del cliente y también del servidor

El formulario comprueba que cada mínimo no supere a su máximo antes de enviar.

**Por qué**: es una comprobación de rango, que es justo lo que [ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md) permite en el borde. Evita un viaje de ida y vuelta para algo que se sabe sin preguntar. **No sustituye a la del servidor**: el `CHECK` de la base de datos sigue siendo la autoridad, y si el API rechaza, se pinta su mensaje.

### El error de nombre duplicado se ata a su campo

Un `409` en el alta se muestra bajo el nombre científico, no como aviso general.

**Por qué**: el usuario tiene que corregir *ese* campo. Un error general en la cabecera de un formulario de seis secciones obliga a buscar cuál, que es el mismo problema que ya resolvió la navegación por secciones.

### La retirada pide confirmación en un diálogo

Con el nombre de la especie en el propio texto.

**Por qué**: es irreversible y afecta a un catálogo compartido. `UiDialog` ya resuelve foco, escape y devolución del foco, así que no hay que rehacerlo.

## Risks / Trade-offs

* **La ficha es en buena parte hueco reservado** —exposición, entorno, pauta anual, floración y fotografías son T-17 y T-19— y puede parecer vacía → cada sección dice qué ticket la llena, igual que en la ficha de planta. Es incómodo de ver, pero es lo que hay.
* **El recuento de ejemplares es mock** y aparece en dos sitios —catálogo y ficha— → sale de un único fichero de mocks, para que T-15 lo borre de una vez.
* **Retirar una especie desde el catálogo cambia el listado bajo los pies** → la retirada vive solo en la ficha, y al confirmarse vuelve al catálogo ya recargado.
* **`PUT /species/{id}` no se ha usado nunca desde el frontend**, así que su forma real está sin verificar → la primera tarea la comprueba contra el backend levantado antes de construir sobre ella.
