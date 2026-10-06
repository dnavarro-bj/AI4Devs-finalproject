## ADDED Requirements

### Requirement: Cuidados propios y perfil efectivo en las pantallas

La sección de **cuidados efectivos** del formulario de alta y edición SHALL permitir personalizar la pauta del ejemplar: un interruptor abre el editor de los cinco conceptos —humedad, temperatura, horas de luz, riego y sustrato—, cada uno con **el valor heredado de la especie a la vista** como referencia. Solo lo que el usuario rellena se sobrescribe; lo que deja vacío se hereda. Un error del API SHALL explicarse sin perder lo escrito.

La **ficha** SHALL mostrar el **perfil efectivo** y **distinguir lo propio de lo heredado a simple vista**: cada valor lleva la marca «propio» o «de la especie» **en texto**, y lo propio se distingue además por su forma, no solo por el color. Sin cuidados propios, la ficha lo dice: «Hereda toda la pauta de su especie».

La exposición y el entorno propios SHALL seguir marcados con su ticket (T-17): la especie todavía no los tiene.

#### Scenario: Editor con el valor heredado a la vista

- **WHEN** el usuario activa la personalización de cuidados con una especie elegida
- **THEN** cada concepto muestra el valor de la especie como referencia, y los campos propios están vacíos

#### Scenario: Solo lo rellenado se sobrescribe

- **WHEN** el usuario rellena solo la pauta de riego y guarda
- **THEN** se envía únicamente esa pauta como cuidado propio

#### Scenario: Desactivar la personalización quita los cuidados propios

- **WHEN** el usuario desactiva la personalización en la edición de un ejemplar que tenía cuidados propios y guarda
- **THEN** el ejemplar vuelve a heredar toda la pauta de su especie

#### Scenario: Edición prellenada con lo propio

- **WHEN** el usuario abre la edición de un ejemplar con cuidados propios
- **THEN** la personalización aparece activa con sus valores, y lo no sobrescrito vacío

#### Scenario: La ficha distingue lo propio de lo heredado

- **WHEN** se abre la ficha de un ejemplar que sobrescribe la humedad
- **THEN** la humedad lleva la marca «propio» y el resto «de la especie», con texto y no solo color

#### Scenario: Sin cuidados propios

- **WHEN** se abre la ficha de un ejemplar que no sobrescribe nada
- **THEN** se dice que hereda toda la pauta de su especie

#### Scenario: Perfil incoherente rechazado por el API

- **WHEN** el API rechaza unos cuidados propios incoherentes
- **THEN** se explica qué rango falla, el usuario sigue en el formulario y lo escrito no se pierde

#### Scenario: Cambio de especie con cuidados que no encajan

- **WHEN** el API rechaza el cambio de especie porque los cuidados propios no encajan con la nueva
- **THEN** se explica el conflicto y el ejemplar conserva su especie
