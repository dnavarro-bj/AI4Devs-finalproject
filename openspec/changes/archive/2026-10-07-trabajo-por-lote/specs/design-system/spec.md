## ADDED Requirements

### Requirement: Aviso de selección ampliable

El kit SHALL ofrecer `UiSelectionBanner`: el aviso que acompaña a una tabla con selección múltiple cuando hay **más resultados que filas**. Recibe `pageCount` (las seleccionadas de la página), `total` (los resultados), `allSelected` y emite `select-all` y `clear`. SHALL decir en texto «Seleccionadas las N de esta página» con la acción «Seleccionar los M resultados», y una vez ampliada, «Seleccionados los M resultados» con «Volver a la página». SHALL tener **un solo elemento raíz**, anunciarse con `aria-live="polite"` y SHALL NOT mostrarse si `total` no supera `pageCount`. SHALL aparecer en `/ui-kit`.

#### Scenario: Ofrecer ampliar

- **WHEN** se monta con `pageCount` 25, `total` 486 y `allSelected` falso
- **THEN** dice «Seleccionadas las 25 de esta página» y ofrece «Seleccionar los 486 resultados»

#### Scenario: Ampliar emite

- **WHEN** se pulsa «Seleccionar los 486 resultados»
- **THEN** emite `select-all` y no cambia por sí mismo

#### Scenario: Ya ampliada

- **WHEN** `allSelected` es verdadero
- **THEN** dice «Seleccionados los 486 resultados» y ofrece «Volver a la página», que emite `clear`

#### Scenario: Nada que ampliar

- **WHEN** `total` no supera `pageCount`
- **THEN** no se muestra

#### Scenario: Anuncio y raíz

- **WHEN** se monta con `data-test`
- **THEN** el atributo cae en el elemento raíz, que lleva `aria-live="polite"`
