## ADDED Requirements

### Requirement: Catálogo de etiquetas

La aplicación SHALL mostrar el catálogo de etiquetas con la composición de la pantalla `tags` del prototipo: cabecera con el recuento y el alta, **resumen de salud del catálogo**, y el listado con el nombre, **el uso en la colección**, cuántas plantas tiene cada una y sus acciones. El listado SHALL ser paginado y ordenable, con navegación a la ficha de cada etiqueta y al alta de una nueva. Con el catálogo vacío SHALL explicarlo y ofrecer crear la primera.

El uso SHALL verse como **proporción sobre el inventario** además de leerse como cifra: una etiqueta con 286 plantas y otra con 12 se distinguen de un vistazo por su longitud, no comparando números. Una etiqueta **sin ninguna planta** SHALL aparecer igualmente, señalada como sin uso, porque es la que se puede retirar.

Lo que el prototipo muestra y el API todavía no sirve —los ejemplares de ejemplo de cada etiqueta, la fecha de la última modificación, la detección de posibles duplicados y la selección múltiple con acciones por lote— SHALL aparecer **marcado con su ticket en el sitio del layout que le corresponde**, nunca omitido ni simulado.

#### Scenario: El uso se ve, no solo se lee

- **WHEN** se muestra una etiqueta del catálogo
- **THEN** su uso aparece como proporción sobre el inventario, además de como número de plantas

#### Scenario: Etiqueta sin plantas

- **WHEN** una etiqueta no la tiene ninguna planta
- **THEN** aparece en el listado señalada como sin uso, no se oculta

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre el catálogo
- **THEN** los ejemplares de muestra, la fecha de modificación, los posibles duplicados y las acciones por lote aparecen marcados con su ticket

#### Scenario: Catálogo con etiquetas

- **WHEN** el usuario abre el catálogo y el API devuelve etiquetas
- **THEN** se muestra una fila por etiqueta con su nombre y su número de plantas

#### Scenario: Etiqueta sin uso

- **WHEN** una etiqueta no la tiene ninguna planta
- **THEN** se muestra con cero, que es información, y no se oculta

### Requirement: Ficha de una etiqueta

La aplicación SHALL mostrar la ficha de una etiqueta con la composición de la pantalla `tag-detail` del prototipo: portada con su marca, su nombre normalizado, su estado de uso y sus tres acciones —ver sus plantas, renombrar y combinar—; columna principal con **la distribución en la colección** y las plantas que la tienen; y columna lateral con la ficha de la etiqueta, el impacto de renombrarla y el panel de administrar.

La distribución SHALL presentarse como **cifras destacadas** —cuántas plantas y qué parte del inventario representan—, que es lo que responde a si la etiqueta sigue siendo útil. El **nombre normalizado** SHALL estar a la vista en la portada, porque es lo que decide si un renombrado choca con otra etiqueta.

Lo que el prototipo muestra y el API todavía no sirve —el reparto por especies y por localizaciones, la descripción de la etiqueta, y sus fechas de creación y modificación— SHALL aparecer **marcado con su ticket y en su bloque**, nunca omitido ni simulado.

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
