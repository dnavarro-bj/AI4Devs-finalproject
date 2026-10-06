## MODIFIED Requirements

### Requirement: Mapa de secciones

Las secciones que existen y cómo se agrupan salen del [prototipo](../../../docs/wireframes/cactify-admin/index.html): cada `data-screen` es una sección del producto, y la navegación reproduce sus agrupaciones. Una sección nueva se declara porque el prototipo la define, no porque haga falta una ruta.

La aplicación SHALL ofrecer una navegación principal disponible en toda pantalla, con **el Dashboard como primera entrada, fuera de toda agrupación**, y el resto de sus entradas repartidas en las agrupaciones de trabajo del producto: la colección, el trabajo diario, los catálogos y la administración. El Dashboard SHALL vivir en la dirección raíz y NO SHALL redirigir a otra sección. Los encabezados de agrupación SHALL servir para agrupar y NO SHALL conducir a una pantalla propia. La entrada correspondiente a la pantalla en la que se está SHALL marcarse como la sección activa.

La entrada del Dashboard SHALL marcarse como activa **solo en la raíz**: una dirección raíz que coincidiera por prefijo con todas las demás las marcaría a todas.

#### Scenario: Entradas agrupadas

- **WHEN** el usuario abre cualquier pantalla de la aplicación
- **THEN** la navegación principal muestra el Dashboard al frente y sus demás entradas repartidas en las cuatro agrupaciones, cada una bajo su encabezado

#### Scenario: La raíz es el Dashboard

- **WHEN** el usuario abre la dirección raíz de la aplicación
- **THEN** ve el Dashboard y no es redirigido al inventario

#### Scenario: Un encabezado de agrupación no navega

- **WHEN** el usuario intenta activar el encabezado de una agrupación
- **THEN** no ocurre ninguna navegación, porque el encabezado no es un destino

#### Scenario: Sección activa

- **WHEN** el usuario está en una pantalla que pertenece a una entrada de la navegación
- **THEN** esa entrada se marca como la actual, con algo más que el color, incluso si la pantalla es una ficha de detalle dentro de esa sección

#### Scenario: El Dashboard no se marca en todas partes

- **WHEN** el usuario está en cualquier sección distinta de la raíz
- **THEN** la entrada del Dashboard no se marca como la actual
