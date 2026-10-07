## MODIFIED Requirements

### Requirement: Catálogo de localizaciones

La aplicación SHALL ofrecer la pantalla del catálogo de localizaciones con la composición de la pantalla `locations` del prototipo: cabecera con el recuento y el alta, **mapa del vivero** a un lado y **vista general** al otro.

El mapa SHALL presentar las localizaciones como **árbol recorrible a todos sus niveles**, cada nodo con su nombre y su carga —los ejemplares **totales**, contando los descendientes—, encabezado por la colección completa; no como una tabla de filas sueltas. Los nodos con hijas SHALL poder plegarse y desplegarse y el mapa SHALL ofrecer **buscar una localización** por nombre o código. La vista general SHALL presentar cada localización de **primer nivel** como **tarjeta de zona** con su carga expresada además como **proporción ocupada** cuando tenga capacidad, y SHALL ofrecer salida al inventario completo. Seleccionar un nodo del mapa SHALL llevar la vista general a esa zona.

#### Scenario: El catálogo es un mapa, no una lista

- **WHEN** se abre el catálogo con localizaciones registradas
- **THEN** se muestran el mapa del vivero como árbol y la vista general con una tarjeta por zona

#### Scenario: El árbol tiene todos sus niveles

- **WHEN** existen `Invernadero 1`, `Bancada norte` y `Bandeja A3` anidadas
- **THEN** el mapa las muestra anidadas, con `Invernadero 1` desplegable, y cada nodo dice sus ejemplares totales

#### Scenario: Cada localización dice la carga que soporta

- **WHEN** se muestra una localización, en el mapa o como tarjeta
- **THEN** aparece cuántos ejemplares alberga, y en la tarjeta con capacidad también como proporción ocupada

#### Scenario: Localización sin capacidad

- **WHEN** una tarjeta corresponde a una localización sin capacidad definida
- **THEN** no inventa una proporción: dice que no tiene capacidad definida

#### Scenario: Buscar en el mapa

- **WHEN** se escribe `A3` en la búsqueda del mapa
- **THEN** el mapa muestra solo las localizaciones que coinciden por nombre o código, con su ruta visible

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
- **THEN** ningún nivel del mapa aparece marcado con T-18: la jerarquía de zonas, bancadas y bandejas es la real

#### Scenario: El catálogo no puede consultarse

- **WHEN** la consulta del catálogo falla
- **THEN** se muestra el error sin dejar la pantalla en blanco, y el mapa no aparece a medias

### Requirement: Ficha de una localización

La aplicación SHALL ofrecer la ficha de una localización con la composición de la pantalla `location-detail` del prototipo: portada con su marca, su código, su ruta y sus acciones; **fila de métricas** del espacio; columna principal con **lo que contiene** —las sublocalizaciones— y los ejemplares que alberga; y columna lateral con las características del espacio, el próximo trabajo y los últimos movimientos.

La portada SHALL abrir con la **marca del espacio y su ruta completa**, y los **breadcrumbs reflejan esa ruta real** —Inicio / Localizaciones / cada ancestro / la localización— con cada ancestro navegable. Las métricas SHALL presentarse como **cifras destacadas** con su matiz: los ejemplares totales con cuántos hay directamente aquí, y cuántas sublocalizaciones. «Dentro de …» SHALL listar las sublocalizaciones con su carga y ofrecer **añadir dentro**, que abre el alta con esta localización como padre. Los ejemplares SHALL ir paginados con su ubicación exacta, y SHALL ofrecer ver el inventario filtrado por esta localización incluidos sus descendientes. Las características SHALL mostrar tipo, entorno, exposición, capacidad y **ocupación** (solo si hay capacidad) y las notas operativas. Los últimos movimientos SHALL mostrar los más recientes con su sentido —recibidos o cedidos, con el origen o el destino— y ofrecer el historial completo.

Lo que el prototipo muestra y el API todavía no sirve —las **tareas y el próximo trabajo** (T-22) y las **alertas** (T-23)— SHALL aparecer **marcado con el ticket que lo sustituye y en el sitio del layout que le corresponde**, nunca omitido ni simulado como si fuese dato.

#### Scenario: Ficha con ejemplares

- **WHEN** se abre la ficha de una localización que alberga ejemplares
- **THEN** se muestran su portada, sus métricas y esos ejemplares, cada uno navegable a su ficha
- **AND** se ofrece ver el inventario filtrado por esa localización con sus descendientes

#### Scenario: La ruta real en la portada y en los breadcrumbs

- **WHEN** se abre la ficha de `Bandeja A3`, dentro de `Bancada norte`, dentro de `Invernadero 1`
- **THEN** la portada muestra `Invernadero 1 / Bancada norte` y los breadcrumbs son Inicio / Localizaciones / Invernadero 1 / Bancada norte / Bandeja A3, con los ancestros navegables

#### Scenario: Las métricas abren la pantalla

- **WHEN** se abre la ficha
- **THEN** los ejemplares totales aparecen como cifra destacada con cuántos hay directamente aquí, junto a las sublocalizaciones

#### Scenario: Lo que contiene

- **WHEN** se abre la ficha de una localización con sublocalizaciones
- **THEN** «Dentro de» las lista con su carga, cada una navegable, y ofrece añadir otra dentro

#### Scenario: Ficha de una localización vacía

- **WHEN** se abre la ficha de una localización sin ejemplares ni sublocalizaciones
- **THEN** se indica que está vacía y se ofrece retirarla

#### Scenario: Ocupación solo con capacidad

- **WHEN** la localización tiene capacidad `250` y alberga 183 ejemplares totales
- **THEN** la ocupación se muestra como 73 %
- **AND** sin capacidad no se muestra un porcentaje sino que se dice que no está definida

#### Scenario: Últimos movimientos

- **WHEN** la localización ha recibido y cedido ejemplares
- **THEN** la columna lateral muestra los más recientes con el sentido y el origen o destino, y ofrece el historial completo

#### Scenario: Lo que todavía no existe queda declarado

- **WHEN** se abre la ficha de una localización
- **THEN** las tareas, el próximo trabajo y las alertas aparecen marcados con su ticket (T-22, T-23), cada uno en el bloque del layout que ocupa en el prototipo

#### Scenario: Localización inexistente

- **WHEN** se abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la localización no existe, con salida al catálogo, y no una pantalla en blanco

### Requirement: Administración de una localización

La aplicación SHALL permitir crear una localización, editarla por completo y retirarla desde su ficha, con la composición de la pantalla `location-editor` del prototipo: **posición en el vivero** —el padre elegido y la ruta resultante, con «cambiar padre»—, **identificación** —nombre, código corto, tipo, capacidad y descripción—, **características del espacio** —entorno, exposición y notas operativas— y un lateral que resume dónde se creará y recomienda poca profundidad.

El **código SHALL proponerse** a partir del nombre mientras no se haya escrito a mano (`Bancada norte` en `Invernadero 1` → `LOC-I1-BN`), y SHALL poder sobrescribirse. El selector de padre SHALL **excluir la propia localización y sus descendientes** al editar, de modo que el ciclo no sea ni ofrecible; el servidor lo rechaza igualmente. La retirada SHALL confirmarse, y un `409` del API SHALL explicarse por lo que significa —alberga ejemplares, contiene sublocalizaciones o figura en movimientos— y no como un fallo genérico.

#### Scenario: Alta de una localización

- **WHEN** se crea una localización con su nombre y su código
- **THEN** aparece en el catálogo y queda disponible para asignar a un ejemplar

#### Scenario: Alta dentro de otra

- **WHEN** se abre el alta desde «Añadir dentro» de `Bancada norte`
- **THEN** la posición ya es `Bancada norte`, la ruta resultante se muestra y la localización se crea dentro

#### Scenario: El código se propone

- **WHEN** se escribe el nombre `Bancada norte` sin tocar el código
- **THEN** el formulario propone un código y lo mantiene actualizado hasta que se edita a mano

#### Scenario: Un código escrito a mano no se pisa

- **WHEN** se edita el código a mano y luego se cambia el nombre
- **THEN** el código escrito se conserva

#### Scenario: Código ya usado

- **WHEN** el API responde `409` por un código repetido
- **THEN** el formulario lo dice junto al campo, sin perder lo escrito

#### Scenario: Nombre corregido

- **WHEN** se corrige el nombre de una localización desde su ficha
- **THEN** la ficha refleja el nombre nuevo y los ejemplares que alberga no cambian

#### Scenario: Edición completa

- **WHEN** se corrigen el nombre, el tipo y el padre desde su ficha
- **THEN** la ficha refleja los valores nuevos, la ruta nueva y los ejemplares que alberga no cambian

#### Scenario: El padre no puede ser un descendiente

- **WHEN** se abre el selector de padre al editar `Invernadero 1`
- **THEN** ni ella ni sus descendientes aparecen como opción

#### Scenario: Retirada confirmada

- **WHEN** se retira una localización vacía y se confirma
- **THEN** se vuelve al catálogo y la localización ya no aparece

#### Scenario: Retirada bloqueada por uso

- **WHEN** se intenta retirar una localización que alberga ejemplares o contiene sublocalizaciones
- **THEN** se explica cuál de las dos cosas lo impide, con la cifra, en lugar de un fallo genérico
- **AND** se ofrece verlos para moverlos, en lugar de dejar la acción sin salida

## ADDED Requirements

### Requirement: Mover ejemplares desde la interfaz

La aplicación SHALL permitir **mover ejemplares** a una localización desde dos puntos: la **lista de ejemplares de la ficha de una localización**, seleccionando uno o varios y eligiendo el destino en el árbol —«Mover a…»—, y la edición del ejemplar, donde cambiar la localización sigue siendo un movimiento. Antes de confirmar un movimiento por lote, la pantalla SHALL **declarar cuántos ejemplares se moverán, desde dónde y hacia dónde**, y el destino SHALL NOT poder ser la propia localización de origen, y la confirmación SHALL ser explícita. Al terminar SHALL decir cuántos se movieron y el listado de la localización SHALL reflejarlo sin recargar a mano.

La ficha del ejemplar SHALL mostrar su **historial de movimientos** (origen, destino, fecha); que aparezcan en su cronología unificada queda marcado con **T-20**.

#### Scenario: El lote declara su alcance antes de confirmar

- **WHEN** se seleccionan 12 ejemplares en la ficha de una localización y se elige `Bandeja B1` como destino
- **THEN** la pantalla dice que se moverán 12 ejemplares de la localización de origen a `Bandeja B1`, y no mueve nada hasta que se confirma

#### Scenario: El destino no puede ser el origen

- **WHEN** se elige el destino del movimiento
- **THEN** la propia localización de origen no es una opción

#### Scenario: Cancelar no mueve nada

- **WHEN** se cancela la confirmación
- **THEN** ningún ejemplar cambia de localización ni genera movimiento

#### Scenario: Movimiento hecho

- **WHEN** se confirma el movimiento
- **THEN** se indica cuántos ejemplares se movieron y la ficha de la localización muestra la carga y los movimientos nuevos

#### Scenario: Error del movimiento

- **WHEN** el API rechaza el movimiento
- **THEN** se muestra el error, no se da por hecho el movimiento y la selección se conserva

#### Scenario: Historial en la ficha del ejemplar

- **WHEN** se abre la ficha de un ejemplar que se ha movido
- **THEN** se muestran sus movimientos con origen, destino y fecha, y la cronología unificada aparece marcada con T-20

#### Scenario: Cambiar la localización al editar un ejemplar

- **WHEN** se guarda la edición de un ejemplar con otra localización
- **THEN** el historial de movimientos de la ficha tiene el movimiento nuevo
