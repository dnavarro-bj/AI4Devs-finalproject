# app-navigation Specification

## Purpose

La arquitectura de información de la aplicación: qué secciones existen y cómo se agrupan, en qué dirección vive cada una, cómo se llega a cualquier cosa desde cualquier pantalla mediante la búsqueda global, y cómo se comporta una sección que todavía no está construida.

## Requirements

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

### Requirement: Direcciones estables de las secciones

Cada sección SHALL tener una dirección propia y estable, y la aplicación SHALL declarar la dirección de todas sus secciones aunque su pantalla todavía no esté construida. Ninguna dirección declarada SHALL terminar en un error de recurso inexistente.

#### Scenario: Toda sección de la navegación es alcanzable

- **WHEN** el usuario recorre las entradas de la navegación principal
- **THEN** todas llevan a una pantalla, y ninguna produce un error de página no encontrada

#### Scenario: Dirección desconocida

- **WHEN** el usuario pide una dirección que la aplicación no declara
- **THEN** se le indica que esa dirección no existe y se le ofrece volver a una sección conocida

### Requirement: Sección todavía no construida

Una sección declarada cuya pantalla todavía no está construida SHALL mostrar un estado vacío que explique que aún no lo está, conservando la navegación, los breadcrumbs y la orientación del resto de la aplicación. NO SHALL simular datos ni presentarse como una pantalla vacía sin explicación.

Esto vale para la sección **entera**, que es lo que distingue este caso del de una pantalla ya construida: allí los bloques que el API no alimenta se muestran marcados en su sitio, porque la composición del prototipo ya existe; aquí no hay composición todavía y una tabla de mentira sería indistinguible de una pantalla rota.

#### Scenario: Sección pendiente de construir

- **WHEN** el usuario abre una sección cuya pantalla todavía no existe
- **THEN** se muestra un mensaje que explica que esa sección está por construir, dentro del armazón habitual y con sus breadcrumbs

#### Scenario: La orientación no se pierde

- **WHEN** el usuario está en una sección todavía no construida
- **THEN** la navegación principal sigue marcando esa sección como la activa y permite salir a cualquier otra

### Requirement: Búsqueda global

La aplicación SHALL ofrecer una búsqueda disponible desde cualquier pantalla que localice, como mínimo, plantas por su código o su nombre, especies por su nombre científico o común, localizaciones y etiquetas. Los resultados SHALL presentarse **agrupados por tipo** y cada uno SHALL abrir directamente la pantalla del elemento encontrado. La búsqueda SHALL ser alcanzable con el teclado.

#### Scenario: Resultados agrupados por tipo

- **WHEN** el usuario busca un texto que coincide con elementos de varios tipos
- **THEN** los resultados se muestran agrupados por tipo, con el tipo identificado en cada grupo

#### Scenario: Abrir un resultado

- **WHEN** el usuario selecciona un resultado de la búsqueda
- **THEN** la aplicación navega a la pantalla de ese elemento y la búsqueda se cierra

#### Scenario: Búsqueda sin resultados

- **WHEN** el usuario busca un texto que no coincide con nada
- **THEN** se le indica que no hay resultados, y no se muestra un desplegable vacío ni un error

#### Scenario: Búsqueda con el teclado

- **WHEN** el usuario recorre la barra superior con el teclado
- **THEN** alcanza el campo de búsqueda, puede escribir, recorrer los resultados y activar uno sin usar el ratón

### Requirement: Búsqueda global sobre datos reales

La búsqueda global SHALL encontrar **plantas, especies, localizaciones y etiquetas reales**, consultando el API, con coincidencia parcial y sin distinguir mayúsculas. Las **plantas** se buscan por código, apodo y nombre de su especie y se muestran con su código y su apodo; las **especies**, por código y por nombre científico o común, con su código y su nombre científico; las **localizaciones**, por nombre y código; las **etiquetas**, por nombre. Cada resultado SHALL abrir la pantalla del elemento. **No queda ningún dato de ejemplo ni marca `· ejemplo`** en la búsqueda.

Cada tipo SHALL mostrar un número acotado de resultados y, si hay más, un enlace **«Ver los N resultados»** que abre el inventario o el catálogo ya filtrado por el mismo texto (`?q=`); localizaciones y etiquetas, cuyas pantallas no se filtran por texto, no lo ofrecen. Las cuatro consultas SHALL ir en paralelo y **cada tipo SHALL fallar por separado**: si una falla, las demás se muestran y esa se degrada a «sin resultados de ese tipo», sin mensaje técnico.

Escribir deprisa SHALL NO lanzar una petición por tecla, y una respuesta de una búsqueda anterior SHALL NO sustituir a la de la búsqueda actual.

#### Scenario: Encontrar una planta por su código

- **WHEN** el usuario escribe `CAT-GRUSS-01` en la búsqueda global
- **THEN** aparece, en el grupo de plantas, la planta con ese código y su apodo, y al elegirla se abre su ficha

#### Scenario: Encontrar una planta por su apodo

- **WHEN** el usuario escribe `suegra`
- **THEN** aparece la planta cuyo apodo lo contiene, aunque su código no

#### Scenario: Encontrar plantas por el nombre de su especie

- **WHEN** el usuario escribe `grusonii`
- **THEN** aparecen en el grupo de plantas los ejemplares de esa especie y en el de especies, la propia especie

#### Scenario: Encontrar una especie por su código

- **WHEN** el usuario escribe `mammi`
- **THEN** aparece, en el grupo de especies, la que tiene ese código, con su nombre científico, y al elegirla se abre su ficha

#### Scenario: Localizaciones y etiquetas reales

- **WHEN** el usuario escribe `inver`
- **THEN** el grupo de localizaciones muestra las que existen en el API, sin marca de ejemplo, y al elegir una se abre su ficha

#### Scenario: Ningún dato de ejemplo

- **WHEN** el usuario busca un texto que solo coincide con un dato que existe en el API
- **THEN** no aparece ningún resultado que no exista en él

#### Scenario: Más resultados de los que caben

- **WHEN** hay 37 plantas que coinciden y el grupo muestra 5
- **THEN** el grupo ofrece «Ver los 37 resultados» y al elegirlo se abre `/plants?q=<texto>` ya filtrado

#### Scenario: Un tipo que no se filtra por texto

- **WHEN** hay más localizaciones de las que caben
- **THEN** el grupo muestra las primeras sin enlace «Ver todos»

#### Scenario: Una respuesta tardía no pisa a la actual

- **WHEN** el usuario escribe un texto, escribe otro después, y la respuesta del primero llega la última
- **THEN** los resultados mostrados son los del segundo texto

#### Scenario: Un tipo falla

- **WHEN** el API de etiquetas falla durante una búsqueda
- **THEN** plantas, especies y localizaciones se muestran y no hay resultados de etiquetas ni mensaje de error técnico

#### Scenario: Fallan todos

- **WHEN** el API no responde
- **THEN** el diálogo muestra «sin resultados» y sigue funcionando
