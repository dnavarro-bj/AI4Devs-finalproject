## ADDED Requirements

### Requirement: Catálogo de etiquetas

La aplicación SHALL mostrar el catálogo de etiquetas con su nombre y **cuántas plantas tiene cada una**, paginado y ordenable, con navegación a su ficha y al alta de una nueva. Con el catálogo vacío SHALL explicarlo y ofrecer crear la primera.

#### Scenario: Catálogo con etiquetas

- **WHEN** el usuario abre el catálogo y el API devuelve etiquetas
- **THEN** se muestra una fila por etiqueta con su nombre y su número de plantas

#### Scenario: Etiqueta sin uso

- **WHEN** una etiqueta no la tiene ninguna planta
- **THEN** se muestra con cero, que es información, y no se oculta

### Requirement: Ficha de una etiqueta

La aplicación SHALL mostrar la ficha de una etiqueta con su nombre, cuántas plantas la tienen y **las plantas que la tienen**, con navegación a cada una. La ficha SHALL ser el punto desde el que se renombra, se combina y se retira.

#### Scenario: Ficha de una etiqueta con plantas

- **WHEN** el usuario abre la ficha de una etiqueta que varias plantas tienen
- **THEN** se muestran esas plantas, con navegación a la ficha de cada una

#### Scenario: Ficha de una etiqueta sin plantas

- **WHEN** el usuario abre la ficha de una etiqueta que ninguna planta tiene
- **THEN** se explica que todavía no la tiene ninguna, y se ofrece retirarla

### Requirement: Administración de una etiqueta desde la interfaz

La aplicación SHALL permitir renombrar, combinar y retirar una etiqueta. La **combinación SHALL declarar cuántas plantas se verán afectadas antes de confirmarse** y advertir de que la etiqueta de origen desaparece. Cuando el API rechace una operación por conflicto —nombre ya usado, o etiqueta en uso—, la aplicación SHALL explicar esa causa concreta.

#### Scenario: Renombrado

- **WHEN** el usuario renombra una etiqueta a un nombre libre
- **THEN** el nombre cambia y las plantas que la tenían la conservan

#### Scenario: Nombre ya usado

- **WHEN** el usuario renombra una etiqueta a un nombre que ya existe
- **THEN** se le explica que ese nombre ya está en el catálogo, junto al campo, y el nombre no cambia

#### Scenario: Alcance de la combinación declarado

- **WHEN** el usuario elige combinar una etiqueta en otra
- **THEN** antes de confirmar se le indica cuántas plantas se verán afectadas y que la etiqueta de origen desaparecerá

#### Scenario: Combinación cancelada

- **WHEN** el usuario cierra la confirmación de la combinación sin aceptar
- **THEN** no se combina nada y ambas etiquetas permanecen

#### Scenario: Retirada de una etiqueta en uso

- **WHEN** el usuario intenta retirar una etiqueta que alguna planta tiene
- **THEN** se le explica que no puede retirarse mientras esté en uso, y se le ofrece combinarla en otra
