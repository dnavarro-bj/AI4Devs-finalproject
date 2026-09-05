# ADR-014 - Sistema de diseño del frontend

**Estado:** Aceptado
**Fecha:** 2026-09-03
**Origen:** T-09 (`ui-kit-frontend`), al llevar al código el UI kit documentado en `docs/ui-kit/`

## Contexto

El diseño de la aplicación existe desde antes que este ADR: [docs/ui-kit/](../ui-kit/README.md) recoge fundamentos, catálogo de componentes y patrones, con una galería HTML que los materializa en marcado y CSS reales y un `tokens.css` que el propio README declara origen de *"los futuros design tokens del frontend"*.

El código no lo usaba. [T-05](../tickets/T-05-dashboard-frontend.md) construyó las pantallas contra reloj con una paleta de seis colores inventada en `app.vue`, bajo la nota *"sin dependencia de estilos: cada una obligaría a regenerar `yarn.lock` y a mantenerla"*. La consecuencia es la esperable: cada componente repite a mano el mismo bloque de superficie, borde, radio y relleno; no hay botón con jerarquía, ni campo con estado de error, ni estado, ni aviso, ni estado vacío; y el error se pinta como un `<p class="error">` repetido en cinco ficheros.

La decisión hay que tomarla ahora porque cada pantalla nueva —[T-06](../tickets/T-06-historial-y-alertas.md) y las de administración— multiplicaría esa divergencia, y porque el kit ya está escrito: no hay que inventar el aspecto, hay que decidir cómo se troceo en componentes y qué manda sobre qué.

El entorno de test condiciona además lo que puede garantizarse: el ciclo rojo-verde del frontend corre sobre `happy-dom` ([ADR-005](ADR-005-tdd.md) enmendado en T-05), que no evalúa CSS ni calcula estilos.

## Decisión

**El sistema de diseño se implementa en CSS propio gobernado por tokens, sin ninguna dependencia de estilos.** En detalle:

1. **Los tokens son el origen único.** `frontend/app/assets/css/tokens.css` es una copia sin editar de `docs/ui-kit/cactify-ui-kit/tokens.css`. Ningún componente ni pantalla declara un color, un radio, una duración o un tamaño tipográfico literal.
2. **Dos hojas globales y nada más.** `tokens.css` con las variables y `base.css` con el reinicio mínimo, la tipografía base, el anillo de foco de `:focus-visible`, la utilidad `sr-only` y el bloque `@media (prefers-reduced-motion: reduce)`. Se registran en `nuxt.config.ts`. Todo el resto de CSS vive en el `<style scoped>` de su componente; el aislamiento de Vue hace innecesario prefijar las clases, que conservan los nombres de la galería.
3. **Los componentes del kit viven en `app/components/ui/` con prefijo `Ui`** (`UiButton`, `UiField`, `UiPanel`…). El auto-import de Nuxt los resuelve por nombre de fichero y el prefijo los separa a simple vista de los componentes de dominio (`SpeciesRanges`, `CareRecordForm`), que se quedan donde están.
4. **Un solo elemento raíz por componente del kit.** Así `data-test`, `aria-*`, `id` y los manejadores declarados en el punto de uso caen sobre el elemento correcto sin configuración. Donde hace falta más de un punto de anclaje, se expone por `props` y `slots` con nombre, nunca repartiendo atributos sueltos.
5. **El armazón es un layout de Nuxt**, no `app.vue`: `app.vue` se reduce a `<NuxtLayout><NuxtPage /></NuxtLayout>` y el armazón vive en `layouts/default.vue`, lo que permite que la galería use un layout sin armazón de producto sin condicionales dentro de él.
6. **La galería del kit es una ruta de la propia aplicación** (`/ui-kit`), servida siempre y fuera de la navegación de producto. El kit se revisa ejecutándose, con la misma implementación que usan las pantallas, y no en una copia estática que puede desincronizarse.
7. **La accesibilidad es parte del contrato del componente**, no un repaso posterior: etiqueta visible asociada en todo campo, nombre accesible obligatorio en los controles de solo icono, foco visible, área interactiva mínima, ninguna información transmitida solo por color y transiciones anuladas ante `prefers-reduced-motion`. Lo que `happy-dom` puede observar —marcado, atributos ARIA y foco— se verifica con tests; lo que es puramente visual —contraste, foco pintado, animación real— se revisa en la galería y se declara como tal.

## Alternativas consideradas

* **Tailwind, UnoCSS o cualquier framework de utilidades.** Obligaría a reescribir un kit que ya está en CSS plano, a traducir los tokens a su configuración y a mantener dos vocabularios —el de `docs/ui-kit` y el del código—, además de añadir dependencia y paso de build. El coste es real y el beneficio, con un kit propio ya escrito, marginal.
* **Una librería de componentes** (Vuetify, PrimeVue, Nuxt UI). Traería su propio sistema de diseño, que es exactamente lo que este change existe para no tener; adaptarla al kit de Cactify cuesta más que escribir los componentes.
* **Portar `styles.css` entero como hoja global** en vez de trocearlo en componentes. Es lo más rápido, y deja la presentación lejos del componente que la usa: el problema actual con otro nombre.
* **Mantener la galería como HTML estático en `docs/`.** No cuesta nada y se desincroniza a la primera: mostraría el prototipo, no lo que la aplicación pinta.
* **Excluir la galería del build de producción.** Exigiría configuración condicional y un modo que nadie prueba, para ocultar una página que no expone datos ni acciones sobre el dominio.

## Consecuencias

* Una pantalla nueva se compone; no reinventa su presentación ni copia bloques de CSS. Es lo que hace viable T-06 y las pantallas de administración.
* Cambiar un token se propaga solo. Un segundo tema —modo oscuro, por ejemplo— pasa a ser posible sin tocar componentes, aunque `tokens.css` declare hoy `color-scheme: light` y no se implemente.
* **Los componentes se mantienen aunque no tengan consumidor.** El catálogo se construye entero, así que diálogo, toast, selección masiva, pestañas y etiqueta de ejemplar existen antes que su pantalla; la galería es su consumidor y lo que impide que se rompan en silencio.
* **El kit queda duplicado en dos sitios**: `docs/ui-kit/` como referencia de diseño y `frontend/app/` como implementación viva. Se acepta la duplicidad y se resuelve por convenio —la implementación manda, y `docs/ui-kit/README.md` lo dice— en lugar de con una comprobación automática que sería más ruido que valor mientras el kit sea de un solo producto.
* **Escribimos y mantenemos código que una librería daría hecho**, notablemente el diálogo modal con su retención de foco: se implementa a mano y no sobre `<dialog>` nativo, porque la retención de foco es cosa del navegador y `happy-dom` no la emula, de modo que un test sobre el nativo comprobaría el entorno y no el componente.
* La cobertura de accesibilidad es honesta pero parcial: hay escenarios —contraste, foco pintado, movimiento— que solo se verifican a ojo. Queda declarado en las tareas en lugar de simular una cobertura que el entorno no puede dar.
