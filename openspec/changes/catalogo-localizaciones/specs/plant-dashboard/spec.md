## ADDED Requirements

### Requirement: Catálogo de localizaciones

La aplicación SHALL ofrecer una pantalla con las localizaciones existentes, cada una con **el número de ejemplares que alberga**, paginada como todo listado.

#### Scenario: Consulta del catálogo

- **WHEN** se abre el catálogo de localizaciones
- **THEN** se listan las localizaciones con su nombre y su número de ejemplares

#### Scenario: Localización vacía en el listado

- **WHEN** una localización no alberga ningún ejemplar
- **THEN** aparece igualmente en el listado, indicando que está vacía

#### Scenario: Catálogo sin localizaciones

- **WHEN** no hay ninguna localización registrada
- **THEN** se muestra un estado vacío que ofrece crear la primera

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el listado no aparece a medias

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con su cabecera, los ejemplares que alberga y su administración. Lo que la ficha del prototipo muestra y el API todavía no sirve —la jerarquía, las características del espacio, los movimientos y las tareas del lugar— SHALL aparecer **marcado como maqueta con el ticket que lo sustituye**, nunca simulado como si fuese dato.

#### Scenario: Ficha con ejemplares

- **WHEN** se abre la ficha de una localización que alberga ejemplares
- **THEN** se muestran esos ejemplares, cada uno navegable a su ficha
- **AND** se ofrece ver el inventario filtrado por esa localización

#### Scenario: Ficha de una localización vacía

- **WHEN** se abre la ficha de una localización sin ejemplares
- **THEN** se indica que está vacía y se ofrece retirarla

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre la ficha de una localización
- **THEN** la jerarquía, las características del espacio, los movimientos y las tareas aparecen marcados como maqueta con su ticket

### Requirement: Administración de una localización

La aplicación SHALL permitir crear una localización, corregir su nombre y retirarla desde su ficha. La retirada SHALL confirmarse, y un `409` del API SHALL explicarse por lo que significa —la localización alberga ejemplares— y no como un fallo genérico.

#### Scenario: Alta de una localización

- **WHEN** se crea una localización con su nombre
- **THEN** aparece en el catálogo y queda disponible para asignar a un ejemplar

#### Scenario: Nombre corregido

- **WHEN** se corrige el nombre de una localización desde su ficha
- **THEN** la ficha refleja el nombre nuevo y los ejemplares que alberga no cambian

#### Scenario: Retirada confirmada

- **WHEN** se retira una localización vacía y se confirma
- **THEN** se vuelve al catálogo y la localización ya no aparece

#### Scenario: Retirada bloqueada por uso

- **WHEN** se intenta retirar una localización que alberga ejemplares
- **THEN** se explica que no puede retirarse mientras albergue ejemplares, indicando cuántos son
- **AND** se ofrece ver esos ejemplares para moverlos, en lugar de dejar la acción sin salida
