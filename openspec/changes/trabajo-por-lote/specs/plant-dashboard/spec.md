## ADDED Requirements

### Requirement: Acciones por lote en la selección del inventario

La barra de selección de `/plants` SHALL ofrecer, además de «Crear tarea», **«Registrar lectura»**, **«Registrar intervención»** y **«Añadir comentario»** sobre lo seleccionado, cada una con el número de plantas. «Mover» y «Etiquetar» SHALL seguir marcados como no disponibles, con el motivo. Cuando la página entera esté marcada y haya más resultados que filas, SHALL aparecer un aviso —«Seleccionadas las N de esta página»— que ofrezca **«Seleccionar los M resultados»**; elegirlo SHALL cambiar el alcance a **la consulta del inventario** —los filtros de la URL, sin la página— y SHALL permitir volver a la selección de la página. Cambiar un filtro SHALL vaciar la selección.

#### Scenario: Acciones sobre la selección

- **WHEN** se seleccionan 3 plantas
- **THEN** la barra ofrece registrar lectura, intervención y comentario sobre 3 plantas, además de crear tarea

#### Scenario: Seleccionar todo el resultado

- **WHEN** se marca la página de 25 y hay 486 resultados
- **THEN** aparece «Seleccionadas las 25 de esta página» con «Seleccionar los 486 resultados»

#### Scenario: El alcance pasa a ser la consulta

- **WHEN** se elige «Seleccionar los 486 resultados» y se abre una acción
- **THEN** el diálogo declara 486 plantas y el alcance enviado es la consulta del inventario, no 486 identificadores

#### Scenario: Volver a la página

- **WHEN** se elige volver a la selección de la página
- **THEN** el alcance son las plantas marcadas

#### Scenario: Cambiar un filtro

- **WHEN** hay una selección y se cambia un filtro
- **THEN** la selección se vacía y el aviso desaparece

#### Scenario: Mover y etiquetar siguen marcados

- **WHEN** se mira la barra con una selección
- **THEN** «Mover» y «Etiquetar» aparecen deshabilitados y marcados

### Requirement: Diálogo de lote con el alcance declarado

Registrar por lote SHALL abrir un diálogo que **diga el alcance antes de guardar**: «Se registrará en **N plantas**», con el número que devuelve `POST /batches/preview` para ese alcance, **no uno calculado en el cliente**. Con una lista de plantas SHALL mostrar las plantas, paginadas si son muchas, y permitir **excluir** excepciones; el número SHALL actualizarse al excluir. SHALL pedir los datos de la acción con **los mismos campos que su alta individual** —una lectura con sus medidas, una intervención con su tipo y los datos de ese tipo, un comentario con su texto— y la fecha. Confirmar SHALL estar deshabilitado con un alcance vacío, diciendo por qué. Al terminar SHALL avisar de **a cuántas plantas se aplicó** y, si hay un listado detrás, recargarlo. Un error del API —incluido el `422` de un alcance demasiado grande— SHALL mostrarse en el diálogo sin perder lo escrito ni las exclusiones.

#### Scenario: El número antes de guardar

- **WHEN** se abre «Registrar lectura» con 31 plantas
- **THEN** el diálogo dice «Se registrará en 31 plantas» con el número del servidor

#### Scenario: Excluir una excepción

- **WHEN** se excluye una planta de las 31
- **THEN** el diálogo dice 30 y solo se envía esa exclusión

#### Scenario: Una lectura de agua

- **WHEN** se escribe 200 ml y se confirma
- **THEN** se envía la lectura con el alcance y se avisa «Registrado en 31 plantas»

#### Scenario: Una intervención con sus campos

- **WHEN** se elige «Trasplante»
- **THEN** el diálogo pide la maceta y no los datos de otros tipos

#### Scenario: Alcance vacío

- **WHEN** se excluyen todas las plantas
- **THEN** confirmar está deshabilitado y el diálogo explica que no afectaría a ninguna

#### Scenario: Alcance demasiado grande

- **WHEN** el API responde `422` porque el alcance supera el máximo
- **THEN** el diálogo muestra su mensaje y no se escribe nada

#### Scenario: Error sin perder lo escrito

- **WHEN** el API rechaza la acción
- **THEN** el diálogo lo explica y conserva lo escrito y las exclusiones

### Requirement: Registrar en toda una localización

La ficha de una localización SHALL ofrecer **«Registrar en toda la localización»**, con las tres acciones, cuyo alcance sea esa localización y, a elección declarada en el diálogo, **sus sublocalizaciones**. El diálogo SHALL decir el número de plantas con y sin descendientes. Sin plantas, SHALL no ofrecerse.

#### Scenario: Una bandeja

- **WHEN** se elige registrar una lectura en toda «Bandeja A3» con 24 plantas
- **THEN** el diálogo dice 24 plantas y el alcance enviado es esa localización

#### Scenario: Con sublocalizaciones

- **WHEN** se activa «incluir sublocalizaciones» en un invernadero con 486 plantas entre todas
- **THEN** el diálogo actualiza el número a 486

#### Scenario: Una localización vacía

- **WHEN** la localización no tiene plantas
- **THEN** no se ofrece registrar en ella

### Requirement: La cronología dice cuándo un registro vino de un lote

La cronología de la ficha SHALL indicar en los registros que vienen de un lote —lecturas, intervenciones y comentarios— que lo son: «En un lote de N plantas», con el tamaño que da la entrada. Un registro individual SHALL NOT llevar esa indicación.

#### Scenario: Una lectura de lote

- **WHEN** una planta tiene una lectura registrada en un lote de 31
- **THEN** su entrada dice «En un lote de 31 plantas»

#### Scenario: Un comentario individual

- **WHEN** una planta tiene un comentario propio
- **THEN** su entrada no menciona ningún lote
