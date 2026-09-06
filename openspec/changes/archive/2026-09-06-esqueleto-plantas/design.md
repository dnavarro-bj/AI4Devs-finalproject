# Design: esqueleto-plantas

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-dashboard/spec.md).

De lo que se parte:

* Las tres pantallas de T-05, ya migradas a features en T-25: piden por `usePlants`, que devuelve `ServiceResponse`.
* El kit tiene 30 componentes; todos los que la ficha necesita existen ya.
* `careRecordsApiService.list()` existe desde T-25 y **nadie lo llama**.
* Ocho ficheros de test de T-05 cubren el comportamiento actual.

Restricciones: [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md) —capas, `ServiceResponse`, mocks por el service—, [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md) —tokens, componer sobre el kit— y [ADR-013](../../../docs/adr/ADR-013-acceso-del-navegador-al-api.md) —los datos se piden ya montada la pantalla—.

## Goals / Non-Goals

**Goals:**

* Que la ficha se parezca al wireframe **y** que se sepa, mirándola, qué es dato y qué es maqueta.
* Que sustituir un mock por su API en el bloque 1 sea cambiar el service, no la pantalla.

**Non-Goals:** los de la propuesta. A nivel de diseño: no se añade ningún componente al kit — si algo lo necesitara, sería señal de que T-11 o T-12 se dejaron algo, y se anota en vez de resolverlo aquí.

## Decisions

### Los datos de ejemplo se marcan en la interfaz, no solo en el código

Cada bloque que pinta datos que el API no sirve lleva una marca visible que lo dice.

**Por qué**: una ficha con código de inventario, estado y fotografía inventados es indistinguible de una que funciona. El riesgo no es técnico sino de criterio: alguien la enseña, la da por hecha y luego el bloque 1 «rompe» algo que nunca existió. Marcarlo en el código —un comentario, un fichero aparte— protege al programador; marcarlo en la pantalla protege la conversación sobre el producto.

**Descartado**: no pintar lo que no hay. La ficha quedaría irreconocible frente al wireframe y no serviría para validar la composición, que es justo lo que este change busca.

### Un mock por feature, en su carpeta, nombrando su ticket

`src/features/plants/mocks/plantDetail.mock.ts` y compañía, cada uno con la cabecera diciendo qué ticket lo borra. Los consume **el service**, nunca el componente.

**Por qué**: es lo que ADR-015 fija y lo que hace que T-15, T-16, T-19 y T-22 sean sustituir la fuente. Un mock leído desde el componente sobreviviría a la conexión.

### La cabecera y los paneles son componentes de la feature

`PlantHeader`, `PlantCareProfile`, `PlantWorkPanel` viven en `src/features/plants/components/`, no en el kit.

**Por qué**: el kit es lo que se reutiliza entre pantallas; una cabecera de ejemplar es de esta pantalla. La regla de ADR-014 —un patrón nuevo va al kit— habla de patrones de presentación recurrentes, no de composiciones de un solo uso.

### El análisis de IA se pide por entrada, bajo demanda

Cada entrada de la cronología ofrece ver o generar su análisis, y solo entonces se llama al API.

**Por qué**: pedir el análisis de cada lectura al abrir la ficha son N peticiones para mostrar algo que casi nunca se mira entero, y `GET` devuelve `404` cuando no hay —que **no es un error de la pantalla**, sino «todavía no se ha pedido»—. `isNotFound` de `errorNormalizer` está justo para esto.

**Descartado**: pedirlos todos al cargar. Con una planta de dos años de lecturas, la ficha tardaría en abrir por información secundaria.

### La cronología recibe eventos, no lecturas

Las lecturas se traducen a eventos de `UiTimeline` en el composable; los eventos mockeados —riego, foto, floración, movimiento— se mezclan ahí mismo, ya ordenados por el componente.

**Por qué**: `UiTimeline` no conoce los tipos del producto (T-12), y así T-20 sustituirá la traducción por el historial real del API sin tocar la pantalla.

### La edición guarda lo que puede y avisa de lo que no

El formulario compartido persiste los tags —lo único que el API admite— y, al confirmar, advierte de que el resto no ha llegado al servidor.

**Por qué**: es la única salida honesta mientras no exista el endpoint. Un formulario que parece guardar y no guarda es peor que uno que no deja editar, porque el usuario cree tener un dato que no tiene.

**Descartado**: deshabilitar la edición entera. La composición del formulario compartido es justo lo que este change tiene que validar, y sin construirla no se valida.

## Risks / Trade-offs

* **La ficha con maqueta puede darse por terminada** → cada bloque mockeado lo dice en pantalla, y los ficheros de mock nombran su ticket. Aun así conviene no enseñarla como producto acabado.
* **Es la pantalla más grande del proyecto** y puede volverse un fichero enorme → se parte en componentes de feature por bloque —cabecera, resumen, cronología, paneles—, cada uno con su test.
* **Los tests de T-05 cubren la ficha anterior**, que desaparece → su *comportamiento* se conserva: registrar una lectura, ver los cuidados, generar el análisis y el error de planta inexistente. Lo que cambia es dónde está el formulario, así que esos tests **sí** se tocan en los pasos que abren el diálogo. Se acota a eso y se comprueba con `git diff` que no se relaja ninguna aserción.
* **`GET /plants/{id}/care-records` no se ha usado nunca**, así que su forma real está sin verificar contra el frontend → la tarea que lo estrena comprueba la respuesta contra el backend levantado antes de construir sobre ella.
