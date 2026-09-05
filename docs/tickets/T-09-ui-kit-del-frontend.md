# T-09 - UI kit del frontend

**Área:** Frontend
**Historias relacionadas:** [0.1](../user-stories/0.1-registrar-cactus.md), [0.2](../user-stories/0.2-registrar-condiciones-de-cultivo.md), [0.3](../user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.4](../user-stories/0.4-obtener-analisis-de-ia.md) (pantallas ya existentes, que este ticket reviste)

## Descripción

Llevar al frontend el sistema de diseño que ya existe como documentación y prototipo en [docs/ui-kit/](../ui-kit/README.md): tokens, catálogo de componentes, patrones y armazón de la aplicación.

Hoy no está: [T-05](T-05-dashboard-frontend.md) construyó las pantallas con una paleta ad-hoc definida en `app.vue`, sin componentes de presentación, repitiendo el mismo bloque de borde y superficie en cada fichero y el mismo `<p class="error">` en cinco. El propio T-05 dejó fuera *"la ambición visual"* y anotó que los estilos y los badges por `riskLevel` se consolidarían más adelante.

Es un habilitador: el historial y las alertas de [T-06](T-06-historial-y-alertas.md) y cualquier pantalla de administración se escriben sobre este kit. El momento de extraerlo es antes que ellas, no después.

Este ticket **no cierra ninguna historia nueva**: reviste las pantallas que ya cierran 0.1–0.4, sin cambiar lo que hacen.

## Alcance

* Tokens de diseño portados desde `docs/ui-kit/cactify-ui-kit/tokens.css` como origen único de color, tipografía, espaciado, radios, foco y duraciones.
* Catálogo completo de componentes de [components.md](../ui-kit/components.md) como componentes Vue reutilizables, con sus variantes y estados: acciones, campos, estado, prioridad, filtros, panel, tabla con selección y acciones masivas, aviso, diálogo, toast, breadcrumbs, pestañas, estado vacío, error en línea y etiqueta de ejemplar.
* Armazón de la aplicación: navegación lateral, barra superior con breadcrumbs y área de contenido con ancho máximo, con la lateral plegada en pantallas pequeñas.
* Migración de las pantallas actuales —inventario, alta, ficha, formulario de lectura, rangos de la especie y panel de recomendación— para que compongan el kit y no tengan CSS de presentación propio.
* Galería del kit servida por la propia aplicación, fuera de la navegación de producto.
* Garantías de accesibilidad comunes: foco visible, área interactiva mínima, etiqueta visible en todo campo, nombre accesible en los controles de solo icono, ninguna información transmitida solo por color y respeto de `prefers-reduced-motion`.

## Criterios de aceptación

* Ninguna hoja de estilo del frontend declara un color, un radio o un tamaño tipográfico literal: todos salen de los tokens, y cambiar el token de marca se propaga sin tocar componentes.
* Las pantallas existentes se pintan con componentes del kit y no conservan CSS de presentación propio.
* Los tests de T-05 siguen en verde **sin haber sido modificados**: la migración no cambia comportamiento, ni datos, ni mensajes, ni `data-test`.
* Toda pantalla muestra breadcrumbs y marca su sección en la navegación principal; la ficha se identifica por el nombre de la planta.
* El inventario vacío explica que no hay plantas y ofrece una única acción, que lleva al alta.
* El nivel de riesgo y la prioridad de la recomendación de IA se pintan como estado y prioridad del kit.
* La galería muestra los componentes reales con sus variantes y estados, y no aparece en la navegación de producto.
* Cada componente del kit tiene tests de sus variantes, sus estados y sus garantías de accesibilidad observables en el entorno de test.
* No se añade ninguna dependencia: `package.json` y `yarn.lock` no cambian.
