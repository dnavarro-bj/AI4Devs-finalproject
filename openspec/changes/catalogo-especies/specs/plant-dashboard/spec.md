## ADDED Requirements

### Requirement: Catálogo de especies

La aplicación SHALL mostrar el catálogo de especies registradas con su nombre científico y su nombre común, obtenidos del API y paginados. El listado SHALL poder ordenarse y SHALL ofrecer navegación a la ficha de cada especie y al alta de una nueva. Cuando el catálogo esté vacío, la pantalla SHALL explicarlo y ofrecer una única acción: registrar la primera especie.

Los datos que el API todavía no sirve SHALL presentarse como **datos de ejemplo reconocibles**, nunca como si fueran reales.

#### Scenario: Catálogo con especies

- **WHEN** el usuario abre el catálogo y el API devuelve especies registradas
- **THEN** se muestra una fila por especie con su nombre científico y su nombre común

#### Scenario: Catálogo vacío

- **WHEN** el usuario abre el catálogo y no hay ninguna especie registrada
- **THEN** se explica que no hay ninguna y se ofrece registrar la primera, sin una tabla en blanco

#### Scenario: Navegación a la ficha

- **WHEN** el usuario selecciona una especie del catálogo
- **THEN** la aplicación navega a su ficha sin recargar la página

#### Scenario: Ordenar el catálogo

- **WHEN** el usuario ordena por una columna
- **THEN** el catálogo se vuelve a pedir al API con ese criterio, y no se reordena solo la página visible

### Requirement: Ficha de una especie

La aplicación SHALL mostrar la ficha de una especie con su nombre científico, su nombre común y **la pauta de cultivo que heredan sus ejemplares**: rangos de humedad, temperatura y horas de luz, y su pauta de riego. La ficha SHALL ser el punto desde el que se corrige o se retira la especie.

Las secciones cuyos datos el API todavía no sirve SHALL explicarlo, sin simular contenido.

#### Scenario: Ficha de una especie existente

- **WHEN** el usuario abre la ficha de una especie existente
- **THEN** se muestran su nombre científico, su nombre común y los rangos que heredan sus ejemplares

#### Scenario: Ficha de una especie inexistente

- **WHEN** el usuario abre la ficha de un identificador que el API no reconoce
- **THEN** se muestra que la especie no existe, con salida hacia el catálogo, y no una pantalla en blanco

#### Scenario: Lo que todavía no existe se reconoce como ejemplo

- **WHEN** la ficha presenta datos que el API no sirve todavía
- **THEN** quedan identificados como datos de ejemplo, y no se confunden con los reales

### Requirement: Alta y edición de una especie

La aplicación SHALL usar **el mismo formulario** para registrar y para corregir una especie, dividido en secciones con navegación, y en edición SHALL llegar prellenado. SHALL exigir nombre científico, nombre común y los rangos de cultivo, y SHALL validar que **cada mínimo no supere a su máximo** antes de enviar.

Cuando el API rechace el nombre científico por estar ya registrado, la aplicación SHALL señalarlo **en ese campo**, no como un error general de la pantalla.

#### Scenario: Alta de una especie

- **WHEN** el usuario rellena el formulario y confirma
- **THEN** la especie se registra y la aplicación lleva a su ficha

#### Scenario: Edición prellenada

- **WHEN** el usuario abre la corrección de una especie existente
- **THEN** el formulario muestra sus valores actuales

#### Scenario: Rango invertido

- **WHEN** el usuario introduce un mínimo mayor que su máximo
- **THEN** la interfaz lo señala en ese rango y no envía la petición

#### Scenario: Nombre científico ya registrado

- **WHEN** el API rechaza el alta porque el nombre científico ya existe
- **THEN** el mensaje se muestra junto a ese campo y lo introducido se conserva

### Requirement: Retirada de una especie

La aplicación SHALL permitir retirar una especie del catálogo, **pidiendo confirmación** antes de hacerlo por ser una acción irreversible. Cuando el API la rechace por tener ejemplares asociados, la aplicación SHALL explicar esa causa concreta y NO SHALL presentarla como un fallo inesperado.

#### Scenario: Retirada confirmada

- **WHEN** el usuario confirma la retirada de una especie sin ejemplares
- **THEN** la especie se retira y la aplicación vuelve al catálogo

#### Scenario: Retirada cancelada

- **WHEN** el usuario cierra la confirmación sin aceptar
- **THEN** no se retira nada y la ficha queda como estaba

#### Scenario: Especie con ejemplares

- **WHEN** el usuario intenta retirar una especie que tiene ejemplares asociados
- **THEN** se le explica que no puede retirarse mientras los tenga, y la especie permanece
