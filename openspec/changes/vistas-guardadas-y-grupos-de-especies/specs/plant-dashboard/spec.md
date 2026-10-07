## ADDED Requirements

### Requirement: Vistas guardadas en el inventario

La pantalla `/plants` SHALL ofrecer, en su barra de herramientas junto a «Configurar columnas», un selector **«Vistas»** con las vistas guardadas de ámbito `plants`. **Aplicar** una vista SHALL escribir sus filtros, orden y columnas en la URL, de modo que la pantalla reproduce el estado igual que con un enlace compartido. Desde el selector SHALL poder **guardar la vista actual con un nombre**, **reemplazar** una vista con el estado actual, **renombrarla** y **borrarla** tras confirmar. Cuando el estado actual coincide con una vista guardada, esa vista SHALL aparecer marcada; si se modifica un criterio, deja de estarlo.

#### Scenario: Guardar la vista actual

- **WHEN** hay un filtro por estado, orden por especie y una columna oculta, y se guarda como «Cuarentena»
- **THEN** «Cuarentena» aparece en el selector y queda marcada

#### Scenario: Volver a una vista

- **WHEN** se limpia todo y se aplica «Cuarentena»
- **THEN** reaparecen el filtro, el orden y la columna oculta, y la URL los refleja

#### Scenario: Modificar una vista aplicada

- **WHEN** se aplica una vista y se cambia un criterio
- **THEN** la vista deja de aparecer marcada y se ofrece «Reemplazar la vista con este estado»

#### Scenario: Nombre repetido

- **WHEN** se guarda con un nombre que ya existe
- **THEN** el diálogo muestra el error del API y conserva lo escrito

#### Scenario: Borrar con confirmación

- **WHEN** se elige borrar una vista y se confirma
- **THEN** desaparece del selector y la pantalla conserva el estado actual de la tabla

#### Scenario: Sin vistas

- **WHEN** no hay ninguna
- **THEN** el selector lo dice y ofrece guardar la actual

#### Scenario: Fallo al cargar las vistas

- **WHEN** el API de vistas falla
- **THEN** el inventario sigue funcionando y el selector muestra el error en línea

### Requirement: Grupos de cultivo en el catálogo de especies

La pantalla `/species` SHALL pintar, entre la cabecera y la barra de herramientas, la fila de **grupos de cultivo guardados** de `data-screen="species"`: «Todas» —con el total de especies— y un grupo por cada vista de ámbito `species`, cada uno con su símbolo, nombre y recuento. El grupo **seleccionado** SHALL ser el cuya consulta coincide con la de la URL; «Todas» lo es cuando no hay criterios. Elegir un grupo SHALL escribir su consulta en la URL. Desde la barra de filtros SHALL poder **guardar los filtros actuales como grupo**, con un nombre, y borrar o renombrar un grupo. El símbolo se **deriva** de la regla (☼ y ◐ por exposición, uno neutro en el resto).

#### Scenario: Crear un grupo desde filtros

- **WHEN** se filtra por exposición «semisombra» y se guarda como «Cactus de semisombra»
- **THEN** aparece en la fila con su recuento y queda seleccionado

#### Scenario: Elegir un grupo

- **WHEN** se pulsa «Sensibles al frío»
- **THEN** la URL recibe su consulta, la tabla muestra solo esas especies y la nota dice «Mostrando N de M especies»

#### Scenario: «Todas»

- **WHEN** no hay ningún criterio
- **THEN** «Todas» está seleccionada y muestra el total

#### Scenario: Cambiar un filtro sale del grupo

- **WHEN** con un grupo seleccionado se añade otro criterio
- **THEN** ningún grupo queda seleccionado y se ofrece guardar el estado como grupo nuevo o reemplazar el existente

#### Scenario: Una especie cambia de grupo sola

- **WHEN** se edita una especie y deja de cumplir la regla de un grupo, y se vuelve al catálogo
- **THEN** el recuento del grupo es uno menos y la especie ya no figura en él

#### Scenario: Sin grupos

- **WHEN** no hay ninguno
- **THEN** la fila muestra solo «Todas» y una invitación a guardar los filtros como grupo; no se simulan grupos

#### Scenario: Un grupo con valores retirados

- **WHEN** la regla de un grupo apunta a una mezcla que ya no existe
- **THEN** el grupo se muestra con recuento 0 y no rompe la pantalla
