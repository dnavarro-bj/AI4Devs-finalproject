> Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)): dentro de cada bloque, la tarea de test se escribe y se ve **roja** antes de la implementación que la pone en verde.
> Los ocho ficheros de test de T-05 (`frontend/test/*.nuxt.spec.ts` existentes) **no se editan en ninguna tarea**. Que uno se ponga rojo es señal de que la migración cambió comportamiento.

## 1. Ticket y decisión transversal

- [x] 1.1 Crear `docs/tickets/T-09-ui-kit-del-frontend.md` (área Frontend, historias 0.1–0.4 como pantallas afectadas, alcance y criterios de aceptación derivados del proposal) y verificar que el fichero existe y sigue el formato de T-08
- [x] 1.2 Añadir la fila de T-09 al índice `docs/tickets/README.md` y verificar que el enlace resuelve
- [x] 1.3 Escribir `docs/adr/ADR-014-sistema-de-diseno-del-frontend.md` con las decisiones 1–4 y 12 del design (CSS propio con tokens sin dependencias, dos hojas globales y `<style scoped>`, `app/components/ui/` con prefijo `Ui`, raíz única, galería fuera de la navegación), usando `docs/adr/template.md`; verificar que sigue la plantilla y referencia a ADR-005 y ADR-013
- [x] 1.4 Añadir ADR-014 a `docs/adr/README.md` y su resumen a la lista de ADRs de `openspec/config.yaml`; verificar que ambos índices lo listan

## 2. Fundamentos: tokens y hoja base

- [x] 2.1 Copiar `docs/ui-kit/cactify-ui-kit/tokens.css` a `frontend/app/assets/css/tokens.css` sin editar valores y verificar con un `diff` que ambos ficheros son idénticos
- [x] 2.2 Escribir `frontend/app/assets/css/base.css` (reinicio mínimo, tipografía base sobre los tokens, `:focus-visible` con `--focus-ring`, utilidad `sr-only` y bloque `@media (prefers-reduced-motion: reduce)`) y verificar que no contiene ningún valor de color, radio o duración literal
- [x] 2.3 Registrar ambas hojas en `nuxt.config.ts` (`css: [...]`) y verificar que `yarn dev` arranca y la aplicación se pinta con la nueva tipografía y el nuevo fondo
- [x] 2.4 Vaciar el `<style>` global de `app/app.vue` de sus variables ad-hoc y de sus estilos de `button`, `input`, `select` y `label`, dejando `app.vue` reducido a `<NuxtLayout><NuxtPage /></NuxtLayout>`; verificar con `grep` que ni `--color-accent`, ni `--color-bg`, ni `--radius`, ni `--space` sobreviven en `frontend/app/`
- [x] 2.5 Escribir un test que recorra `frontend/app/**/*.vue` y falle si algún `<style>` contiene un color literal (`#rgb`, `rgb(`, `hsl(`) y verificar que pasa en verde una vez migrado todo (esta tarea se cierra al final del bloque 6)

## 3. Componentes del kit — controles y datos de entrada

- [x] 3.1 Test de `UiButton`: variantes primaria, secundaria, texto, destructiva y de solo icono, estado deshabilitado, estado en curso que impide la segunda activación, y fallo declarado si la variante de solo icono no recibe nombre accesible — rojo
- [x] 3.2 Implementar `app/components/ui/UiButton.vue` con raíz única y verificar 3.1 en verde
- [x] 3.3 Test de `UiField`: etiqueta visible asociada al control (activarla enfoca), texto de ayuda, sufijo de unidad fuera del valor emitido, estado de error con mensaje y `aria-invalid`, estado deshabilitado y estado de solo lectura — rojo
- [x] 3.4 Implementar `app/components/ui/UiField.vue` (con soporte de `input`, `select`, `textarea` y casilla) y verificar 3.3 en verde
- [x] 3.5 Test de `UiStatus` y `UiPriority`: el significado se lee en el texto, cada uno acepta solo su propio vocabulario y ninguno acepta los valores del otro — rojo
- [x] 3.6 Implementar `app/components/ui/UiStatus.vue` y `UiPriority.vue` y verificar 3.5 en verde
- [x] 3.7 Test de `UiFilterChip`: muestra el criterio, la retirada tiene nombre accesible y emite qué filtro se retira sin abrir menú — rojo
- [x] 3.8 Implementar `app/components/ui/UiFilterChip.vue` y verificar 3.7 en verde

## 4. Componentes del kit — superficies, datos y feedback

- [x] 4.1 Test de `UiPanel`: cabecera con título y una única acción contextual, contenido en la superficie, sin sombra — rojo
- [x] 4.2 Implementar `app/components/ui/UiPanel.vue` y verificar 4.1 en verde
- [x] 4.3 Test de `UiTable`: columnas por slots, primera columna identificativa, sin selección no hay barra de acciones masivas, con selección la barra declara la cantidad, la selección global marca todas las filas mostradas, y el contenedor conserva desplazamiento horizontal — rojo
- [x] 4.4 Implementar `app/components/ui/UiTable.vue` con `v-model:selected` y slot de acciones masivas, y verificar 4.3 en verde
- [x] 4.5 Test de `UiNotice`: severidad, título, explicación y acción opcional; la severidad se comunica con texto o forma; al descartar, el aviso desaparece sin declarar resolución — rojo
- [x] 4.6 Implementar `app/components/ui/UiNotice.vue` y verificar 4.5 en verde
- [x] 4.7 Test de `UiEmptyState` y `UiInlineError`: el vacío ofrece exactamente una acción; el error en línea identifica lo fallado, describe el siguiente paso y se anuncia con `role="alert"` — rojo
- [x] 4.8 Implementar `app/components/ui/UiEmptyState.vue` y `UiInlineError.vue` y verificar 4.7 en verde
- [x] 4.9 Test de `UiDialog`: título, cierre explícito, contenido desplazable, acciones al final; el foco entra al abrir, permanece dentro al tabular, escape cierra y el foco vuelve al abridor — rojo
- [x] 4.10 Implementar `app/components/ui/UiDialog.vue` con foco gestionado a mano (decisión 7 del design) y verificar 4.9 en verde
- [x] 4.11 Test del toast: `useToast()` encola, el contenedor lo anuncia con `role="status" aria-live="polite"` sin robar el foco, y el temporizador cancelable lo retira sin espera real — rojo
- [x] 4.12 Implementar `app/composables/useToast.ts` y `app/components/ui/UiToastHost.vue` y verificar 4.11 en verde
- [x] 4.13 Test de `UiBreadcrumbs` y `UiTabs`: niveles anteriores navegables y el último con `aria-current="page"`; pestaña activa distinguida por forma y expuesta como seleccionada — rojo
- [x] 4.14 Implementar `app/components/ui/UiBreadcrumbs.vue` y `UiTabs.vue` y verificar 4.13 en verde
- [x] 4.15 Test de `UiSpecimenLabel`: con código, nombre, especie y contexto los muestra todos y no trunca el código; sin código ni contexto se renderiza con lo disponible, sin huecos ni valores inventados — rojo
- [x] 4.16 Implementar `app/components/ui/UiSpecimenLabel.vue` con todos los datos de contexto opcionales (decisión 10 del design) y verificar 4.15 en verde

## 5. Armazón de la aplicación y galería

- [x] 5.1 Test del composable `useBreadcrumbs()`: la página fija la ruta, el layout la lee y el estado se limpia al cambiar de ruta — rojo
- [x] 5.2 Implementar `app/composables/useBreadcrumbs.ts` y verificar 5.1 en verde
- [x] 5.3 Test del layout por defecto: navegación principal con la sección activa marcada por algo más que el color y expuesta como actual, breadcrumbs en la barra superior, contenido con ancho máximo, y panel lateral oculto en pantalla pequeña que se abre y se cierra con controles con nombre accesible devolviendo el foco al abrirlo — rojo
- [x] 5.4 Implementar `app/layouts/default.vue` con `UiAppSidebar`, `UiAppTopbar`, `UiBreadcrumbs` y `UiToastHost`, y verificar 5.3 en verde
- [x] 5.5 Crear `app/layouts/blank.vue` (sin armazón de producto) y `app/pages/ui-kit.vue` con todos los componentes del kit, sus variantes y sus estados, usando datos de muestra etiquetados como tales; verificar en `yarn dev` que la galería se pinta y que la navegación lateral no la lista
- [x] 5.6 Verificar a ojo en la galería lo que `happy-dom` no puede comprobar (decisión y riesgo del design): foco visible al tabular, ausencia de transiciones con movimiento reducido activado en el sistema, y legibilidad de estados y severidades en escala de grises

## 6. Migración de las pantallas existentes

- [x] 6.1 Migrar `app/pages/plants/index.vue` a `UiTable`, `UiButton`, `UiInlineError` y `UiEmptyState`, sin CSS propio de presentación, conservando todos los `data-test` y los mensajes; verificar `plants-list.nuxt.spec.ts` en verde sin editarlo
- [x] 6.2 Test de los escenarios nuevos del inventario: el vacío ofrece la acción de añadir la primera planta y al activarla lleva al formulario de alta — rojo, después verde con 6.1
- [x] 6.3 Migrar `app/pages/plants/nueva.vue` a `UiField`, `UiPanel` y `UiButton`, con el error del API en `UiInlineError`; verificar `plant-create.nuxt.spec.ts` en verde sin editarlo
- [x] 6.4 Migrar `app/pages/plants/[id].vue` y `SpeciesRanges.vue` a `UiPanel`, `UiStatus` y los componentes de estado, y fijar sus breadcrumbs con el nombre de la planta al resolverse la carga (nivel neutro mientras carga); verificar `plant-detail.nuxt.spec.ts` en verde sin editarlo
- [x] 6.5 Migrar `CareRecordForm.vue` a `UiField` con sufijos de unidad (`%`, `°C`, `h`, `ml`, `pH`) fuera del valor emitido y a `UiButton` con estado en curso; verificar `care-record.nuxt.spec.ts` en verde sin editarlo
- [x] 6.6 Migrar `RecommendationPanel.vue` a `UiPanel`, con el nivel de riesgo como `UiStatus` y la prioridad como `UiPriority`, cerrando el pendiente que T-05 dejó anotado; verificar `recommendation.nuxt.spec.ts` en verde sin editarlo
- [x] 6.7 Cerrar la tarea 2.5: el test de ausencia de colores literales pasa sobre todo `frontend/app/`
- [x] 6.8 Verificar el flujo completo: `yarn test` con los ocho ficheros de T-05 sin una sola línea modificada (`git diff --stat frontend/test/` no los lista) y `full-flow.nuxt.spec.ts` en verde

## 7. Cierre

- [x] 7.1 Levantar el entorno local (`iac/local`, `docker compose up --build`) y recorrer a mano el flujo alta → ficha → lectura → análisis con el armazón nuevo, en escritorio y en ancho de móvil; verificar que ninguna pantalla pierde orientación ni acciones. **Bloqueada**: los puertos 5432, 8080 y 3000 están ocupados por otro stack en marcha en esta máquina, y la ventana del navegador no se dejó redimensionar por debajo de 2560 px. Verificado en su lugar con el frontend en `:3123`: armazón, sección activa, breadcrumbs y estado de error reales; el plegado de la navegación queda cubierto por `test/app-shell.nuxt.spec.ts` y sus reglas `@media` comprobadas en el navegador
- [x] 7.2 Anotar en `docs/ui-kit/README.md` que la implementación viva del kit es la del frontend y enlazar la galería; verificar que el documento no queda contradiciendo al código
- [x] 7.3 Actualizar la sección "Estado del proyecto" y la tabla de estructura del frontend en `CLAUDE.md` con T-09, ADR-014, `components/ui/`, `layouts/` y `assets/css/`
- [x] 7.4 `openspec validate ui-kit-frontend --strict` en verde y `yarn test` completo en verde antes de archivar
