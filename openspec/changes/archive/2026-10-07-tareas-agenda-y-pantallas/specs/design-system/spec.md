## ADDED Requirements

### Requirement: Menú de acciones

El kit SHALL ofrecer `UiActionMenu`: un botón de acciones que despliega una lista de acciones nombradas, como el «•••» de cada fila del prototipo. Recibe `label` (el nombre accesible del botón) y `actions` con `{ id, label, tone?, disabled? }`, y SHALL emitir `select` con el `id` elegido sin conocer qué hace cada acción. SHALL tener **un solo elemento raíz**, el botón SHALL declarar `aria-haspopup` y `aria-expanded`, y la lista SHALL cerrarse con Escape, al elegir una acción y al hacer clic fuera, devolviendo el foco al botón. SHALL poder recorrerse con las flechas y activarse con Enter o Espacio, y una acción deshabilitada SHALL no poder elegirse. SHALL aparecer en `/ui-kit`.

#### Scenario: Abrir y elegir

- **WHEN** se pulsa el botón y se elige «Omitir»
- **THEN** emite `select` con el id de esa acción y la lista se cierra

#### Scenario: Teclado

- **WHEN** se abre con Enter, se recorre con las flechas y se activa con Enter
- **THEN** se elige la acción enfocada

#### Scenario: Escape

- **WHEN** la lista está abierta y se pulsa Escape
- **THEN** se cierra y el foco vuelve al botón

#### Scenario: Acción deshabilitada

- **WHEN** una acción está `disabled`
- **THEN** no se puede elegir ni emite nada

#### Scenario: Atributos del punto de uso

- **WHEN** se monta con `data-test`
- **THEN** cae en el elemento raíz
