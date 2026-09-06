## MODIFIED Requirements

### Requirement: Armazón de la aplicación

El sistema SHALL ofrecer el armazón de la aplicación: una barra lateral de navegación que agrupa sus entradas bajo encabezados no navegables y marca la sección activa, una barra superior que aloja los breadcrumbs de la pantalla y la búsqueda global, y un área de contenido con ancho máximo encabezada por la cabecera de página. En pantallas pequeñas la barra lateral SHALL convertirse en un panel lateral desplegable, oculto por defecto, con una acción de apertura y otra de cierre accesibles; al cerrarse SHALL devolver el foco a la acción que lo abrió.

#### Scenario: Sección activa

- **WHEN** el usuario está en una pantalla que corresponde a una entrada de la navegación
- **THEN** esa entrada se marca como activa, con algo más que el color, y queda expuesta como la actual

#### Scenario: Entradas agrupadas

- **WHEN** se renderiza la barra lateral con varias agrupaciones
- **THEN** cada grupo presenta su encabezado y sus entradas, y el encabezado no es un control activable

#### Scenario: Navegación en pantalla pequeña

- **WHEN** la aplicación se muestra en una pantalla pequeña
- **THEN** la navegación lateral está oculta y se abre y se cierra mediante controles con nombre accesible

#### Scenario: Contenido con ancho máximo

- **WHEN** la aplicación se muestra en una pantalla muy ancha
- **THEN** el área de contenido no supera su ancho máximo y permanece legible

## ADDED Requirements

### Requirement: Cabecera de página

El sistema SHALL ofrecer un componente de cabecera de página que presenta el título de la pantalla, un texto de contexto opcional y sus acciones principales, de modo que ninguna pantalla resuelva por su cuenta esa composición. El título SHALL ser el encabezado de primer nivel de la pantalla.

#### Scenario: Cabecera con título y acciones

- **WHEN** se declara una cabecera con título, contexto y acciones
- **THEN** los tres se muestran, con el título como encabezado principal y las acciones alineadas a su altura

#### Scenario: Cabecera sin acciones

- **WHEN** se declara una cabecera solo con su título
- **THEN** se muestra el título sin reservar ni dejar visible ningún hueco de acciones

### Requirement: Búsqueda global como componente

El sistema SHALL ofrecer un componente de búsqueda global que acepta un texto, presenta los resultados **agrupados por tipo** y permite activar uno. SHALL exponerse a las tecnologías de asistencia como un campo de búsqueda con su lista de resultados, SHALL poder recorrerse enteramente con el teclado y SHALL distinguir el estado sin resultados del estado inicial sin búsqueda.

#### Scenario: Resultados agrupados

- **WHEN** el componente recibe resultados de varios tipos
- **THEN** los presenta agrupados, con cada grupo identificado por su tipo

#### Scenario: Recorrido con teclado

- **WHEN** el usuario escribe y recorre los resultados con el teclado
- **THEN** puede desplazarse por ellos y activar uno sin usar el ratón, y el resultado enfocado queda expuesto como el activo

#### Scenario: Sin resultados frente a sin búsqueda

- **WHEN** el usuario escribe un texto que no coincide con nada
- **THEN** el componente indica que no hay resultados, que es un estado distinto de no haber buscado todavía
