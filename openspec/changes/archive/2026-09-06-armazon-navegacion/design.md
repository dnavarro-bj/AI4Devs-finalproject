# Design: armazon-navegacion

## Context

Ver [proposal.md](proposal.md) para la motivación.

Estado del que se parte:

* `layouts/default.vue` ya es el armazón de [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md): barra lateral, barra superior con breadcrumbs y contenido con ancho máximo. Su navegación es una constante `SECTIONS` de un solo elemento y su barra superior no aloja nada más que los breadcrumbs.
* `useBreadcrumbs` los fija la pantalla y los limpia el router en cada navegación. No se derivan de la ruta a propósito: `/plants/882687672222443468` daría un TSID como último nivel.
* El kit tiene quince componentes con las reglas de ADR-014 —un solo elemento raíz, cero valores literales, muestra en `/ui-kit`—, vigiladas por `test/design-tokens.spec.ts`.
* No hay endpoint de búsqueda: T-08 y T-02 exponen listados filtrables, no búsqueda por texto.

Restricción de fondo: los datos se piden desde el cliente y no en renderizado de servidor ([ADR-013](../../../docs/adr/ADR-013-acceso-del-navegador-al-api.md)).

## Goals / Non-Goals

**Goals:**

* Que añadir una sección sea declararla en un sitio, no editar tres.
* Que las doce pantallas por construir se comporten igual entre sí, para que T-13 y T-14 solo tengan que reemplazar el cuerpo.
* Que el buscador nazca con su contrato de accesibilidad cerrado, porque conectarlo al API en T-21 no debe obligar a rediseñarlo.

**Non-Goals:**

* Ver los *Non-goals* de la propuesta. A nivel de diseño se añade uno: **no se introduce gestión de estado nueva**. El buscador no necesita store; sus datos de ejemplo son un módulo estático.

## Decisions

### El mapa de secciones es un módulo de datos, no marcado

Las cuatro agrupaciones y sus entradas viven en un único módulo (`app/navigation.ts`) que exporta la estructura; `layouts/default.vue` la recorre y `UiNavGroup` pinta cada grupo.

**Por qué**: la alternativa —escribir los grupos a mano en el `<template>`— obliga a tocar el layout cada vez que T-13 o T-14 construyen una pantalla, y hace que «marcar la sección activa» tenga que repetirse por entrada. Con el mapa como dato, la sección activa se calcula una vez y las pantallas siguientes solo cambian una línea.

**Descartado**: derivar el mapa del sistema de ficheros de Nuxt. Nuxt sabe qué rutas existen, pero no a qué agrupación pertenecen ni con qué etiqueta se llaman en el menú, así que haría falta el mismo módulo de todos modos.

### La sección no construida es un componente, no doce copias

Las doce rutas pendientes montan todas el mismo componente de marcador, parametrizado con el título y el ticket que la construirá. Cada una es un `.vue` de cuatro líneas que fija sus breadcrumbs y lo invoca.

**Por qué**: doce estados vacíos escritos a mano divergen en cuanto alguien edite uno. Y como todas comparten forma, T-13 y T-14 reemplazan el cuerpo sin tocar breadcrumbs ni cabecera.

**Descartado**: una única ruta comodín que resuelva las doce. Ahorraría ficheros, pero Nuxt dejaría de conocer las rutas —lo que rompe el prerenderizado y el aviso de ruta inexistente— y el requisito de «dirección desconocida» quedaría sin sitio donde vivir.

### `UiGlobalSearch` recibe los resultados; no sabe buscar

El componente acepta el texto y una lista de resultados ya agrupados, y emite la selección. Quien busca es el layout, hoy contra un módulo de datos de ejemplo y en T-21 contra el API.

**Por qué**: es lo que hace que T-21 sea sustituir la fuente y no reescribir el componente. Además mantiene la regla del kit: los componentes componen presentación, no acceden a datos.

**Descartado**: que el componente llame al API. Ataría un componente del kit a `useApi`, y ningún otro del kit lo hace.

### El patrón accesible es *combobox* con lista de resultados

El campo se expone como búsqueda con su lista asociada; las flechas recorren los resultados, `Enter` activa el enfocado y `Escape` cierra. Los grupos se anuncian como tales.

**Por qué**: es el patrón que las tecnologías de asistencia ya conocen, y ADR-014 hace de la accesibilidad parte del contrato del componente, verificable en lo que `happy-dom` observa —marcado, ARIA y foco—.

**Riesgo asumido**: `happy-dom` no mide foco visual ni lectura real de un lector de pantalla. Se verifica el marcado y el movimiento del foco con test, y lo visual a ojo en la galería.

### Las rutas se unifican en inglés

Todas las direcciones pasan a inglés, incluida `/plants/nueva` → `/plants/new`.

**Por qué**: el proyecto ya separa idioma de documentación de idioma de código —español el primero, inglés el segundo— y una URL es un identificador. Hoy conviven las dos formas por accidente, no por decisión.

**Coste**: es un cambio observable. Se asume ahora porque la aplicación no tiene usuarios ni enlaces externos, y doce rutas nuevas fijarían la mezcla como norma.

**Descartado**: redirección de la ruta antigua. No hay nada a lo que dar continuidad, y dejaría una redirección viva para siempre por un caso que no existe.

### La cabecera de página la pinta cada pantalla, no el armazón

`UiPageHeader` se usa dentro del `<slot />` del layout, por la pantalla que conoce su título; el armazón no lo renderiza.

**Por qué**: el título es de la pantalla. Que lo pintase el layout obligaría a un segundo estado global como `useBreadcrumbs`, y a que cada pantalla lo fijase desde `setup` para que el layout lo leyera después — un rodeo para acabar en el mismo sitio. Los breadcrumbs sí lo necesitan porque los pinta la barra superior, que está fuera del slot.

**Descubierto al implementar**: la tarea 5.4 decía «colocar `UiPageHeader` en el área de contenido», que se leía como que lo montaba el layout. No lo monta.

### Los datos de ejemplo del buscador viven aparte y se marcan

Un módulo propio (`app/fixtures/`), no constantes sueltas dentro del layout, con un comentario que dice de qué ticket es el reemplazo.

**Por qué**: T-21 tiene que poder borrar el fichero entero y saber que no se deja nada. Datos falsos mezclados con lógica real es exactamente lo que sobrevive a la conexión y acaba en producción.

### Ninguna decisión nueva merece ADR

Todo lo anterior o se apoya en [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md) —el kit, el armazón en el layout, la accesibilidad como contrato, la galería viva— o es una decisión de este change. La unificación de rutas en inglés es la única candidata a transversal; se deja anotada aquí y se promocionará a ADR si un change posterior necesita volver a decidirla.

## Risks / Trade-offs

* **El buscador contra datos falsos puede parecer terminado y quedarse así** → el módulo de fixtures nombra a T-21 en su cabecera, y la tarea de T-21 empieza por borrarlo.
* **Doce pantallas marcador pueden confundirse con pantallas rotas** → el estado vacío dice explícitamente que la sección está por construir, y no simula datos.
* **Renombrar `/plants/nueva` toca los tests de T-05**, que la propuesta se compromete a no modificar → el compromiso es sobre su *comportamiento*: si alguno referencia la ruta literal, se ajusta esa cadena y nada más. Se comprueba con `git diff` que el cambio en esos ficheros es solo la ruta.
* **Crecer la barra lateral a cuatro grupos reduce el sitio en pantallas cortas** → los grupos no se pliegan en esta entrega; si a partir de T-14 la lista no cabe, se replantea entonces y no antes.

## Migration Plan

No aplica: sin esquema, sin datos y sin API. El único paso observable es el renombrado de la ruta de alta, que entra con el resto del change.
