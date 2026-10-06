## ADDED Requirements

### Requirement: Código de inventario de una planta

Todo ejemplar SHALL tener un **código de inventario** compuesto por el código de su especie y un **número correlativo propio de esa especie**, con al menos dos cifras: `CAT-GRUSS-01`, `CAT-GRUSS-02`. SHALL asignarse al darlo de alta, ser **único** en toda la colección y viajar en el alta, el detalle y el listado del inventario. El número crece con naturalidad más allá de las dos cifras: tras el 99 viene el 100.

La asignación SHALL ser **segura ante altas simultáneas**: dos ejemplares de la misma especie dados de alta a la vez SHALL obtener códigos distintos y consecutivos, sin repetirse ni dejar huecos por el conflicto. Un número ya asignado **no se reutiliza** nunca.

#### Scenario: Primer ejemplar de una especie

- **WHEN** se da de alta el primer ejemplar de una especie con código `CAT-GRUSS`
- **THEN** la respuesta incluye el código `CAT-GRUSS-01`

#### Scenario: Ejemplares consecutivos

- **WHEN** se dan de alta tres ejemplares seguidos de la misma especie
- **THEN** reciben `CAT-GRUSS-01`, `CAT-GRUSS-02` y `CAT-GRUSS-03`

#### Scenario: Numeración independiente por especie

- **WHEN** se da de alta un ejemplar de otra especie con código `CAT-MAMMI`
- **THEN** recibe `CAT-MAMMI-01`, sin que influya la numeración de la primera especie

#### Scenario: Más de dos cifras

- **WHEN** una especie ya tiene 99 ejemplares y se da de alta otro
- **THEN** el nuevo recibe el código con el número `100`

#### Scenario: Altas simultáneas de la misma especie

- **WHEN** dos ejemplares de la misma especie se dan de alta a la vez
- **THEN** ambas altas terminan con éxito y los códigos son distintos y consecutivos

#### Scenario: El código viaja en el detalle y en el listado

- **WHEN** se consulta el detalle de una planta o el listado del inventario
- **THEN** cada planta incluye su código de inventario

### Requirement: El código de un ejemplar es inmutable

El código de un ejemplar SHALL **no cambiar nunca**: ni al editarlo, ni al cambiarle la especie, ni al corregir el código de su especie. Cambiar la especie de una planta conserva su código aunque ya no coincida con el de su especie actual, porque una etiqueta ya pegada en la maceta tiene que seguir siendo válida.

#### Scenario: Editar el apodo o la localización

- **WHEN** se edita el apodo o la localización de una planta
- **THEN** su código es el mismo que antes

#### Scenario: Cambiar la especie

- **WHEN** se cambia la especie de una planta
- **THEN** conserva su código y el siguiente ejemplar de la especie antigua no lo reutiliza

#### Scenario: El código no se envía al editar

- **WHEN** se edita una planta enviando en el cuerpo un código distinto
- **THEN** el código enviado se ignora y la planta conserva el suyo
