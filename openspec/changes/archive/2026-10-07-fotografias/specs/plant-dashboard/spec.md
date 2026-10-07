## MODIFIED Requirements

### Requirement: Perfil real del ejemplar en las pantallas

La aplicación SHALL mostrar y permitir editar el **perfil real** del ejemplar —descripción, estado, germinación, adquisición y procedencia— con lo que devuelve el API, sin constantes de ejemplo.

El **formulario** de alta y edición SHALL habilitar la descripción, el año y el mes de germinación, la fecha de adquisición, la procedencia con su nota y, **solo en el alta**, el estado inicial (de entre los en curso). El mes SHALL poder quedar sin especificar y SHALL estar deshabilitado mientras no haya año. Un error del API SHALL explicarse sin perder lo escrito.

La **cabecera de la ficha** SHALL mostrar el **estado real** con su texto, y la germinación real: «Germinada 04/2021» si hay mes, y «Germinada en 2021 · ~5 años» si solo hay año, sin inventar un mes. Un ejemplar **archivado** (en un estado final) SHALL distinguirse por algo más que el color.

La ficha SHALL ofrecer **cambiar el estado**, con un motivo opcional y **obligatorio al volver a `activa` desde un estado final**, y SHALL mostrar el **historial de cambios** con su fecha, del más reciente al más antiguo, en la pestaña de datos. Solo SHALL ofrecer las transiciones que el dominio admite. El inventario y la ficha de localización SHALL mostrar el estado de cada ejemplar, y el inventario SHALL **filtrar por estado**: por defecto solo lo que está en curso, con la opción de incluir los archivados.

Lo que sigue sin tener datos SHALL seguir marcado con su ticket en su sitio. **Las fotografías ya no están entre ello**: son reales, con su propio requisito.

#### Scenario: Estado real en la cabecera

- **WHEN** se abre la ficha de un ejemplar `cuarentena`
- **THEN** la cabecera muestra «Cuarentena» y no un estado de ejemplo

#### Scenario: Germinación con mes

- **WHEN** se abre la ficha de un ejemplar germinado en abril de 2021
- **THEN** la cabecera dice «Germinada 04/2021»

#### Scenario: Germinación solo con año

- **WHEN** se abre la ficha de un ejemplar con año de germinación y sin mes
- **THEN** la cabecera dice que germinó ese año con una edad aproximada, sin ningún mes

#### Scenario: Sin datos de germinación

- **WHEN** se abre la ficha de un ejemplar sin germinación
- **THEN** la cabecera no muestra ninguna germinación inventada

#### Scenario: Ejemplar archivado

- **WHEN** se abre la ficha de un ejemplar `vendida`
- **THEN** su estado se distingue con texto y forma, no solo con el color

#### Scenario: Alta con la ficha completa

- **WHEN** el usuario rellena descripción, germinación, procedencia y estado inicial y guarda
- **THEN** la planta se crea con esos datos y la ficha los muestra

#### Scenario: El mes depende del año

- **WHEN** el usuario no ha indicado el año de germinación
- **THEN** el mes está deshabilitado

#### Scenario: Estado inicial solo en el alta

- **WHEN** el usuario edita un ejemplar existente
- **THEN** el formulario no ofrece cambiar el estado, que tiene su propia acción

#### Scenario: Cambiar el estado

- **WHEN** el usuario cambia un ejemplar activo a cuarentena desde la ficha
- **THEN** la cabecera muestra el estado nuevo y el historial gana el cambio con su fecha

#### Scenario: Solo las transiciones válidas

- **WHEN** el usuario abre el cambio de estado de un ejemplar `muerta`
- **THEN** solo se ofrece volver a `activa`, y se exige el motivo

#### Scenario: Cambio rechazado por el API

- **WHEN** el API rechaza el cambio de estado
- **THEN** se explica el motivo, el estado mostrado no cambia y lo escrito no se pierde

#### Scenario: Historial de cambios

- **WHEN** se abre la pestaña de datos de un ejemplar con cambios de estado
- **THEN** se listan del más reciente al más antiguo, con su fecha, sus estados y su motivo

#### Scenario: Inventario sin archivados por defecto

- **WHEN** se abre el inventario
- **THEN** solo aparecen los ejemplares en curso, y hay una forma visible de incluir los archivados

#### Scenario: Filtrar por estado

- **WHEN** el usuario filtra el inventario por un estado
- **THEN** solo aparecen los ejemplares en ese estado y el filtro figura entre los aplicados

#### Scenario: Estado en el inventario y en la localización

- **WHEN** se abre el inventario o la ficha de una localización
- **THEN** cada ejemplar muestra su estado real

## ADDED Requirements

### Requirement: Fotografías de la especie en su ficha

La ficha de una especie SHALL mostrar su **portada real y su recuento** en la cabecera —la composición de la galería de `species-detail` del prototipo— y una pestaña **«Fotografías»** con la **galería de referencia**, que ofrece **subir** (por selector o arrastrando), **elegir la portada**, **reordenar**, **editar el texto alternativo y la autoría** y **borrar con confirmación**, sobre `UiMediaGallery` en modo de gestión. Una especie sin fotografías SHALL decirlo, con la subida a la vista. La ampliación de una imagen SHALL mostrar su texto alternativo y su autoría si la tiene. Antes de subir, la interfaz SHALL **comprobar tipo, tamaño y número** y explicar cuáles se rechazan, **sin enviarlos**; el servidor sigue siendo quien decide. Durante la subida cada imagen SHALL mostrar su progreso o su error, y un fallo SHALL explicarse sin perder las demás. No SHALL quedar el marcador «T-19» ni el botón deshabilitado.

#### Scenario: Portada real en la cabecera

- **WHEN** se abre la ficha de una especie con fotografías
- **THEN** la cabecera muestra la principal con su recuento, que abre la pestaña de fotografías

#### Scenario: Especie sin fotografías

- **WHEN** se abre la ficha de una especie sin fotografías
- **THEN** la cabecera y la pestaña dicen que no hay ninguna y ofrecen subir

#### Scenario: Subir varias

- **WHEN** el usuario elige tres imágenes válidas
- **THEN** cada una aparece con su progreso y, al terminar, en la galería, la primera como principal si la galería estaba vacía

#### Scenario: Rechazo antes de enviar

- **WHEN** el usuario elige un GIF y un archivo de 12 MB
- **THEN** se explica cuál se rechaza y por qué, y no se envía ninguno de los dos

#### Scenario: Más de diez

- **WHEN** el usuario elige doce imágenes
- **THEN** se avisa del máximo de diez por subida y no se envía ninguna hasta que lo corrija

#### Scenario: Una falla y las demás suben

- **WHEN** el servidor rechaza una subida
- **THEN** se explica el motivo, no se pierde la selección y la galería no cambia

#### Scenario: Elegir la portada

- **WHEN** el usuario marca como principal otra fotografía
- **THEN** la cabecera muestra la nueva portada

#### Scenario: Editar el texto alternativo

- **WHEN** el usuario corrige el texto alternativo y la autoría de una imagen
- **THEN** la galería y la ampliación los muestran, y un texto en blanco se rechaza

#### Scenario: Borrar con confirmación

- **WHEN** el usuario borra una fotografía y confirma
- **THEN** desaparece de la galería y, si era la portada, la cabecera muestra la siguiente

#### Scenario: Reordenar

- **WHEN** el usuario reordena la galería
- **THEN** el orden se conserva al recargar

### Requirement: Fotografías al crear y editar una especie

El formulario de la especie SHALL ofrecer, en su sección «Fotografías», la **subida real** con la misma comprobación previa. Al **editar** una especie existente SHALL subir y gestionar sobre la marcha; al **crearla**, donde todavía no hay identificador, SHALL **conservar los archivos elegidos y subirlos tras guardar la especie**, y SHALL decir qué pasa. **La subida nunca bloquea el guardado**: si falla tras crear la especie, la especie existe, se avisa de qué fotografías no se subieron y se lleva a su ficha para reintentarlo.

#### Scenario: Elegir fotografías al crear

- **WHEN** el usuario crea una especie y elige dos imágenes
- **THEN** al guardar se crea la especie, se suben las dos y la ficha las muestra

#### Scenario: La subida falla tras crear

- **WHEN** la especie se crea y la subida falla
- **THEN** la especie existe, se avisa de las fotografías pendientes y se ofrece reintentarlas desde su ficha

#### Scenario: Editar una especie

- **WHEN** el usuario edita una especie con fotografías
- **THEN** ve su galería, sube más y elige la portada sin salir del formulario

### Requirement: Fotografías iniciales en el alta del ejemplar

El formulario de alta de un ejemplar SHALL ofrecer **«Fotografías iniciales»** con la composición del prototipo: la zona de arrastrar o seleccionar con los límites visibles y las **tres sugerencias** —una foto general, un detalle reconocible y la etiqueta física si existe— que fijan el **propósito**. Son **opcionales**: **el alta NO SHALL bloquearse nunca por una fotografía**, ni por una que falte ni por una que falle. Las imágenes se suben **después de crear el ejemplar**; si alguna falla, el ejemplar ya existe, se avisa de cuáles no se subieron y se lleva a su ficha para reintentarlo. La primera sube como principal. El texto de la sección SHALL decir que la principal será la portada de su ficha.

#### Scenario: Alta sin fotografías

- **WHEN** el usuario guarda un ejemplar sin elegir ninguna
- **THEN** se crea sin más y su ficha lo dice

#### Scenario: Alta con fotografías

- **WHEN** el usuario elige una foto general y un detalle y guarda
- **THEN** se crea el ejemplar, se suben las dos con su propósito y la ficha muestra la primera como portada

#### Scenario: Fallo en la subida

- **WHEN** el ejemplar se crea y una de las fotografías falla
- **THEN** el ejemplar existe, se avisa de qué fotografía no se subió y se ofrece reintentarla desde su ficha

#### Scenario: Guardar y añadir otra

- **WHEN** el usuario guarda con fotografías y elige «Guardar y añadir otra»
- **THEN** el formulario vuelve vacío una vez subidas, sin arrastrar las fotografías anteriores

### Requirement: Fotografías del ejemplar en su ficha

La ficha del ejemplar SHALL mostrar su **portada real y su recuento** en la cabecera, con `UiCoverPhoto`, y la pestaña **«Fotografías»** con su recuento real: la **galería de evolución**, ordenada por fecha de captura descendente y con la fecha visible en cada imagen, que ofrece **subir**, **elegir la principal**, **corregir** texto alternativo, fecha de captura y propósito, **ordenar manualmente** (con un conmutador entre «Por fecha» y «Manual») y **borrar con confirmación**, y **ampliar** cada imagen mostrando su texto, su fecha de captura y de subida y, si cuelga de un evento, **un enlace a él**. La cabecera SHALL mostrar «Sin fotografía» cuando no haya, sin cifras de ejemplo. No SHALL quedar `MOCK_PHOTO_COUNT` ni el estado vacío «Las fotografías llegan en T-19». Las fotografías de la **especie** NO SHALL aparecer en esta galería.

#### Scenario: Portada y recuento reales

- **WHEN** se abre la ficha de un ejemplar con ocho fotografías
- **THEN** la cabecera muestra la principal con «8 fotos» y la pestaña muestra el mismo recuento

#### Scenario: Sin fotografías

- **WHEN** se abre la ficha de un ejemplar sin fotografías
- **THEN** la cabecera dice «Sin fotografía», la pestaña lo explica con la subida a la vista y no hay cifras de ejemplo

#### Scenario: La evolución

- **WHEN** el ejemplar tiene fotografías de abril, junio y agosto
- **THEN** la galería las muestra de agosto a abril, con su fecha, y «Manual» las ordena a mano

#### Scenario: Ampliar con el contexto

- **WHEN** el usuario amplía una fotografía colgada de un comentario
- **THEN** ve su texto alternativo, sus fechas y un enlace al comentario en la cronología

#### Scenario: Corregir la fecha

- **WHEN** el usuario corrige la fecha de captura de una imagen
- **THEN** la galería la recoloca

#### Scenario: Subir desde la ficha

- **WHEN** el usuario sube una imagen desde la pestaña
- **THEN** aparece en la galería y actualiza el recuento de la cabecera sin recargar

#### Scenario: Las de la especie no se mezclan

- **WHEN** la especie tiene fotografías y el ejemplar ninguna
- **THEN** la ficha del ejemplar dice que no tiene ninguna

### Requirement: Las fotografías de un evento en la cronología y en sus diálogos

La cronología SHALL pintar las **fotografías de cada evento** dentro de su tarjeta —la tarjeta «Fotografía y comentario» del prototipo—, con miniaturas que **se amplían** y texto alternativo. Los diálogos de **comentario, intervención y floración** SHALL ofrecer **adjuntar fotografías** opcionales con la comprobación previa: al guardar se crea el evento y **después** se suben con su `eventId`, y un fallo de la subida NO SHALL deshacer el evento ni bloquear el guardado, y se avisa de qué no se subió. La tarjeta de un evento existente SHALL ofrecer **añadir fotografía** y **quitar** la suya. Una tarjeta sin fotografías SHALL no reservar hueco.

#### Scenario: Comentario con fotografía

- **WHEN** el usuario anota un comentario y adjunta una imagen
- **THEN** la tarjeta del comentario aparece con la miniatura sin recargar

#### Scenario: La subida falla

- **WHEN** el comentario se guarda y la fotografía falla
- **THEN** el comentario existe, se avisa de la fotografía que no se subió y se ofrece reintentarla desde su tarjeta

#### Scenario: Añadir a un evento existente

- **WHEN** el usuario añade una fotografía a una intervención ya registrada
- **THEN** la tarjeta la muestra sin recargar

#### Scenario: Ampliar desde la cronología

- **WHEN** el usuario activa la miniatura de un evento
- **THEN** se amplía con su texto alternativo

### Requirement: Miniaturas de las especies en el listado

El listado de especies SHALL mostrar, en la celda identificativa de cada fila, la **miniatura de su portada** —como la `species-thumb` del prototipo— y un marcador neutro con texto alternativo cuando no la tenga. El conmutador «Vista de fotografías» SHALL seguir **marcado y deshabilitado**: este change aporta la miniatura, no una vista de tarjetas. Las miniaturas SHALL pedirse con la variante `thumb`, nunca con el original.

#### Scenario: Fila con portada

- **WHEN** una especie tiene portada
- **THEN** su fila muestra la miniatura y no el original

#### Scenario: Fila sin portada

- **WHEN** una especie no tiene fotografías
- **THEN** su fila muestra un marcador con texto alternativo, no un hueco en blanco

#### Scenario: La vista de fotografías sigue marcada

- **WHEN** se abre el listado de especies
- **THEN** el conmutador de vista de fotografías aparece deshabilitado y marcado
