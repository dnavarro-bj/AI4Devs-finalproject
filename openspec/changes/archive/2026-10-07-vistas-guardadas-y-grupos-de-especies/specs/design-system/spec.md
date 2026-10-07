## ADDED Requirements

### Requirement: Navegación de grupos

El kit SHALL ofrecer `UiGroupNav`: una navegación de grupos —cada uno con símbolo, nombre y subtítulo— en la que **exactamente uno** puede estar seleccionado, como la fila `species-groups` del prototipo. SHALL tener **un solo elemento raíz** (`nav` con `aria-label`), cada grupo SHALL ser un botón con `aria-pressed` o `aria-current` según su estado, y SHALL emitir la selección sin conocer qué es un grupo del producto: recibe `{ id, label, hint?, symbol? }` y no accede a datos. Sin ningún seleccionado, ninguno SHALL marcarse. SHALL aparecer en `/ui-kit`.

#### Scenario: Un seleccionado

- **WHEN** se monta con tres grupos y `modelValue` apuntando al segundo
- **THEN** solo ese tiene `aria-pressed="true"` y está marcado visualmente

#### Scenario: Elegir emite

- **WHEN** se pulsa otro grupo
- **THEN** emite `update:modelValue` con su id y no cambia por sí mismo

#### Scenario: Ninguno seleccionado

- **WHEN** `modelValue` es `null`
- **THEN** ningún grupo se marca

#### Scenario: Teclado

- **WHEN** se navega con Tab y se pulsa Enter o Espacio
- **THEN** cada grupo es alcanzable y se activa como un botón

#### Scenario: Atributos del punto de uso

- **WHEN** se monta con `data-test` y `aria-label`
- **THEN** caen en el elemento raíz
