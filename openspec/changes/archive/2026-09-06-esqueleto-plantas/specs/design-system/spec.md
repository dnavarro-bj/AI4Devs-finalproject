## ADDED Requirements

### Requirement: Navegación de secciones de un formulario

El sistema SHALL ofrecer un componente de navegación de las secciones de un formulario largo, que marca en cuál se está y puede señalar cuáles están completas. La sección actual SHALL distinguirse por algo más que el color, y las completas SHALL indicarse con texto además de con una marca. NO SHALL exponerse como pestañas: las pestañas cambian de vista, y esto recorre un mismo formulario.

#### Scenario: Sección actual

- **WHEN** se muestra la navegación de un formulario
- **THEN** la sección actual queda marcada como tal, con algo más que el color

#### Scenario: Elegir una sección

- **WHEN** el usuario elige otra sección
- **THEN** el componente comunica cuál se ha pedido

#### Scenario: Sección completa

- **WHEN** una sección está completa
- **THEN** se indica con texto, no solo con una marca visual

### Requirement: Agrupación de controles de filtrado

La barra de filtros SHALL agruparse como un **conjunto de controles de formulario**, nombrado por su propia leyenda y no por un atributo de accesibilidad añadido. Sus controles SHALL alinearse por su **borde superior**, de modo que un campo con texto de ayuda no desplace su control respecto a los que no la tienen.

#### Scenario: Grupo nombrado nativamente

- **WHEN** una tecnología de asistencia alcanza la barra de filtros
- **THEN** el grupo queda nombrado por su leyenda

#### Scenario: Campos con y sin ayuda en la misma fila

- **WHEN** la barra combina campos con texto de ayuda y campos sin él
- **THEN** todos los controles quedan a la misma altura, y la ayuda cuelga por debajo

### Requirement: Campo en línea

El componente de campo SHALL admitir una disposición **en línea**, con la etiqueta y su texto de ayuda a un lado y el control al otro, conservando la asociación entre etiqueta y control y el anuncio de la ayuda a las tecnologías de asistencia.

#### Scenario: Etiqueta asociada en línea

- **WHEN** se renderiza un campo en línea
- **THEN** su etiqueta sigue asociada al control y su ayuda sigue anunciándose

#### Scenario: Distinguible del apilado

- **WHEN** se comparan un campo en línea y uno apilado
- **THEN** se distinguen en el marcado, de modo que ninguna pantalla necesite imitar la disposición con estilos propios

### Requirement: Acción alineada con los campos

El sistema SHALL ofrecer una forma de colocar **un control sin rótulo** —un botón, típicamente— en una fila de campos, quedando alineado con los controles de esos campos. El hueco del rótulo SHALL derivarse del propio estilo de los rótulos de campo y NO de una medida fija, de modo que cambiar la tipografía o el espaciado no vuelva a desalinearlo. El hueco NO SHALL anunciarse a las tecnologías de asistencia.

#### Scenario: Control sin rótulo en una fila de campos

- **WHEN** se coloca un control sin rótulo junto a campos con rótulo
- **THEN** queda a la altura de los controles de esos campos

#### Scenario: El hueco no se anuncia

- **WHEN** una tecnología de asistencia recorre la fila
- **THEN** el hueco del rótulo no se anuncia como contenido

#### Scenario: Con rótulo propio

- **WHEN** el control declara su propio rótulo
- **THEN** se muestra ese rótulo en lugar del hueco
