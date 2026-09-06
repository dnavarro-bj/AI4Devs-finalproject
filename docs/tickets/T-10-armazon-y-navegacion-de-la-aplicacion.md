# T-10 - Armazón y navegación de la aplicación

**Área:** Frontend
**Historia relacionada:** — (ticket estructural; la orientación permanente ya está especificada en la capability `plant-dashboard`)
**Bloque:** 0 — esqueleto de la web

## Descripción

Llevar al frontend el armazón completo del [wireframe de administración](../wireframes/cactify-admin/index.html): la navegación lateral agrupada, el buscador global y la cabecera de página. Hoy `layouts/default.vue` tiene una navegación plana de una sola entrada, pensada para las tres pantallas de T-05.

Este ticket no pinta datos reales de ningún módulo: abre el sitio donde vivirán.

## Alcance

* Navegación lateral con los cuatro grupos del documento de producto (§3.1): Colección, Trabajo diario, Catálogos y Administración. Los encabezados agrupan y no navegan.
* Buscador global en la barra superior, con resultados agrupados por tipo (planta, especie, localización, etiqueta). Sin backend todavía: resuelve contra datos de ejemplo.
* Cabecera de página común: título, contexto y acciones de la pantalla.
* Ruta declarada para las quince pantallas del prototipo, cada una con su estado vacío explicando que todavía no está construida. Ninguna ruta lleva a un 404.
* Breadcrumbs de cada ruta, sobre el `useBreadcrumbs` que ya existe.

## Componentes que salen al kit

`UiNavGroup`, `UiGlobalSearch`, `UiPageHeader`. Cada uno con su test y su muestra en `/ui-kit`, según [ADR-014](../adr/ADR-014-sistema-de-diseno-del-frontend.md).

## Criterios de aceptación

* Desde cualquier pantalla se alcanza cualquier otra por la navegación lateral, y la sección activa queda marcada por algo más que el color.
* El buscador global devuelve resultados agrupados por tipo y cada uno abre su pantalla.
* Las quince rutas existen y ninguna termina en error; las no construidas muestran un estado vacío que lo dice.
* En pantalla pequeña la navegación se pliega y se abre y cierra con controles con nombre accesible.
