## ADDED Requirements

### Requirement: Cuidados propios del ejemplar

El sistema SHALL permitir que un ejemplar **sobrescriba** valores de la pauta de su especie: los rangos de humedad, de temperatura y de horas de luz, la pauta de riego y la mezcla de sustrato. Cada valor es independiente y **opcional**: lo que no se sobrescribe se hereda. Se indican en el objeto opcional `careOverrides` del alta y de la edición; la edición es **reemplazo completo**, de modo que los valores que no se envíen vuelven a heredarse y no enviar el objeto quita todos los cuidados propios.

El detalle del ejemplar SHALL devolver `careOverrides` —solo los valores que sobrescribe, y ausente si no tiene ninguno— y `effectiveCare`, el **perfil que se aplica**: el valor propio donde lo hay y el de la especie donde no, junto con la lista de los campos que se apartan de la especie. El cliente no tiene que combinar nada.

#### Scenario: Sobrescribir un solo valor

- **WHEN** se edita un ejemplar sobrescribiendo solo la pauta de riego
- **THEN** el perfil efectivo usa esa pauta, y la humedad, la temperatura, la luz y el sustrato siguen siendo los de la especie

#### Scenario: El perfil efectivo dice qué se aparta

- **WHEN** se consulta un ejemplar que sobrescribe el máximo de temperatura y el sustrato
- **THEN** la respuesta lista exactamente esos dos campos como propios, y el resto como heredados

#### Scenario: Sin cuidados propios

- **WHEN** se consulta un ejemplar que no sobrescribe nada
- **THEN** `careOverrides` está ausente y el perfil efectivo es el de su especie, sin campos propios

#### Scenario: Sobrescribir no altera el resto

- **WHEN** se sobrescribe la humedad de un ejemplar
- **THEN** la temperatura, la luz, el riego y el sustrato efectivos no cambian

#### Scenario: La pauta de la especie cambia lo heredado

- **WHEN** se actualiza la pauta de riego de una especie y un ejemplar suyo no la sobrescribe
- **THEN** el perfil efectivo de ese ejemplar refleja la pauta nueva

#### Scenario: La pauta de la especie no pisa lo propio

- **WHEN** se actualiza la pauta de riego de una especie y un ejemplar suyo la sobrescribe
- **THEN** el perfil efectivo de ese ejemplar conserva su valor propio

#### Scenario: Reemplazo completo

- **WHEN** se edita un ejemplar con la humedad propia sobrescrita enviando solo la temperatura
- **THEN** la humedad vuelve a heredarse y la temperatura queda sobrescrita

#### Scenario: Quitar todos los cuidados propios

- **WHEN** se edita un ejemplar sin enviar `careOverrides`
- **THEN** el ejemplar vuelve a heredar toda la pauta de su especie

#### Scenario: Mezcla de sustrato propia inexistente

- **WHEN** se sobrescribe la mezcla de sustrato con un identificador que no existe
- **THEN** la respuesta es `400 Bad Request` identificando la mezcla como referencia inválida, y el ejemplar no cambia

### Requirement: Coherencia del perfil efectivo

Los cuidados propios SHALL ser **coherentes con la especie**: el perfil efectivo resultante cumple las mismas reglas que una especie —en cada rango, el mínimo no supera al máximo—, y la humedad está entre 0 y 100 y la luz entre 0 y 24 horas. Sobrescribir solo un extremo se juzga contra el otro extremo **que se aplicaría**: si no está sobrescrito, el de la especie. Un perfil incoherente SHALL rechazarse con `400 Bad Request` explicando qué rango falla, sin cambiar nada del ejemplar.

#### Scenario: Mínimo propio por encima del máximo heredado

- **WHEN** se sobrescribe la humedad mínima con un valor superior al máximo de la especie
- **THEN** la respuesta es `400 Bad Request` indicando el rango de humedad, y el ejemplar no cambia

#### Scenario: Máximo propio por debajo del mínimo heredado

- **WHEN** se sobrescribe la temperatura máxima con un valor inferior al mínimo de la especie
- **THEN** la respuesta es `400 Bad Request` indicando el rango de temperatura

#### Scenario: Los dos extremos propios coherentes entre sí

- **WHEN** se sobrescriben a la vez el mínimo y el máximo de luz con un rango válido que se aparta de la especie
- **THEN** la respuesta es `200 OK` y el perfil efectivo usa ese rango

#### Scenario: Los dos extremos propios incoherentes

- **WHEN** se sobrescriben a la vez un mínimo de luz superior al máximo propio
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Valores fuera de escala

- **WHEN** se sobrescribe la humedad con 120 o las horas de luz con 30
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Una edición incoherente no cambia nada, ni siquiera el apodo

- **WHEN** se edita un ejemplar con un apodo nuevo y unos cuidados propios incoherentes
- **THEN** la respuesta es `400 Bad Request` y el apodo anterior se conserva

### Requirement: Cambiar la especie conserva los cuidados propios

Cambiar la especie de un ejemplar SHALL **conservar sus cuidados propios**: son decisiones sobre esa planta, no sobre su especie. Los valores no sobrescritos pasan a heredarse de la especie nueva. Si los valores propios ya **no encajan** con la especie nueva —el perfil efectivo sería incoherente—, el cambio SHALL rechazarse con `400 Bad Request` explicando el conflicto, sin cambiar nada.

#### Scenario: La herencia pasa a la especie nueva

- **WHEN** un ejemplar sin cuidados propios cambia de especie
- **THEN** su perfil efectivo es el de la especie nueva

#### Scenario: Lo propio se conserva

- **WHEN** un ejemplar que sobrescribe la pauta de riego cambia de especie
- **THEN** conserva su pauta de riego propia y hereda el resto de la especie nueva

#### Scenario: Valores propios que no encajan con la especie nueva

- **WHEN** un ejemplar con una humedad mínima propia de 60 cambia a una especie cuya humedad máxima es 40
- **THEN** la respuesta es `400 Bad Request` explicando que sus cuidados propios no encajan con la especie nueva, y el ejemplar conserva la suya
