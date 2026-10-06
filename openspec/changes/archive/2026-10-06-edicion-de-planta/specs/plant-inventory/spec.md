## ADDED Requirements

### Requirement: Edición de una planta

El sistema SHALL permitir modificar una planta ya creada: su apodo, su localización y su especie. La petición es un **reemplazo completo** de esos tres campos —no un parche— y la respuesta SHALL ser el detalle de la planta ya actualizado.

La edición SHALL conservar la identidad del ejemplar: su identificador, su fecha de alta, sus tags, su historial de lecturas de cultivo y los análisis de IA de esas lecturas. **Cambiar la especie SHALL cambiar los cuidados efectivos de la planta** —que se heredan de ella— sin alterar nada de lo anterior. El nombre se almacena sin espacios al principio ni al final, como en el alta.

#### Scenario: Apodo corregido

- **WHEN** se edita una planta enviando un apodo nuevo y conservando su localización y especie
- **THEN** la respuesta es `200 OK` con el apodo nuevo, y el detalle posterior y el listado del inventario lo reflejan

#### Scenario: Apodo con espacios sobrantes

- **WHEN** se edita una planta con el apodo ` Bola 2 `
- **THEN** la planta queda con el apodo `Bola 2`

#### Scenario: Cambio de localización

- **WHEN** se edita una planta indicando otra localización existente
- **THEN** el detalle posterior muestra la localización nueva y el inventario filtrado por la antigua ya no la incluye

#### Scenario: Cambio de especie

- **WHEN** se edita una planta indicando otra especie existente
- **THEN** el detalle posterior muestra la especie nueva y los cuidados efectivos de esa especie

#### Scenario: Cambiar la especie conserva la identidad y el historial

- **WHEN** una planta con tags y lecturas de cultivo cambia de especie
- **THEN** conserva su identificador, su fecha de alta, sus tags y todas sus lecturas con sus análisis de IA

#### Scenario: La edición no toca los tags

- **WHEN** se edita una planta que tiene tags
- **THEN** el detalle posterior conserva exactamente los mismos tags, porque su asignación tiene su propio endpoint

#### Scenario: Edición idempotente

- **WHEN** se edita dos veces seguidas una planta con los mismos valores
- **THEN** ambas peticiones terminan con éxito y la planta queda igual

#### Scenario: Apodo en blanco

- **WHEN** se edita una planta con el apodo vacío o solo espacios
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que indica que el apodo es obligatorio, y la planta conserva el que tenía

#### Scenario: Edición de una planta inexistente

- **WHEN** se edita una planta cuyo identificador no existe
- **THEN** la respuesta es `404 Not Found` con el cuerpo de error uniforme, y no se produce un error interno del servidor

## MODIFIED Requirements

### Requirement: Validación de las referencias de una planta

El sistema SHALL rechazar el alta **y la edición** de una planta cuya especie o localización no exista, devolviendo un error controlado del cliente que identifique la referencia inválida. En ningún caso SHALL responderse con un error interno del servidor (`5xx`) ante una referencia inexistente. Una referencia inválida en la edición SHALL dejar la planta **exactamente como estaba**: no se aplica ningún cambio parcial, ni siquiera el del apodo.

La referencia a un recurso que viaja en el cuerpo se rechaza con `400`; el `404` queda para el recurso de la dirección (la planta).

#### Scenario: Especie inexistente

- **WHEN** se solicita crear una planta cuyo identificador de especie no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la especie como referencia inválida, y no se crea ninguna planta

#### Scenario: Localización inexistente

- **WHEN** se solicita crear una planta cuyo identificador de localización no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la localización como referencia inválida, y no se crea ninguna planta

#### Scenario: Identificador con formato inválido

- **WHEN** se solicita crear una planta con un identificador de especie que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

#### Scenario: Especie inexistente al editar

- **WHEN** se edita una planta indicando una especie que no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la especie como referencia inválida, y la planta conserva su apodo, su localización y su especie

#### Scenario: Localización inexistente al editar

- **WHEN** se edita una planta indicando una localización que no existe
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que identifica la localización como referencia inválida, y la planta no cambia

#### Scenario: Referencia inválida junto a un apodo nuevo

- **WHEN** se edita una planta con un apodo nuevo y una especie inexistente
- **THEN** la respuesta es `400 Bad Request` y el apodo anterior se conserva, porque la edición no se aplica a medias

#### Scenario: Identificador de edición con formato inválido

- **WHEN** se edita una planta con un identificador de localización que no es un identificador válido
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor
