# Proposal: fotografias

**Ticket:** [T-19](../../../docs/tickets/T-19-fotografias.md) — completo.
**Historias:** [1.7](../../../docs/user-stories/1.7-fotografias-de-una-especie.md) y [1.8](../../../docs/user-stories/1.8-galeria-fotografica-de-un-ejemplar.md)
**Decisión previa:** [ADR-018](../../../docs/adr/ADR-018-almacenamiento-de-fotografias.md) (almacenamiento, formatos, EXIF, miniaturas, borrado)
**Pantallas del prototipo** (`docs/wireframes/cactify-admin/index.html`): `plant-detail` (foto de la cabecera, pestaña «Fotografías» y la tarjeta «Fotografía y comentario» de la cronología), `plant-editor` (fieldset «Fotografías iniciales»), `species-detail` (galería de la cabecera y pestaña «Fotografías») y `species-editor` (fieldset «Fotografías» con «Principal»); y las miniaturas de `species`
**Producto:** §8 y §24.12 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md)

## Why

Un coleccionista reconoce sus plantas **por su cara**. Hoy la ficha del ejemplar enseña un hueco con «8 fotos · ejemplo», la de la especie un «Imagen principal · T-19» desactivado, y los formularios dicen «el almacenamiento llega en T-19». Es la única parte del producto de §8 que no existe ni en maqueta funcional, y la que más se echa de menos en el día a día: ver cómo ha evolucionado un ejemplar, comparar con el aspecto habitual de su especie y dejar una foto junto a la anotación «nueva espinación en el ápice».

Es también la **primera vez que el sistema guarda binarios**. ADR-018 fija las reglas —disco local detrás de un puerto, JPEG/PNG/WebP, re-codificación sin EXIF, miniaturas, borrado real—; este change las construye una sola vez y sirve a las dos galerías.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change (ADR-018):

* **Disco local en un volumen**, detrás de un puerto `MediaStorage`.
* **JPEG, PNG y WebP, 10 MB por archivo y 10 por subida**; tipo decidido por el contenido.
* **Re-codificar quitando el EXIF** (leyendo antes la fecha de captura) y **generar miniaturas** al subir.
* **Borrado real**.

## What Changes

**Esquema** — migración `V18` (V17 es de `trabajo-por-lote`): `media_asset` —lo que es el archivo: clave de almacenamiento, tipo, dimensiones, tamaño, texto alternativo, fecha de captura— y dos satélites con clave compartida y borrado en cascada: `species_media` (especie, orden, principal, autoría) y `plant_media` (planta, **evento opcional**, propósito, orden, principal). Un índice único parcial por dueño defiende «una sola principal».

**Backend**

* **Subida**: `POST /species/{id}/photos` y `POST /plants/{id}/photos`, `multipart/form-data` con hasta 10 archivos (`files`) y campos opcionales que valen para toda la subida (`altText`, `capturedAt`, `credit`, `purpose`, `eventId`). Se valida **todo antes de escribir nada**; una subida inválida no deja nada a medias. La primera foto de un dueño es la principal.
* **Procesado**: decodificar, orientar, **descartar el EXIF**, re-codificar y generar tres variantes —`thumb`, `medium` y `full`—; la fecha de captura sale del EXIF y se puede corregir. Dimensiones y píxeles acotados contra imágenes que desborden la memoria.
* **Servir**: `GET /media/{id}/{variant}`, con `Cache-Control` largo e `immutable`, tipo fijado por el servidor y `nosniff`.
* **Galería**: `GET /species/{id}/photos` y `GET /plants/{id}/photos`, paginados; la del ejemplar, por **fecha de captura descendente** (la evolución) y, a petición, por **orden manual**; filtros `event` y `purpose`. `PUT …/{mediaId}` corrige texto alternativo, autoría o propósito, fecha de captura y la **marca de principal**; `PUT …/order` reordena; `DELETE …/{mediaId}` borra de verdad.
* **Fotos de un evento**: una foto puede colgar de **cualquier evento de la cronología del ejemplar** (comentario, intervención, floración, tarea completada). `GET /plants/{id}/timeline` trae las fotos de cada evento de la página con **una consulta** más. Borrar el evento **no borra la foto**: pasa a la galería sin evento.
* **Resúmenes**: las filas de `GET /species` y `GET /plants` y sus detalles traen `primaryPhoto` y `photoCount`, con **una consulta agregada** por página.
* **Mantenimiento**: un barrido programado y apagable que retira los archivos huérfanos de más de un día; la subida y el borrado son seguros ante fallos a medias.

**Frontend**

* **Ficha de la especie**: cabecera con la portada y su recuento, pestaña «Fotografías» con galería, subida, reordenación, portada, texto alternativo y autoría; el editor de la especie sube sus fotos al guardar.
* **Ficha del ejemplar**: la foto de la cabecera y su recuento son reales; la pestaña «Fotografías» es la galería con la evolución; el alta ofrece «Fotografías iniciales» **sin bloquear nunca el guardado**; la cronología pinta las fotos de cada evento y los diálogos de comentario, intervención y floración permiten adjuntar.
* **Listado de especies**: la miniatura de cada fila.
* **El kit**: `UiMediaGallery` gana un **modo de gestión** (acciones por imagen, portada y orden) y nace `UiCoverPhoto` (portada con recuento), que aparecen en dos pantallas.

## Capabilities

### New Capabilities

- `media`: el almacén, el procesado, los límites, el servido y el mantenimiento de los binarios.
- `species-media`: la galería de referencia de la especie.
- `plant-media`: la galería del ejemplar, su evolución y las fotos colgadas de un evento.

### Modified Capabilities

- `plant-timeline`: las fotos de cada evento en la cronología.
- `species-catalog`: portada y recuento en el catálogo; retirar una especie retira sus fotos.
- `plant-inventory`: portada y recuento en el inventario y la ficha.
- `plant-dashboard`: las pantallas con fotos reales.
- `design-system`: galería gestionable y portada.

## Non-goals

* **Fotografiar con la cámara desde la aplicación** (captura en directo): el selector de archivos de un móvil ya ofrece la cámara; una captura propia es F.5.
* **Detección de estrés o identificación de especie por fotografía** (F.6 y F.7).
* **Recortar, rotar o editar** la imagen en la aplicación.
* **Fotografías de una localización, de una etiqueta o de una lectura**: la lectura y los cambios de estado y de localización no son eventos de la espina (decisión de `cronologia-del-ejemplar`) y no admiten foto.
* **Fotos en la exportación a CSV con enlaces**: la casilla «Incluir enlaces a las fotografías» sigue marcada hasta T-29.
* **Vista de fotografías del listado de especies** (el conmutador ▦ del prototipo): sigue marcada; este change aporta la miniatura de cada fila, no una vista de tarjetas.
* **Miniatura en el listado del inventario de ejemplares**: el prototipo no la dibuja; el dato se sirve y se aprovecha cuando la composición lo pida.
* **Servicio de objetos, HEIC, borrado lógico y copias de seguridad del volumen**: ADR-018 los deja fuera; la copia del volumen es de despliegue.
* **Autenticación de las imágenes**: no hay usuarios (F.14); las imágenes siguen el control de acceso del resto del API.

## Impact

* `backend/src/main/resources/db/migration/V18__media.sql`; `domain/` (`MediaAsset`, `SpeciesMedia`, `PlantMedia`, `MediaPurpose`), `application/` (puerto `MediaStorage`, procesador de imagen, servicios de fotografías, limpieza, DTOs), `infrastructure/` (adaptador de disco, repositorios, barrido programado), controllers (multipart y servido), configuración `cactify.media.*` y límites multipart, dependencias de lectura de imágenes y metadatos. Tests con Testcontainers y un directorio temporal.
* `iac/local/` — el volumen de medios en el Compose y la variable de la ruta.
* `frontend/` — `src/features/media/` (service, composables, mappers, componentes), `app/pages/species/[id]`, `app/pages/plants/[id]`, formularios de especie y de planta, diálogos de eventos, listado de especies, `UiMediaGallery`, `UiCoverPhoto` y la galería del kit; se borran los marcadores T-19, `MOCK_PHOTO_COUNT` y la rama «Las fotografías llegan en T-19».
* `docs/diagramas/modelo-datos-actual.md` y el borrador de gestión, `README.md`, T-19, historias 1.7 y 1.8, §24.12 y `CLAUDE.md`.
