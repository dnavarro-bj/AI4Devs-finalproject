# app-navigation Specification

## Purpose

La arquitectura de información de la aplicación: qué secciones existen y cómo se agrupan, en qué dirección vive cada una, cómo se llega a cualquier cosa desde cualquier pantalla mediante la búsqueda global, y cómo se comporta una sección que todavía no está construida.

## Requirements

### Requirement: Mapa de secciones

Las secciones que existen y cómo se agrupan salen del [prototipo](../../../docs/wireframes/cactify-admin/index.html): cada `data-screen` es una sección del producto, y la navegación reproduce sus agrupaciones. Una sección nueva se declara porque el prototipo la define, no porque haga falta una ruta.

La aplicación SHALL ofrecer una navegación principal disponible en toda pantalla, con sus entradas repartidas en las agrupaciones de trabajo del producto: la colección, el trabajo diario, los catálogos y la administración. Los encabezados de agrupación SHALL servir para agrupar y NO SHALL conducir a una pantalla propia. La entrada correspondiente a la pantalla en la que se está SHALL marcarse como la sección activa.

#### Scenario: Entradas agrupadas

- **WHEN** el usuario abre cualquier pantalla de la aplicación
- **THEN** la navegación principal muestra sus entradas repartidas en las cuatro agrupaciones, cada una bajo su encabezado

#### Scenario: Un encabezado de agrupación no navega

- **WHEN** el usuario intenta activar el encabezado de una agrupación
- **THEN** no ocurre ninguna navegación, porque el encabezado no es un destino

#### Scenario: Sección activa

- **WHEN** el usuario está en una pantalla que pertenece a una entrada de la navegación
- **THEN** esa entrada se marca como la actual, con algo más que el color, incluso si la pantalla es una ficha de detalle dentro de esa sección

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
