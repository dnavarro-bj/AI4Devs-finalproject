## MODIFIED Requirements

### Requirement: Catálogo de mezclas de sustrato

La aplicación SHALL mostrar el catálogo de mezclas con su nombre, su composición, su rango de pH y su receta, obtenidos del API y paginados. El listado SHALL ofrecer navegación a la ficha de cada mezcla y al alta de una nueva. Cuando el catálogo esté vacío, la pantalla SHALL explicarlo y ofrecer registrar la primera.

La composición SHALL verse como **proporción** además de leerse como cifras, y el pH SHALL acompañarse de su **lectura cualitativa** —ácido, neutro o alcalino—, porque un número solo no dice dónde cae en la escala a quien no la tiene memorizada.

#### Scenario: Catálogo con mezclas

- **WHEN** se abre el catálogo y el API devuelve mezclas registradas
- **THEN** se muestra una fila por mezcla con su nombre, su composición, su rango de pH y su receta

#### Scenario: La composición se ve, no solo se lee

- **WHEN** se muestra una mezcla en el listado
- **THEN** su reparto entre orgánico y mineral aparece como proporción, con sus dos cifras legibles

#### Scenario: El pH se interpreta

- **WHEN** se muestra el rango de pH de una mezcla
- **THEN** se acompaña de su lectura cualitativa, no solo del número

#### Scenario: Catálogo vacío

- **WHEN** se abre el catálogo y no hay ninguna mezcla registrada
- **THEN** se explica que no hay ninguna y se ofrece registrar la primera, sin una tabla en blanco

#### Scenario: Navegación a la ficha

- **WHEN** se selecciona una mezcla del catálogo
- **THEN** la aplicación navega a su ficha sin recargar la página

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el listado no aparece a medias

### Requirement: Ficha de una mezcla de sustrato

La aplicación SHALL mostrar la ficha de una mezcla con su composición, su rango de pH, su receta de referencia y **cuántas especies la recomiendan**. La ficha SHALL ser el punto desde el que se corrige o se retira la mezcla.

La ficha SHALL abrir con la composición **como figura**, que es la identidad de la receta, y SHALL situar el rango de pH **sobre una escala** en lugar de enunciarlo suelto.

Lo que el prototipo muestra y el API no sirve —cuántas plantas la utilizan, el drenaje y la retención esperados, el desglose de sus componentes, las notas de preparación y la fecha de actualización— SHALL aparecer **marcado con el ticket que lo sustituye**, nunca simulado como si fuese dato.

#### Scenario: Ficha de una mezcla

- **WHEN** el usuario abre la ficha de una mezcla existente
- **THEN** se muestran su composición en proporción y en cifras, su rango de pH y su descripción

#### Scenario: Composición como figura

- **WHEN** se abre la ficha de una mezcla
- **THEN** su reparto entre orgánico y mineral se presenta como figura, con las dos cifras legibles

#### Scenario: El pH sobre su escala

- **WHEN** se muestra el rango de pH
- **THEN** aparece situado sobre una escala con sus extremos nombrados, además de como cifras

#### Scenario: Uso de la mezcla

- **WHEN** se abre la ficha
- **THEN** se dice cuántas especies la recomiendan, también cuando son cero

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** la ficha presenta secciones que el API no alimenta
- **THEN** cada una queda marcada con el ticket que la llena, sin contenido simulado

#### Scenario: Mezcla inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la mezcla no existe, con salida al catálogo, y no una pantalla en blanco
