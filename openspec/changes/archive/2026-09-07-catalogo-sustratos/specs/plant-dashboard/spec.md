## ADDED Requirements

### Requirement: Catálogo de mezclas de sustrato

La aplicación SHALL mostrar el catálogo de mezclas con su nombre, su composición y su rango de pH, paginado y ordenable, con navegación a la ficha de cada una y al alta de una nueva. Con el catálogo vacío SHALL explicarlo y ofrecer una única acción: registrar la primera.

#### Scenario: Catálogo con mezclas

- **WHEN** el usuario abre el catálogo y el API devuelve mezclas registradas
- **THEN** se muestra una fila por mezcla con su nombre, su composición y su rango de pH

#### Scenario: Catálogo vacío

- **WHEN** no hay ninguna mezcla registrada
- **THEN** se explica y se ofrece registrar la primera, sin una tabla en blanco

### Requirement: Ficha de una mezcla de sustrato

La aplicación SHALL mostrar la ficha de una mezcla con su composición **representada visualmente** además de en cifras, su rango de pH, su descripción y las especies que la recomiendan. La ficha SHALL ser el punto desde el que se corrige o se retira.

#### Scenario: Ficha de una mezcla

- **WHEN** el usuario abre la ficha de una mezcla existente
- **THEN** se muestran su composición en proporción y en cifras, su rango de pH y su descripción

#### Scenario: Mezcla inexistente

- **WHEN** el usuario abre un identificador que el API no reconoce
- **THEN** se explica que no existe, con salida hacia el catálogo

### Requirement: Alta y edición de una mezcla

La aplicación SHALL usar **el mismo formulario** para registrar y para corregir una mezcla, prellenado en la corrección, y SHALL **señalar en la propia pantalla** cuando los porcentajes no sumen 100 o el rango de pH esté invertido, antes de enviar.

#### Scenario: Composición que no cuadra

- **WHEN** el usuario introduce porcentajes que no suman 100
- **THEN** la interfaz lo señala indicando cuánto falta o cuánto sobra, y no envía la petición

#### Scenario: Rango de pH invertido

- **WHEN** el usuario introduce un pH mínimo mayor que el máximo
- **THEN** la interfaz lo señala y no envía la petición

#### Scenario: Alta de una mezcla

- **WHEN** el usuario completa una composición válida y confirma
- **THEN** la mezcla se registra y la aplicación lleva a su ficha

### Requirement: Retirada de una mezcla desde la interfaz

La aplicación SHALL pedir confirmación antes de retirar una mezcla. Cuando el API la rechace por estar en uso, SHALL explicar esa causa concreta y NO SHALL presentarla como un fallo inesperado.

#### Scenario: Retirada confirmada

- **WHEN** el usuario confirma la retirada de una mezcla sin uso
- **THEN** la mezcla se retira y la aplicación vuelve al catálogo

#### Scenario: Mezcla en uso

- **WHEN** el usuario intenta retirar una mezcla que alguna especie recomienda
- **THEN** se le explica que no puede retirarse mientras esté en uso, y la mezcla permanece
