# plant-media Specification

## Purpose
TBD - created by archiving change fotografias. Update Purpose after archive.

## Requirements

### Requirement: Galería fotográfica de un ejemplar

Un ejemplar SHALL admitir fotografías con `POST /plants/{id}/photos` (la subida de la capability `media`) **en cualquier momento**, incluido tras el alta y estando **archivado**, y `GET /plants/{id}/photos`, **paginado** (ADR-009). Cada fotografía SHALL tener **texto alternativo obligatorio** —por defecto con el apodo y el código del ejemplar, corregible—, **fecha de captura** opcional además de la de subida, **propósito** opcional (`general`, `detalle`, `etiqueta_fisica`), orden manual, la marca de **principal** y, opcionalmente, **el evento del que cuelga**. Un ejemplar **sin fotografías** SHALL ser plenamente válido: **crear un ejemplar nunca exige una fotografía** ni la subida puede bloquear su alta. Las fotografías de un ejemplar NO SHALL mezclarse con las de su especie. Un ejemplar inexistente SHALL responder `404` y uno con **50 fotografías**, `409`.

#### Scenario: Un ejemplar sin fotografías

- **WHEN** se crea un ejemplar y se consulta su galería
- **THEN** la galería es una página vacía y el ejemplar es completamente válido

#### Scenario: Añadir fotografías después

- **WHEN** se suben dos fotografías a un ejemplar creado días antes
- **THEN** quedan en su galería, la primera como principal

#### Scenario: Un ejemplar archivado

- **WHEN** se sube una fotografía a un ejemplar `muerta`
- **THEN** se acepta

#### Scenario: Propósito

- **WHEN** se sube una fotografía con `purpose` `etiqueta_fisica`
- **THEN** la entrada lo trae, y un valor desconocido responde `400` con los válidos

#### Scenario: Ordenación por defecto, la evolución

- **WHEN** un ejemplar tiene fotografías capturadas en abril, junio y agosto
- **THEN** `GET /plants/{id}/photos` las devuelve de agosto a abril, y las que no tienen fecha de captura se ordenan por su fecha de subida

#### Scenario: Orden manual a petición

- **WHEN** se pide `?sort=position`
- **THEN** salen en el orden manual

#### Scenario: Filtrar por propósito y por evento

- **WHEN** se pide `?purpose=detalle` o `?event=<id>`
- **THEN** solo vienen las que coinciden

#### Scenario: Ejemplar inexistente

- **WHEN** se sube o se consulta la galería de un ejemplar que no existe
- **THEN** la respuesta es `404`

### Requirement: Corregir, elegir principal, reordenar y borrar en el ejemplar

`PUT /plants/{id}/photos/{mediaId}` SHALL corregir texto alternativo, fecha de captura y propósito, y SHALL permitir `primary: true` para elegir la principal con las mismas reglas que en la especie (**una sola**, índice único parcial, `primary: false` es `400`). `PUT /plants/{id}/photos/order` SHALL reordenar la galería entera y `DELETE` SHALL borrarla de verdad; borrar la principal promueve **la siguiente por orden manual**. Una fotografía de otro ejemplar SHALL responder `404`.

#### Scenario: Elegir la principal

- **WHEN** se marca como principal otra fotografía
- **THEN** es la única principal y el ejemplar la muestra en su cabecera

#### Scenario: Corregir la fecha de captura

- **WHEN** se corrige la fecha de captura de una fotografía
- **THEN** la galería la recoloca en su sitio de la evolución

#### Scenario: Borrar la principal

- **WHEN** se borra la principal de tres fotografías
- **THEN** la siguiente por orden manual pasa a ser la principal

#### Scenario: Fotografía de otro ejemplar

- **WHEN** se corrige o se borra por la URL de un ejemplar una fotografía de otro
- **THEN** la respuesta es `404` y no cambia

### Requirement: Una fotografía puede colgar de un evento de la cronología

Una subida a un ejemplar SHALL admitir un `eventId`: **cualquier evento de la espina de su cronología** —comentario, intervención, floración o tarea completada— **que pertenezca a ese mismo ejemplar**. Un evento inexistente o de **otro ejemplar** SHALL responder `400` (es una referencia del cuerpo, no el recurso de la URL). Las lecturas, los cambios de estado y los movimientos NO SHALL admitir fotografía. **Borrar el evento NO SHALL borrar sus fotografías**: pasan a la galería sin evento. La foto de un evento SHALL poder colgar o descolgarse corrigiéndola (`eventId` o `null`).

#### Scenario: Una foto con su comentario

- **WHEN** se anota un comentario y se sube una fotografía con su `eventId`
- **THEN** la fotografía queda enlazada al comentario y `GET /plants/{id}/photos?event=…` la devuelve

#### Scenario: Evento de otro ejemplar

- **WHEN** se sube una fotografía con el `eventId` de un evento de otro ejemplar
- **THEN** la respuesta es `400` y no se guarda nada

#### Scenario: Evento inexistente

- **WHEN** se sube una fotografía con un `eventId` que no existe
- **THEN** la respuesta es `400`

#### Scenario: Retirar el comentario no retira su foto

- **WHEN** se borra un comentario con una fotografía
- **THEN** la fotografía sigue en la galería, sin evento, y su archivo existe

#### Scenario: Colgar una foto existente de un evento

- **WHEN** se corrige una fotografía de la galería con el `eventId` de un comentario del mismo ejemplar
- **THEN** pasa a colgar de él

#### Scenario: Descolgarla

- **WHEN** se corrige con `eventId` nulo
- **THEN** sigue en la galería y deja de aparecer en la entrada del evento
