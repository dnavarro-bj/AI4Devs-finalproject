## MODIFIED Requirements

### Requirement: Alta y edición de una planta con el mismo formulario

Su composición sale de la pantalla `plant-create` del prototipo, conforme al requisito «Fidelidad al prototipo».

La aplicación SHALL usar **el mismo formulario** para dar de alta y para editar una planta, dividido en secciones con significado para el usuario —especie, identificación, localización, origen, fotografías y cuidados— con una **navegación que indique en qué sección se está y cuáles están completas**. En edición los campos SHALL llegar prellenados con los valores actuales.

La especie SHALL elegirse de una lista buscable donde cada opción muestre su nombre científico y común, y la elegida SHALL distinguirse por algo más que una marca de comprobación.

Cuando la validación falle, la aplicación SHALL **llevar a la sección del campo que falta**: en un formulario de seis secciones, decir que falta un campo sin decir dónde no basta.

Al editar, la aplicación SHALL **guardar** el apodo, la localización y la especie, y volver a la ficha de la planta, que refleja los cambios. Si el API rechaza la edición, la aplicación SHALL explicar el motivo **sin perder lo que el usuario había escrito**. Un campo que el API no admite guardar todavía SHALL **no ser editable**: se muestra deshabilitado y explicando cuándo llegará, en lugar de admitir un texto que se perdería.

#### Scenario: Alta desde el formulario

- **WHEN** el usuario rellena el formulario de alta y confirma
- **THEN** la planta se crea y la aplicación lleva a su ficha

#### Scenario: Edición prellenada

- **WHEN** el usuario abre la edición de una planta existente
- **THEN** el formulario muestra los valores actuales de esa planta

#### Scenario: Edición guardada

- **WHEN** el usuario cambia el apodo, la localización o la especie de una planta y confirma
- **THEN** los cambios se guardan, la aplicación lleva a la ficha de la planta y esta muestra los valores nuevos

#### Scenario: Edición sin avisos de guardado parcial

- **WHEN** el usuario guarda una edición correcta
- **THEN** no aparece ningún aviso de que los cambios no se han guardado

#### Scenario: Edición rechazada por el API

- **WHEN** el API rechaza la edición, por ejemplo porque la localización ya no existe
- **THEN** se explica el motivo, el usuario sigue en el formulario y lo que había escrito no se pierde

#### Scenario: Campo que el API no admite guardar

- **WHEN** el usuario intenta editar un campo que el API todavía no permite modificar
- **THEN** no puede: el campo está deshabilitado, de modo que ningún cambio se pierde en silencio ni se simula que se ha guardado

#### Scenario: Campo sin sitio donde guardarse

- **WHEN** el formulario presenta un campo que el API no acepta todavía
- **THEN** se muestra deshabilitado y explicando cuándo llegará, en lugar de admitir un texto que se perdería

#### Scenario: Sección del campo que falta

- **WHEN** el usuario confirma con un campo obligatorio vacío en otra sección
- **THEN** la aplicación lleva a la sección de ese campo y señala cuál falta

#### Scenario: Elegir la especie

- **WHEN** el usuario busca y elige una especie
- **THEN** la elegida queda distinguida y la pauta que heredará la planta pasa a estar a la vista
