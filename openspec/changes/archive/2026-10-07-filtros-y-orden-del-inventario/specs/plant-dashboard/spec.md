## ADDED Requirements

### Requirement: El inventario busca, filtra y ordena como el prototipo

La pantalla `/plants` SHALL reproducir la composición de `data-screen="plants"`: cabecera con el recuento, **barra de herramientas** con la búsqueda, los desplegables Localización, Especie y Estado, «Más filtros» y la configuración de columnas; debajo, los **criterios aplicados** con «Limpiar filtros»; después, la tabla paginada. La caja SHALL decir «Código, apodo o especie» y buscar por `q` tras una pausa. El desplegable de **Especie** SHALL ofrecer las especies reales y dejar de ser maqueta. «Más filtros» SHALL ofrecer exposición y entorno de la especie, además de etiqueta. Cada criterio aplicado SHALL poder retirarse por separado.

#### Scenario: Buscar por apodo

- **WHEN** la persona escribe «suegra» en la caja de búsqueda
- **THEN** tras la pausa la tabla muestra los ejemplares que lo contienen y aparece el criterio «Búsqueda: suegra»

#### Scenario: Filtrar por especie

- **WHEN** elige una especie en el desplegable
- **THEN** la tabla se limita a sus ejemplares y aparece «Especie: …», que se puede quitar

#### Scenario: Más filtros

- **WHEN** abre «Más filtros» y elige una exposición
- **THEN** el filtro se aplica a la especie del ejemplar y aparece como criterio

#### Scenario: Quitar un criterio

- **WHEN** retira el criterio de especie y deja los demás
- **THEN** la tabla recarga sin ese filtro y conserva el resto

#### Scenario: Ningún resultado

- **WHEN** los filtros no admiten ningún ejemplar
- **THEN** la pantalla dice que nada coincide y ofrece limpiar los filtros, sin confundirlo con un inventario vacío

### Requirement: Filtros, orden y columnas del inventario viven en la URL

El estado de `/plants` —los filtros, el orden y las columnas visibles— SHALL reflejarse en la *query string*, y al abrir la pantalla con una URL SHALL reproducirse ese estado. Cambiar un criterio SHALL actualizar la URL sin añadir una entrada de historial por cada tecla. Un parámetro desconocido o inválido en la URL SHALL ignorarse sin romper la pantalla.

#### Scenario: Recargar conserva el estado

- **WHEN** hay un filtro por especie, orden por localización y una columna oculta, y se recarga la página
- **THEN** reaparecen los tres

#### Scenario: Enlace compartido

- **WHEN** se abre `/plants?species=<id>&sort=species,asc`
- **THEN** la tabla ya viene filtrada y ordenada, y el criterio de especie se ve como aplicado

#### Scenario: Parámetro inválido

- **WHEN** la URL trae `?status=resucitada`
- **THEN** la pantalla carga sin ese filtro y no muestra un error

### Requirement: Las columnas ordenan por el API con claves públicas

Las columnas «Planta», «Especie» y «Localización» de `/plants` SHALL ordenar enviando `sort` al API con las claves `nickname`, `species` y `location`; la tabla SHALL NOT reordenar la página en el cliente. Los criterios de orden «Última revisión» (T-20) y «Atención» (T-23) SHALL figurar como **no disponibles, con su ticket**, en el sitio que les corresponde.

#### Scenario: Ordenar por especie

- **WHEN** se pulsa la cabecera «Especie»
- **THEN** se pide `sort=species,asc` y se pinta lo que el API devuelve

#### Scenario: Invertir

- **WHEN** se pulsa otra vez
- **THEN** se pide `sort=species,desc`

#### Scenario: Orden no disponible

- **WHEN** se mira el selector de orden
- **THEN** «Última revisión» y «Atención» aparecen deshabilitados con «T-20» y «T-23»

### Requirement: El catálogo de especies filtra y ordena como el prototipo

La pantalla `/species` SHALL reproducir, en la barra de herramientas de `data-screen="species"`, la búsqueda («Nombre científico, común o código») y los desplegables Exposición, Temperatura y Crecimiento, con los criterios aplicados retirables uno a uno, la nota «Mostrando N de M especies» y el orden por columna enviado al API. Los filtros y el orden SHALL vivir en la URL como en el inventario. La fila de **grupos de cultivo** del prototipo SHALL figurar marcada con el change que la levanta (`vistas-guardadas-y-grupos-de-especies`) y no omitirse. El desplegable «Riego» SHALL figurar como no disponible: el riego orientativo es texto libre.

#### Scenario: Filtrar por exposición

- **WHEN** se elige «Semisombra»
- **THEN** la tabla muestra solo esas especies y la nota dice «Mostrando N de M especies»

#### Scenario: Crecimiento

- **WHEN** se elige un intervalo de meses de crecimiento
- **THEN** se piden `growthMonth` repetidos y se muestran las especies que lo cubren

#### Scenario: Ordenar por nombre científico

- **WHEN** se pulsa la cabecera «Especie»
- **THEN** se pide `sort=scientificName,asc`

#### Scenario: Grupos marcados

- **WHEN** se abre la pantalla
- **THEN** la fila de grupos aparece con su marca y sin simular especies agrupadas

#### Scenario: Estado de la URL

- **WHEN** se recarga con filtros aplicados
- **THEN** se reproducen filtros y orden
