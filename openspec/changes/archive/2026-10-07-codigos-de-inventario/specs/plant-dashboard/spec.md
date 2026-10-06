## ADDED Requirements

### Requirement: Códigos de inventario a la vista

La aplicación SHALL mostrar el **código real** de cada ejemplar y de cada especie, tal y como lo devuelve el API, en las pantallas que el prototipo lo pinta: el inventario, la cabecera de la ficha de la planta, el formulario de edición, el catálogo de especies y la ficha de especie. Ningún código SHALL fabricarse en el cliente ni mostrarse como dato de ejemplo.

En el **alta** de una planta, al elegir la especie la aplicación SHALL enseñar **qué código llevará** la planta —el código de la especie y el número pendiente de asignar, `CAT-GRUSS-··`— y SHALL decir que el número se asigna al guardar, sin inventarlo. En la **edición**, el código del ejemplar SHALL verse de solo lectura.

El formulario de especie SHALL ofrecer el campo **Código**, **obligatorio**: sin él no se guarda y se señala el campo. En el **alta** SHALL **proponerlo a partir del nombre científico** mientras se escribe —el prefijo de la colección y las primeras letras del género— y dejar que el usuario lo cambie; en la **edición** nunca SHALL sugerirlo ni pisarlo. Si la especie ya tiene ejemplares, SHALL estar **deshabilitado y explicar por qué**. Un `409` por código ya usado SHALL explicarse junto al campo.

La ficha de especie SHALL mostrar su **recuento real de ejemplares**, que es el que decide si el código se puede corregir. Lo que el prototipo pinta junto al código y el API todavía no sirve —el recuento por fila del catálogo y la lista de ejemplares de la especie— SHALL seguir marcado con el ticket que lo sustituye (T-21).

#### Scenario: Código real en el inventario

- **WHEN** se abre el inventario
- **THEN** cada fila muestra el código que devuelve el API para esa planta

#### Scenario: Código real en la ficha y en la edición

- **WHEN** se abre la ficha de una planta o su edición
- **THEN** el código mostrado es el del API y en la edición no se puede modificar

#### Scenario: Código que llevará la planta en el alta

- **WHEN** el usuario elige una especie en el formulario de alta
- **THEN** ve el código que llevará la planta con el número pendiente de asignar, y que se asigna al guardar

#### Scenario: Código de la especie en el catálogo y en su ficha

- **WHEN** se abre el catálogo de especies o la ficha de una especie
- **THEN** se muestra el código real de la especie

#### Scenario: Código de la especie obligatorio

- **WHEN** el usuario intenta guardar una especie dejando el código vacío
- **THEN** se señala el campo Código como obligatorio, la sección que lo contiene se muestra y no se envía ninguna petición

#### Scenario: Código propuesto desde el nombre científico

- **WHEN** el usuario escribe el nombre científico en el alta de una especie y no ha tocado el código
- **THEN** el campo Código se rellena con la propuesta, como `CAT-ECHIN`, y dice que está propuesta y que se puede cambiar

#### Scenario: La propuesta sigue al nombre hasta que el usuario escribe el código

- **WHEN** el usuario cambia el nombre científico y no ha tocado el código
- **THEN** la propuesta se actualiza con el nombre nuevo

#### Scenario: Un código escrito a mano no se pisa

- **WHEN** el usuario escribe su propio código y después cambia el nombre científico
- **THEN** el código escrito se conserva y deja de aparecer como propuesto

#### Scenario: En la edición no se propone nada

- **WHEN** el usuario edita una especie y cambia su nombre científico
- **THEN** el código existente no cambia ni se muestra como propuesto

#### Scenario: Código bloqueado por tener ejemplares

- **WHEN** el usuario edita una especie que ya tiene ejemplares
- **THEN** el campo Código aparece deshabilitado con la explicación de que ya identifica plantas

#### Scenario: Código de especie ya usado

- **WHEN** el API rechaza el código de una especie por estar ya usado
- **THEN** se explica junto al campo y lo que el usuario había escrito no se pierde

#### Scenario: Lo que sigue pendiente, declarado

- **WHEN** se abre el catálogo o la ficha de una especie
- **THEN** el recuento por fila del catálogo y la lista de ejemplares de la especie siguen marcados como datos de ejemplo con su ticket, y el recuento de la ficha es el real
