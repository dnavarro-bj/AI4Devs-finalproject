## Why

El diseño de la aplicación ya existe como documentación y prototipo: [docs/ui-kit/](../../../docs/ui-kit/README.md) recoge los fundamentos, el catálogo de componentes y los patrones de producto, con una galería HTML (`cactify-ui-kit/`) que los materializa en marcado y CSS reales, y un `tokens.css` que el propio README declara como origen de *"los futuros design tokens del frontend"*.

El frontend no lo usa. `frontend/app/app.vue` define su propia paleta de seis colores y dos variables de espaciado —inventadas en T-05 con la nota *"sin dependencia de estilos"*— y cada componente repite a mano el mismo `background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space)`. No hay panel, ni botón con jerarquía, ni campo con estado de error, ni estado, ni prioridad, ni aviso, ni estado vacío: hay `<p class="error">` repetido en cinco ficheros. El propio T-05 dejó escrito que *"los estilos y los badges por `riskLevel` se consolidan en T-06"*, y el `RecommendationPanel` lleva un comentario esperando ese badge.

Cada pantalla nueva —el historial y las alertas de [T-06](../../../docs/tickets/T-06-historial-y-alertas.md), las pantallas de administración— multiplica esa divergencia. El momento de extraer el sistema es antes de escribirlas, no después.

### Ticket: se abre T-09

`openspec/config.yaml` exige que cada change se derive de un ticket, y ninguno cubre el sistema de diseño: T-05 está archivado y explícitamente dejó *"la ambición visual"* fuera, y T-06 es historial y alertas, no fundamentos. Como ya se hizo con T-08 en `api-especies`, este change **abre `T-09 — UI kit del frontend`** (Frontend) y lo cita con normalidad; el ticket forma parte del entregable.

El change no cierra ninguna historia nueva: reviste las pantallas que ya cierran [0.1](../../../docs/user-stories/0.1-registrar-cactus.md), [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md), [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md) y [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md), sin alterar lo que hacen, y prepara el terreno de [0.5](../../../docs/user-stories/0.5-consultar-historial-de-cuidados.md) (T-06).

## What Changes

* **Tokens de diseño en el frontend**: `docs/ui-kit/cactify-ui-kit/tokens.css` se porta a una hoja global del frontend —color, tipografía, escala de espaciado de 4 px, radios, sombra, anillo de foco, duraciones y medidas de retícula—. Las seis variables ad-hoc de `app.vue` (`--color-text`, `--color-bg`, `--color-accent`, `--radius`, `--space`…) **desaparecen**; ningún componente vuelve a declarar un color literal.
* **Catálogo completo de componentes** de [components.md](../../../docs/ui-kit/components.md), como componentes Vue reutilizables, cada uno con sus variantes y estados documentados: botón (primario, secundario, texto, peligro, icono), campo (con etiqueta, ayuda, sufijo de unidad, error, deshabilitado y solo lectura), estado, prioridad, píldora de filtro, panel, tabla con selección y barra de acciones masivas, aviso, diálogo, toast, breadcrumbs, pestañas, estado vacío, error en línea y etiqueta de ejemplar. Se construyen todos, tengan o no consumidor hoy: es la decisión explícita de alcance de este change.
* **Armazón de aplicación**: la cabecera actual de una sola línea se sustituye por el armazón del kit —barra lateral de navegación de 248 px, barra superior de 76 px con breadcrumbs, área de contenido de hasta 1530 px—, con la lateral convertida en drawer en pantallas pequeñas. Todas las pantallas pasan a tener breadcrumbs.
* **Las pantallas existentes se reescriben sobre el kit**: inventario, alta de planta, ficha, formulario de lectura, rangos de la especie y panel de recomendación dejan de tener CSS propio de presentación y componen componentes del kit. **El comportamiento no cambia**: las mismas llamadas al API, las mismas validaciones, los mismos mensajes y los mismos `data-test`, de modo que los tests de T-05 sigan siendo la red de seguridad de la migración.
* **El nivel de riesgo y la prioridad de la IA se pintan como estado y prioridad** del kit, cerrando el pendiente que T-05 dejó anotado en `RecommendationPanel`.
* **Accesibilidad como parte del contrato del componente, no como repaso posterior**: foco visible de 3 px, área interactiva mínima, etiqueta visible en todo campo, `aria-label` obligatorio en el botón de solo icono, información nunca dependiente solo del color y respeto de `prefers-reduced-motion`.
* **Galería viva en el propio frontend**: una ruta de desarrollo que muestra los componentes reales con sus variantes y estados, para que el kit se revise ejecutándose y no en un HTML estático que puede quedar desincronizado.
* **Decisión transversal a ADR**: cómo se construye y se consume el sistema de diseño en el frontend —CSS propio con tokens, sin dependencia de estilos; dónde viven los componentes; cómo se nombran las clases y cuándo se admite CSS local— se promociona a **ADR-014**.
* **Sin dependencias nuevas**: no se añade Tailwind ni ningún framework de utilidades, así que `frontend/package.json` y `yarn.lock` no cambian.

## Capabilities

### New Capabilities
- `design-system`: el sistema de diseño del frontend — tokens compartidos, catálogo de componentes reutilizables con sus variantes y estados, armazón de aplicación y garantías de accesibilidad comunes a toda la interfaz.

### Modified Capabilities
- `plant-dashboard`: las pantallas ganan orientación permanente (navegación lateral y breadcrumbs) y sus estados vacío, de carga y de error pasan a ser los del sistema de diseño, con una acción útil en el vacío. El resto de requirements de la capability —datos, validaciones y llamadas al API— no cambia.

## Impact

* **`frontend/app/`**: nueva carpeta de componentes del kit y hoja de tokens y estilos base globales; `app.vue` pierde sus estilos ad-hoc y pasa a montar el armazón (o un layout de Nuxt); `pages/` y los tres componentes actuales se reescriben sobre el kit; nueva ruta de galería.
* **`frontend/test/`**: tests nuevos por componente del kit, escritos antes que el componente ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). Los ocho ficheros de test existentes **no se modifican**: si la migración los rompe, la migración está mal.
* **`frontend/nuxt.config.ts`**: solo para registrar la hoja de estilos global.
* **`docs/adr/`**: nuevo `ADR-014` (sistema de diseño del frontend), su entrada en `docs/adr/README.md` y el resumen en `openspec/config.yaml`.
* **`docs/tickets/`**: nuevo `T-09-ui-kit-del-frontend.md` y su fila en el índice.
* **`docs/ui-kit/`**: se mantiene como referencia de diseño; se anota que la implementación viva es la del frontend.
* **Sin backend, sin migraciones, sin cambios de contrato del API y sin dependencias nuevas.**

## Non-goals

* **Pantallas nuevas.** No se añade ninguna ruta de producto; los componentes sin consumidor hoy (diálogo, toast, selección masiva, pestañas, etiqueta de ejemplar) se construyen y se muestran en la galería, pero no se cablean a ninguna pantalla existente que no los use ya.
* **Cambios de comportamiento** de las pantallas actuales: ni datos nuevos, ni validaciones distintas, ni mensajes reescritos, ni `data-test` renombrados.
* **Historial, cronología de eventos y alertas**: son T-06, aunque el kit prepare sus piezas.
* **Modo oscuro**: `tokens.css` declara `color-scheme: light` y aquí se respeta.
* **Iconografía propia**: se usan los caracteres de la galería como marcas provisionales; un set de iconos es otro change.
* **Tipografía embebida**: `Avenir Next` se declara con sus alternativas del sistema; no se sirven fuentes web.
* **Tests visuales o de regresión de píxel**, y cualquier herramienta de documentación de componentes de terceros (Storybook y equivalentes): la galería es una ruta del propio Nuxt.
* **Datos que el API no expone**: el código permanente de ejemplar, la miniatura, el estado de la planta y la última lectura que muestran la etiqueta y la tabla del prototipo **no existen en el modelo**. Los componentes los admiten como entrada, pero ninguna pantalla los inventa.
