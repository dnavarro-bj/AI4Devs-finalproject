## ADDED Requirements

### Requirement: Catálogo de localizaciones

La aplicación SHALL ofrecer la pantalla del catálogo de localizaciones con la composición de la pantalla `locations` del prototipo: cabecera con el recuento y el alta, **mapa del vivero** a un lado y **vista general** al otro.

El mapa SHALL presentar las localizaciones como **árbol recorrible**, cada una con su nombre y la carga que soporta, encabezado por la colección completa; no como una tabla de filas sueltas. La vista general SHALL presentar cada localización como **tarjeta de zona** con su carga expresada además como **proporción ocupada**, y SHALL ofrecer salida al inventario completo.

Mientras el esquema sea plano, el árbol SHALL mostrar las localizaciones colgando de la colección completa, y la ausencia de niveles SHALL declararse con su ticket en el propio mapa, en lugar de sustituir el mapa por otra cosa.

#### Scenario: El catálogo es un mapa, no una lista

- **WHEN** se abre el catálogo con localizaciones registradas
- **THEN** se muestran el mapa del vivero como árbol y la vista general con una tarjeta por localización

#### Scenario: Cada localización dice la carga que soporta

- **WHEN** se muestra una localización, en el mapa o como tarjeta
- **THEN** aparece cuántos ejemplares alberga, y en la tarjeta también como proporción ocupada

#### Scenario: Localización vacía en el listado

- **WHEN** una localización no alberga ningún ejemplar
- **THEN** aparece igualmente, indicando que está vacía

#### Scenario: El total de la colección encabeza el mapa

- **WHEN** se abre el catálogo
- **THEN** el mapa se encabeza con la colección completa y su número de localizaciones y de ejemplares

#### Scenario: Catálogo sin localizaciones

- **WHEN** no hay ninguna localización registrada
- **THEN** se muestra un estado vacío que ofrece crear la primera, sin un mapa en blanco

#### Scenario: Los niveles que faltan quedan declarados

- **WHEN** se abre el catálogo
- **THEN** la jerarquía del prototipo —zonas, bancadas y bandejas— aparece marcada con su ticket dentro del propio mapa

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el mapa no aparece a medias

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su identidad y sus acciones; **fila de métricas** del espacio; columna principal con lo que contiene y los ejemplares que alberga; y columna lateral con las características del espacio, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta**, que es lo que identifica una localización, y las métricas SHALL presentarse como **cifras destacadas** con su matiz —no como una lista de campos—, porque son la respuesta a «cuánto hay aquí y cuánto trabajo tiene».

Lo que el prototipo muestra y el API todavía no sirve —la jerarquía y la ruta completa, el código del espacio, las características, los movimientos, las tareas y las alertas— SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

#### Scenario: Ficha con ejemplares

- **WHEN** se abre la ficha de una localización que alberga ejemplares
- **THEN** se muestran su portada, sus métricas y esos ejemplares, cada uno navegable a su ficha
- **AND** se ofrece ver el inventario filtrado por esa localización

#### Scenario: Las métricas abren la pantalla

- **WHEN** se abre la ficha
- **THEN** cuántos ejemplares alberga aparece como cifra destacada junto al resto de métricas del espacio

#### Scenario: Ficha de una localización vacía

- **WHEN** se abre la ficha de una localización sin ejemplares
- **THEN** se indica que está vacía y se ofrece retirarla

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre la ficha de una localización
- **THEN** la jerarquía, el código del espacio, las características, los movimientos y las tareas aparecen marcados con su ticket, cada uno en el bloque del layout que ocupan en el prototipo

#### Scenario: Localización inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la localización no existe, con salida al catálogo, y no una pantalla en blanco

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
