# Tasks: fotografias

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisito previo:** ADR-018 aceptado; la migración es `V18` (V17 es de `trabajo-por-lote`). Los tests de almacenamiento usan un directorio temporal, nunca el volumen real.

## 1. Esquema y dominio (backend)

- [x] 1.1 Tests de esquema (`MediaSchemaTest`): asset con alt no en blanco, dimensiones y tamaño positivos, satélites con clave compartida y cascada, un dueño por satélite, **una sola principal** por especie y por ejemplar (índice único parcial), posición no negativa, propósito válido, `event_id` con `SET NULL` al borrar el evento, FK a especie, planta y evento, datos previos intactos
- [x] 1.2 Migración `V18__media.sql`: `media_asset`, `species_media`, `plant_media`, índices (`species_id`/`plant_id` + orden, `event_id`) y los dos únicos parciales de la principal
- [x] 1.3 Tests del enum `MediaPurpose` (`value` explícito, `invoke()`, desconocido) y del convertidor (ADR-007)
- [x] 1.4 Enum y convertidor
- [x] 1.5 Tests de dominio de `MediaAsset` (alt en blanco, recorte, dimensiones, fecha de captura no futura contra el `Clock`) y de la galería (`MediaGallery`): la primera nace principal, elegir otra desmarca la anterior, `primary: false` rechazado, borrar la principal promueve la siguiente por orden, borrar la última deja la galería vacía, reordenar exige el conjunto exacto, límite de 50
- [x] 1.6 `MediaAsset`, `SpeciesMedia`, `PlantMedia`, sus identificadores (ADR-008) y la lógica de galería en el dominio, con validación antes de asignar (ADR-011)

## 2. Almacén y procesado (backend)

- [x] 2.1 Tests del adaptador de disco (`DiskMediaStorageTest`, directorio temporal): guardar y abrir, escritura atómica sin temporales residuales, clave con `../` rechazada, borrar existente e inexistente, el nombre del usuario no entra nunca
- [x] 2.2 Puerto `MediaStorage` en `application` y su adaptador en `infrastructure`; `cactify.media.root` y `docker-compose` con el volumen
- [x] 2.3 Tests de `ImageProcessor` con imágenes generadas en el test: JPEG, PNG, PNG con alfa, WebP; tres variantes con su tope y sin ampliar; orientación aplicada; **sin EXIF ni GPS en ninguna variante**; fecha de captura leída; imagen sin EXIF; archivo corrupto y de texto con extensión de imagen rechazados por contenido; GIF rechazado; imagen que supera los píxeles máximos rechazada **antes** de decodificar
- [x] 2.4 `ImageProcessor` con sus dependencias de lectura y de metadatos y los límites en `MediaProperties`; configuración incoherente impide arrancar (test)
- [x] 2.5 Tests de `MediaService` (subida y borrado, con un doble del almacén que falla a voluntad): todo-o-nada ante un archivo inválido sin filas ni archivos, fallo de la fila retira los archivos escritos, borrado confirma antes de retirar (si la transacción se deshace, no se retira nada), fallo al retirar un archivo no deshace el borrado, `capturedAt` explícito manda sobre el EXIF
- [x] 2.6 `MediaService` (validar, procesar, escribir, guardar; `afterCommit` para retirar)

## 3. API de fotografías (backend)

- [x] 3.1 Tests de API de la especie (`SpeciesPhotoApiTest`): subir una y varias, la primera es principal, alt por defecto y propio, autoría, listado paginado en orden manual, `404`, límite de 50 `409`, elegir portada, `primary: false` `400`, reordenar con el conjunto exacto y con uno que falta o sobra `400`, borrar la portada promueve la siguiente, borrar la última, alt en blanco `400`, foto de otra especie `404`, **no aparecen fotos de ningún ejemplar**
- [x] 3.2 Tests de API del ejemplar (`PlantPhotoApiTest`): ejemplar sin fotos válido, subir después del alta y en un ejemplar archivado, propósito válido y desconocido `400`, orden por defecto por captura descendente con fallback a subida, `?sort=position`, filtros `purpose` y `event`, corregir fecha de captura recoloca, principal, borrar principal, otro ejemplar `404`, `404`, límite `409`
- [x] 3.3 Tests de fotos de un evento (`PlantPhotoEventApiTest`): colgar de comentario, intervención, floración y tarea completada, evento de otro ejemplar `400`, inexistente `400`, lectura o cambio de estado no admiten, borrar el evento deja la foto sin evento y con su archivo, colgar y descolgar corrigiendo
- [x] 3.4 Tests del servido (`MediaServingApiTest`): variantes con tipo, `nosniff`, caché inmutable y `ETag`, `304` condicional, imagen y variante inexistentes `404`, el `Content-Type` sale de lo guardado y no del cliente
- [x] 3.5 Tests de multipart (`MediaUploadApiTest`): 413 por tamaño, once archivos, sin archivos, uno inválido entre válidos sin dejar nada, contenido manda sobre nombre y `Content-Type`, GIF y HEIC con los formatos admitidos en el mensaje, nombre malicioso, cuerpo de error uniforme
- [x] 3.6 Servicios `SpeciesPhotoService` y `PlantPhotoService`, `MediaController` (servido) y los controllers de subida, listado, corrección, orden y borrado; `413` en el manejador de errores
- [x] 3.7 Tests de la cronología (`TimelinePhotosApiTest`): `photos` en comentario, intervención, floración y tarea, omitido si no hay, no en lecturas ni en estado ni movimiento, **una consulta** para la página, la foto subida aparece al repetir la petición, las respuestas de crear o corregir un evento traen el campo
- [x] 3.8 `photos` en la entrada de la cronología y su carga agregada en `PlantTimelineService`
- [x] 3.9 Tests de los resúmenes (`PhotoSummaryApiTest`): `primaryPhoto` y `photoCount` en filas y detalle de especies y de ejemplares, sin fotos, **una consulta** por página (contador de consultas), las de la especie no cuentan en el ejemplar; retirar una especie con fotos las retira y retirarla con ejemplares sigue en `409` conservándolas
- [x] 3.10 `primaryPhoto` y `photoCount` en `GET /species`, `GET /plants` y sus detalles; `SpeciesService.delete` retira las fotos
- [x] 3.11 Tests del barrido (`MediaCleanupTest`, reloj mutable y directorio temporal): huérfano antiguo retirado, reciente respetado, referenciado intacto, fila sin archivo solo se registra, nada fuera de la raíz
- [x] 3.12 `MediaCleanupService` y su `@Scheduled` mudo, desactivable y apagado en los tests
- [x] 3.13 La suite completa del backend sigue en verde

## 4. Kit y frontend

- [x] 4.1 Tests de `UiMediaGallery` en modo de gestión (menú por imagen accesible por teclado, emite principal / editar / borrar con el identificador, reordenar por teclado con foco conservado, estado «subiendo» y «error» con texto, sin el modo el comportamiento actual intacto); implementarlo y mostrarlo en `/ui-kit`
- [x] 4.2 Tests de `UiCoverPhoto` (imagen con alt y recuento activable, «1 foto», «Sin fotografía» sin hueco en blanco, dos tamaños, un solo elemento raíz); implementarlo y mostrarlo en `/ui-kit`
- [x] 4.3 Tests de la validación previa (`validateImageFiles`): tipo, tamaño, número y mensaje por archivo, con la misma tabla de límites del servidor; implementarla en `shared/utils`
- [x] 4.4 Tests de `postForm` en el cliente HTTP (multipart sin fijar el `Content-Type`, errores normalizados) y del service de medios (`media.api.service.test.ts`): subida, listado paginado, corregir, orden, borrar, errores como valor; implementarlos
- [x] 4.5 Tipos, mapper (respuesta → `GalleryImage` con la ruta completada con la base del API, fecha de captura y subida, enlace al evento) y su test
- [x] 4.6 Tests de `useMediaGallery`: cargar, subir con estado por archivo, un fallo no pierde los demás, principal, corregir, reordenar, borrar con recuento, error con reintento; implementarlo
- [x] 4.7 Tests y cola `usePendingUploads` (guardar y subir después: el alta y los diálogos no se bloquean por un fallo, aviso de lo no subido, reintento desde la ficha); implementarla
- [x] 4.8 Tests de la ficha de la especie (`species-detail.nuxt.spec.ts`): portada real y recuento, pestaña con galería, subida con rechazo previo, elegir portada, texto alternativo y autoría, borrar con confirmación, reordenar, sin fotografías, sin marcador T-19; reescribir `SpeciesPhotosPanel` y la cabecera
- [x] 4.9 Tests del editor de la especie: al crear, los archivos se conservan y suben tras guardar; si falla la subida la especie existe y se avisa; al editar, gestión sobre la marcha; reescribir `SpeciesForm`
- [x] 4.10 Tests del listado de especies: miniatura `thumb` real, marcador con alt sin portada, la vista de fotografías sigue marcada; implementarlo
- [x] 4.11 Tests del alta del ejemplar (`plant-form`): «Fotografías iniciales» con las tres sugerencias que fijan el propósito, el alta sin fotos, el alta con fotos sube después de crear con su propósito, una subida fallida no impide el alta y lleva a la ficha con el aviso, guardar y añadir otra no arrastra las fotos; reescribir `PlantForm` con el copy corregido
- [x] 4.12 Tests de la ficha del ejemplar: portada real y recuento en la cabecera con `UiCoverPhoto`, «Sin fotografía» sin cifras de ejemplo, pestaña con la galería de evolución por fecha, conmutador por fecha / manual, ampliar con fechas y enlace al evento, corregir la fecha de captura, subir actualiza el recuento sin recargar, las de la especie no aparecen; reescribir `PlantHeader` y la pestaña; borrar `MOCK_PHOTO_COUNT` y la rama «llegan en T-19»
- [x] 4.13 Tests de la cronología y los diálogos: miniaturas en la tarjeta del evento que se amplían, adjuntar en los diálogos de comentario, intervención y floración (se crea el evento y después se suben con `eventId`), un fallo de subida no deshace el evento y avisa, «añadir fotografía» y «quitar» en una tarjeta existente, sin hueco si no hay fotos; implementarlo
- [x] 4.14 Suite completa del frontend en verde, incluidos `design-tokens` y `architecture`; ningún `T-19` ni `MOCK_PHOTO` residual (`grep`)

## 5. Documentación y cierre

- [x] 5.1 `docs/diagramas/modelo-datos-actual.md` (`V18`) y el borrador de gestión: lo construido, el asset con dos satélites, la pregunta 19 y la de almacenamiento resueltas; `docs/adr/README.md` ya lista ADR-018
- [x] 5.2 `README.md`: los endpoints de fotografías, los límites, el volumen y su copia con la base, y `iac/local/README.md` con la variable de la ruta
- [x] 5.3 Ticket T-19 cerrado, historias 1.7 y 1.8 sin pendientes, §24.12 resuelta en el documento de producto y `CLAUDE.md` con el estado y el kit (+1 componente: `UiCoverPhoto`; `UiMediaGallery` gana modo de gestión)
- [x] 5.4 Contraste final con el prototipo, bloque a bloque: `plant-detail` (cabecera, pestaña, tarjeta «Fotografía y comentario»), `plant-editor` (Fotografías iniciales), `species-detail`, `species-editor` y las miniaturas de `species`; con lo que se aparta (copy del alta, conmutador de orden) y lo que queda marcado (vista de fotografías, exportación con enlaces)
- [ ] 5.5 Comprobar contra el backend real en Docker (`V18` aplicada, volumen montado): subir varias imágenes con EXIF y verificar que el servido no lo trae, portada, reordenar, colgar de un comentario, borrar y que el archivo desaparece, y el barrido ejecutado con un huérfano de prueba; después en el navegador (móvil incluido)
- [x] 5.6 `openspec validate fotografias`
