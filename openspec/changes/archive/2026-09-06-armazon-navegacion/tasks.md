# Tasks: armazon-navegacion

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)): cada bloque empieza por los tests de sus escenarios en rojo y sigue con la implementación que los pone en verde.

## 1. Mapa de secciones y datos de ejemplo

- [x] 1.1 Escribir `test/navigation-map.spec.ts` con los escenarios «Entradas agrupadas» y «Toda sección de la navegación es alcanzable»: el mapa declara las cuatro agrupaciones, ninguna entrada repite dirección y la galería del kit no figura como sección de producto. En rojo, porque el mapa no existe. La comprobación de que cada dirección tiene página vive en el bloque 6, que es donde se crean
- [x] 1.2 Crear `app/navigation.ts` con las cuatro agrupaciones —Colección, Trabajo diario, Catálogos y Administración— y sus entradas con etiqueta y dirección en inglés, hasta que 1.1 pase
- [x] 1.3 Crear `app/fixtures/search.ts` con los datos de ejemplo del buscador (plantas, especies, localizaciones y etiquetas), encabezado por un comentario que diga que lo reemplaza T-21 borrándolo entero; verificar que ningún fichero fuera de `app/fixtures/` y del layout lo importa

## 2. `UiNavGroup`

- [x] 2.1 Escribir `test/ui-nav-group.nuxt.spec.ts` con los escenarios «Entradas agrupadas» y «Un encabezado de agrupación no navega»: renderiza encabezado y entradas, el encabezado no es un enlace ni un botón, y la entrada activa expone `aria-current`. En rojo
- [x] 2.2 Implementar `app/components/ui/UiNavGroup.vue` con un solo elemento raíz y sin valores literales, hasta que 2.1 pase
- [x] 2.3 Añadir su muestra a `app/pages/ui-kit.vue` con un grupo activo y otro inactivo, y verificar que `test/design-tokens.spec.ts` sigue en verde

## 3. `UiPageHeader`

- [x] 3.1 Escribir `test/ui-page-header.nuxt.spec.ts` con los escenarios «Cabecera con título y acciones» y «Cabecera sin acciones»: el título es el encabezado de primer nivel, el contexto y las acciones se muestran cuando se declaran, y sin acciones no queda ningún contenedor vacío en el marcado. En rojo
- [x] 3.2 Implementar `app/components/ui/UiPageHeader.vue`, hasta que 3.1 pase
- [x] 3.3 Añadir su muestra a la galería, con y sin acciones

## 4. `UiGlobalSearch`

- [x] 4.1 Escribir `test/ui-global-search.nuxt.spec.ts` con los escenarios «Resultados agrupados», «Recorrido con teclado» y «Sin resultados frente a sin búsqueda»: el campo se expone como búsqueda con su lista asociada, los grupos se identifican por tipo, las flechas mueven el resultado activo, `Enter` emite la selección, `Escape` cierra, y el estado sin resultados se distingue del estado inicial. En rojo
- [x] 4.2 Implementar `app/components/ui/UiGlobalSearch.vue` recibiendo los resultados ya agrupados por propiedad y emitiendo la selección, **sin acceder a datos**, hasta que 4.1 pase
- [x] 4.3 Añadir su muestra a la galería en los tres estados: sin buscar, con resultados agrupados y sin resultados

## 5. Armazón

- [x] 5.1 Ampliar `test/app-shell.nuxt.spec.ts` con los escenarios «Sección activa» —incluida una ficha de detalle dentro de la sección— y «Entradas agrupadas» sobre el layout real, y comprobar que la barra superior aloja la búsqueda junto a los breadcrumbs. En rojo
- [x] 5.2 Reescribir la navegación de `app/layouts/default.vue` para recorrer `app/navigation.ts` con `UiNavGroup`, sustituyendo la constante `SECTIONS` de una entrada
- [x] 5.3 Alojar `UiGlobalSearch` en la barra superior, resolviendo contra `app/fixtures/search.ts`, y navegar al elegir un resultado
- [x] 5.4 `UiPageHeader` lo usa cada pantalla dentro del slot del layout, no el armazón: el título es de la pantalla y montarlo en el layout exigiría un segundo estado global como `useBreadcrumbs`. Anotado en el design; lo consumen las páginas del bloque 6
- [x] 5.5 Verificar que el plegado en pantalla pequeña y la devolución del foco siguen funcionando: los escenarios que ya cubre `test/app-shell.nuxt.spec.ts` de T-09 pasan sin modificarse

## 6. Rutas y pantallas por construir

- [x] 6.1 Escribir `test/pending-section.nuxt.spec.ts` con los escenarios «Sección pendiente de construir» y «La orientación no se pierde»: la pantalla explica que la sección está por construir, no simula datos, y fija sus breadcrumbs. En rojo
- [x] 6.2 Implementar el componente de sección por construir sobre `UiEmptyState`, parametrizado con el título y el ticket que la construirá, hasta que 6.1 pase
- [x] 6.3 Crear las doce páginas pendientes —`/species`, `/species/[id]`, `/locations`, `/locations/[id]`, `/soil-mixes`, `/soil-mixes/[id]`, `/tags`, `/tags/[id]`, `/tasks`, `/alerts`, `/import-export`, `/settings`—, cada una fijando sus breadcrumbs e invocando ese componente; verificar que las quince direcciones del mapa responden y ninguna da error
- [x] 6.4 Añadir la pantalla de dirección desconocida con el escenario «Dirección desconocida», que indica que no existe y ofrece volver a una sección conocida

## 7. Unificación de las rutas en inglés

- [x] 7.1 Renombrar `app/pages/plants/nueva.vue` a `new.vue` y actualizar las dos referencias de `app/pages/plants/index.vue`
- [x] 7.2 Ajustar la ruta literal en los tres tests que la nombran —`test/inventory-orientation.nuxt.spec.ts`, `test/full-flow.nuxt.spec.ts` y `test/plant-create.nuxt.spec.ts`— y verificar con `git diff` que en esos ficheros **no cambia nada más que esa cadena**

## 8. Cierre

- [x] 8.1 Ejecutar `yarn test` con toda la suite en verde, y comprobar que los ocho ficheros de test de T-05 no aparecen en `git diff --stat frontend/test/` salvo los tres del punto 7.2
- [x] 8.2 Revisado a ojo con el frontend en `:3123`: navegación agrupada con su sección activa, buscador con resultados agrupados y recorrido con flechas, sección por construir, y pantalla de dirección desconocida. El foco lo cubre la regla global de `base.css`. **El ancho de móvil no se pudo revisar**: la ventana del navegador no baja de su ancho mínimo en esta máquina —el mismo tope que bloqueó la revisión de T-09—; queda cubierto por los tests del plegado en `test/app-shell.nuxt.spec.ts` y sus reglas `@media`
- [x] 8.3 Ejecutar `openspec validate armazon-navegacion --strict` y dejarlo en verde
- [x] 8.4 Actualizar la documentación que este change desmiente: la tabla de `docs/tickets/README.md` si cambia el estado de T-10, y el `CLAUDE.md` con la ruta `/plants/new` y los tres componentes nuevos del kit
