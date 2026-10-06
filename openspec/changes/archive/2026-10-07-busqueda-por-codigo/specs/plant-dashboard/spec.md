## ADDED Requirements

### Requirement: Búsqueda por código en el inventario

La caja de búsqueda del inventario SHALL **buscar por código de inventario** mientras se escribe, con un breve retardo para no lanzar una petición por tecla, y SHALL aparecer entre los filtros aplicados, de modo que se pueda quitar. Se combina con el filtro de localización y de etiqueta. Con una búsqueda activa, el listado SHALL volver a su primera página. La caja SHALL decir que buscar por apodo o por especie llega con su ticket (T-21): no presentarse como un buscador completo cuando solo busca códigos.

Una búsqueda sin resultados SHALL explicarlo, mencionando el texto buscado, y ofrecer quitar el filtro.

#### Scenario: Escribir un código

- **WHEN** el usuario escribe `gruss` en la caja de búsqueda del inventario
- **THEN** el listado muestra solo las plantas cuyo código lo contiene y la búsqueda aparece como filtro aplicado

#### Scenario: Una petición por pausa, no por tecla

- **WHEN** el usuario escribe varias letras seguidas
- **THEN** se hace una sola petición cuando deja de escribir

#### Scenario: Quitar la búsqueda

- **WHEN** el usuario quita el filtro de búsqueda aplicado
- **THEN** el listado vuelve a mostrar el inventario sin ese criterio y la caja queda vacía

#### Scenario: Combinada con la localización

- **WHEN** el usuario busca por código y además filtra por una localización
- **THEN** el listado cumple las dos condiciones

#### Scenario: Sin coincidencias

- **WHEN** la búsqueda no encuentra ninguna planta
- **THEN** se explica que ninguna planta tiene ese texto en su código y se ofrece quitar la búsqueda

#### Scenario: Lo que la caja no busca, declarado

- **WHEN** se abre el inventario
- **THEN** la caja indica que buscar por apodo o especie llega con T-21

#### Scenario: Búsqueda por teclado

- **WHEN** el usuario alcanza la caja con el teclado y escribe
- **THEN** puede buscar sin usar el ratón
