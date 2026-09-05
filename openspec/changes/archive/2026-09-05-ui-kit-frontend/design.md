## Context

Ver [proposal.md](proposal.md) — *Why*. Lo que condiciona el diseño es el estado real del frontend y de la referencia:

* **El kit ya existe como CSS.** `docs/ui-kit/cactify-ui-kit/` tiene `tokens.css` (60 líneas de variables), `styles.css` (315 líneas con `.button--primary`, `.field--error`, `.status--warning`, `.selection-bar`, `.specimen-label`…) y un `index.html` que los usa con marcado semántico. No hay que inventar el aspecto: hay que decidir cómo se troceo en componentes y qué se conserva literal.
* **El frontend es pequeño.** Cuatro páginas, tres componentes, ocho ficheros de test. La superficie a migrar cabe en una revisión.
* **Los tests de T-05 son la red.** Consultan por `data-test` y por texto visible, no por clases CSS ni por estructura. Si la migración conserva los `data-test` y los mensajes, los ocho ficheros deben seguir en verde **sin tocarlos**; que haya que editarlos es la señal de que la migración ha cambiado comportamiento.
* **El entorno de test no pinta.** El ciclo rojo-verde del frontend corre sobre `happy-dom` ([ADR-005](../../../docs/adr/ADR-005-tdd.md) enmendado), que no evalúa CSS ni calcula estilos: lo comprobable es el marcado, los atributos ARIA, el foco y el comportamiento; no el color ni el contraste.
* **No hay `layouts/`.** `app.vue` monta hoy la cabecera y `<NuxtPage />` directamente, y define los estilos globales en un `<style>` sin `scoped`.
* **ADR-013 sigue mandando**: los datos se piden en `onMounted`, nunca en `setup`. El armazón no cambia eso, pero sí obliga a decidir qué pintan los breadcrumbs de la ficha **antes** de que la planta haya cargado.

## Goals / Non-Goals

**Goals:**

* Que una pantalla nueva se escriba componiendo componentes, sin CSS de presentación propio.
* Que los tokens sean el único origen de color, radio, tipo, espaciado y duración, y que cambiarlos se propague solo.
* Que la migración de las pantallas actuales sea demostrablemente inocua: los tests de T-05 en verde sin modificarlos.
* Que el kit se revise ejecutándose, no leyendo un HTML aparte.

**Non-Goals (de diseño, además de los del proposal):**

* Un sistema de theming con múltiples temas o modo oscuro. Un solo tema, y los tokens preparados para que un segundo sea posible más adelante.
* Abstraer los componentes más allá de lo que Cactify necesita: el kit es de este producto, no una librería publicable.
* Comprobar en test lo que el entorno no puede comprobar (contraste, píxeles, animación real).

## Decisions

### 1. CSS propio con tokens, sin dependencia de estilos → ADR-014

El kit ya está escrito en CSS plano y con nombres de clase estables; portarlo a un framework de utilidades sería reescribirlo, añadir una dependencia, un paso de build y una capa de traducción entre el diseño y el código. Se mantiene la decisión que T-05 tomó *"sin dependencia de estilos"*, ahora con fundamento y no por escasez de tiempo, y se promociona a **ADR-014** junto con el resto de reglas de esta sección.

*Alternativas descartadas*: **Tailwind/UnoCSS** —los tokens dejarían de ser CSS puro y `docs/ui-kit` y el frontend divergirían en dos vocabularios—; **una librería de componentes** (Vuetify, PrimeVue, Nuxt UI) —traería su propio sistema de diseño, que es exactamente lo que este change quiere no tener—.

### 2. Dos hojas globales y el resto en `<style scoped>`

* `app/assets/css/tokens.css`: copia de `docs/ui-kit/cactify-ui-kit/tokens.css`, sin editar valores.
* `app/assets/css/base.css`: reinicio mínimo, tipografía base sobre los tokens, el anillo de foco (`:focus-visible`), la utilidad de solo lectura para lectores de pantalla y el bloque `@media (prefers-reduced-motion: reduce)`.

Ambas se registran en `nuxt.config.ts` (`css: [...]`). Todo lo demás vive en el `<style scoped>` de su componente. El aislamiento de Vue hace innecesario un prefijo de clase: dentro de `UiButton` la clase se llama `button`, como en la galería, y no puede colisionar.

*Alternativa descartada*: portar `styles.css` entero como hoja global. Volvería a dejar la presentación lejos del componente que la usa —el problema actual, con otro nombre—.

### 3. `app/components/ui/` con prefijo `Ui`

Los componentes del kit viven en `app/components/ui/` y se llaman `UiButton`, `UiField`, `UiPanel`, `UiTable`… El auto-import de Nuxt los resuelve por nombre de fichero, y el prefijo separa a simple vista lo genérico (`UiPanel`) de lo de dominio (`SpeciesRanges`, `CareRecordForm`), que se queda donde está.

### 4. Raíz única y atributos que caen al elemento correcto

Cada componente del kit renderiza **un solo elemento raíz**. Así `data-test`, `aria-*`, `id` y los manejadores declarados en el punto de uso caen sobre el elemento que corresponde sin configuración adicional, y `<p class="error" data-test="error" role="alert">` puede pasar a `<UiInlineError data-test="error">` conservando el atributo que el test consulta. Donde un componente necesite exponer más de un punto de anclaje (la tabla, el diálogo), lo hace por `props` y `slots` con nombre, no repartiendo atributos sueltos.

### 5. El armazón es un layout de Nuxt, no `app.vue`

`app.vue` se reduce a `<NuxtLayout><NuxtPage /></NuxtLayout>`, y el armazón pasa a `app/layouts/default.vue`, compuesto de `UiAppSidebar`, `UiAppTopbar` y `UiBreadcrumbs`. Motivo: la galería del kit necesita **no** llevar armazón de producto, y un layout alternativo lo resuelve sin condicionales dentro del armazón.

### 6. Los breadcrumbs los declara la página, por composable

Los breadcrumbs de la ficha incluyen el nombre de la planta, que solo se conoce cuando la petición ha respondido (ADR-013: los datos llegan en `onMounted`). Un `definePageMeta` estático no sirve. Se usa un composable `useBreadcrumbs()` con estado reactivo compartido: el layout lo lee, la página lo fija —el inventario en `setup`, la ficha al resolverse la carga— y el estado se limpia al cambiar de ruta.

Mientras la planta carga, los breadcrumbs muestran el nivel del inventario y un último nivel neutro; no se inventa un nombre ni se deja el hueco saltando de sitio al llegar el dato.

*Alternativa descartada*: derivarlos de la ruta. `/plants/1234…` daría un identificador TSID como último nivel, que no identifica nada para el usuario.

### 7. Diálogo con foco gestionado a mano, no `<dialog>` nativo

Las requirements exigen retención del foco, cierre con escape y devolución del foco al abridor, y esos tres escenarios tienen que poder escribirse como test **antes** que el componente. `happy-dom` implementa el elemento `<dialog>` de forma parcial y su retención de foco es cosa del navegador, no del DOM: un test sobre el nativo comprobaría el entorno, no el componente. Se implementa con `role="dialog" aria-modal="true"`, un ciclo de tabulación propio y `inert`/`aria-hidden` sobre el resto, que es exactamente lo que los escenarios describen.

*Trade-off*: más código propio y la responsabilidad de la capa superpuesta. Aceptado a cambio de tener los tres escenarios verificados.

### 8. Toast: componente en el layout y composable con cola

`useToast()` mantiene una cola en estado de módulo y el layout monta el contenedor una sola vez con `role="status" aria-live="polite"`. No se usa Pinia: no hay que persistir nada, ni hidratar, ni compartir con el servidor. El descarte por tiempo se hace con un temporizador cancelable, para que el test pueda dispararlo sin esperar.

### 9. La tabla es genérica por slots, no por configuración de columnas

`UiTable` recibe las filas y su clave, y las columnas se declaran con slots con nombre; la selección se expone como `v-model:selected` y la barra de acciones masivas es un slot que solo se renderiza con selección no vacía. Un descriptor de columnas en `props` obligaría a inventar un lenguaje de formato —y el inventario actual solo necesita tres celdas de texto y un enlace—.

### 10. Los componentes admiten los datos que el API no da; nadie los inventa

La etiqueta de ejemplar y la tabla del prototipo muestran código permanente, miniatura, estado de la planta y última lectura. **Ninguno existe en el modelo** (`Plant` tiene id, nickname, especie, localización y tags). Los componentes los declaran como `props` opcionales y omiten lo ausente; la galería los rellena con datos de muestra explícitamente etiquetados como tales, y las pantallas de producto no los pasan. Así el kit queda listo para cuando el modelo crezca, sin que ninguna pantalla muestre un dato falso hoy.

### 11. Las marcas gráficas son caracteres, y son decorativas

Los símbolos del prototipo (`♧`, `∿`, `✦`, `☰`, `×`) se conservan como caracteres, siempre con `aria-hidden` y siempre acompañados de texto o de un nombre accesible. Sustituirlos por un set de iconos es un change aparte y no cambia ni una requirement.

### 12. La galería es una ruta de la aplicación, fuera de la navegación

`app/pages/ui-kit.vue` con un layout sin armazón de producto. Se sirve siempre, también en producción: excluirla del build exigiría configuración condicional y un modo que nadie prueba, a cambio de ocultar una página que no expone datos ni acciones sobre el dominio. No figura en la navegación lateral.

### 13. Orden de migración: de dentro afuera, con los tests de T-05 como control

Tokens y base → componentes del kit (cada uno con su test antes) → galería → armazón y layout → pantallas, de una en una. `yarn test` se ejecuta en cada paso; los ocho ficheros de T-05 no se editan en ninguno.

## Risks / Trade-offs

* **El catálogo completo produce componentes sin consumidor** (diálogo, toast, selección masiva, pestañas, etiqueta de ejemplar): código que se mantiene sin usarse, y que puede no encajar cuando llegue su pantalla → *Mitigación*: cada uno nace de las requirements de la capability y de un marcado que ya existe en el prototipo, con su test y su muestra en la galería; y la galería es el consumidor que impide que se rompan en silencio. Es la decisión de alcance explícita del change, no un descuido.
* **`happy-dom` no evalúa CSS**: el foco visible, el respeto del movimiento reducido y "la información no depende del color" no se pueden verificar midiendo estilo computado → *Mitigación*: se verifican donde sí son observables —presencia del texto o de la forma en el marcado, del atributo de estado, y de la regla en la hoja base—, y el resto se revisa en la galería a ojo. Se declara así en las tareas en lugar de simular una cobertura que no existe.
* **Una migración "solo visual" puede cambiar comportamiento sin querer** (un `<button>` que pasa a `<a>`, un `role` que se pierde, un `data-test` que se traga un componente) → *Mitigación*: los ocho ficheros de test de T-05 son intocables; si uno se pone rojo, se corrige la migración, nunca el test.
* **El armazón nuevo es la parte con más superficie visual y la menos cubierta por los tests existentes** (hoy no hay test de `app.vue`) → *Mitigación*: los escenarios de orientación de la capability `plant-dashboard` se escriben como test antes del layout, y cubren breadcrumbs, sección activa y el panel plegable.
* **La copia de `tokens.css` puede divergir de `docs/ui-kit/`** → *Mitigación*: se copia sin editar y se anota en `docs/ui-kit/README.md` que la implementación viva es la del frontend. Una comprobación automatizada de que ambos ficheros coinciden sería más ruido que valor mientras el kit sea de un solo producto.
* **Coste**: es el change más grande del frontend hasta ahora y no cierra ninguna historia nueva. → *Trade-off aceptado*: T-06 y las pantallas de administración se apoyan entero en él, y el momento de extraer el sistema es antes de escribirlas.
