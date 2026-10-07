# Design: fotografias

## Contexto

La ficha del ejemplar tiene un hueco con «8 fotos · ejemplo» (`MOCK_PHOTO_COUNT`), la de la especie un botón «Añadir fotografías» deshabilitado, y los dos formularios dicen «el almacenamiento llega en T-19». El kit ya tiene `UiUploadArea` (que **solo emite ficheros**, a propósito: subir no era suyo) y `UiMediaGallery` (read-only, con ampliación y texto alternativo obligatorio) desde T-12. **ADR-018** decide el almacén, los formatos, el EXIF, las miniaturas y el borrado; este diseño decide cómo se integra.

**Dependencias de orden:** la migración es **`V18`** (V17 es `trabajo-por-lote`); la cronología de T-20 (`plant_event`) ya existe y es lo que enlaza las fotos de un evento.

## Contraste con el borrador, el ticket y el wireframe

| Fuente | Dice | Este change |
|---|---|---|
| Borrador | `MEDIA_ASSET` compartido y dos satélites (`SPECIES_MEDIA`, `PLANT_MEDIA`) sin identificador propio | **Se construye así**: `media_asset` es lo que *es* el archivo y los satélites dicen *de quién* es, con **la misma clave** que el asset y borrado en cascada. Ver decisión 1. |
| Borrador | `PLANT_MEDIA.eventId` | Igual, **hacia `plant_event`**, con `ON DELETE SET NULL`: borrar el evento no borra la foto (decisión 5). |
| Borrador | `purpose` propuesto por el frontend (`general\|detalle\|etiqueta_fisica`), pendiente (pregunta 19) | **Enum cerrado** (ADR-007). Resuelve la pregunta 19. |
| Borrador | `MEDIA_ASSET.storageKey, mimeType, sizeBytes` | Más `width`, `height` y las rutas de tres variantes; la fecha de subida es la `created_at` de siempre (ADR-010). |
| Ticket | «Subida durante el alta y desde la ficha» | **Dos peticiones**: se crea el ejemplar y *después* se suben las fotos (decisión 3). El alta no cambia de contrato. |
| Ticket | «Galería ordena por fecha» | Por **fecha de captura descendente**; el orden manual a petición (decisión 4). |
| Wireframe `plant-detail` | Foto en la cabecera con «8 fotos», pestaña «Fotografías 8» y la tarjeta «Fotografía y comentario» | Se reproduce entero. |
| Wireframe `plant-editor` | «Fotografías iniciales» con la zona de arrastre y tres sugerencias de propósito | Se reproduce; **se aparta** en una frase del copy («la principal identificará la planta en el inventario»), porque el inventario del prototipo no dibuja miniaturas: el texto pasa a «será la portada de su ficha» (ver «Composición»). |
| Wireframe `species-detail` y `species-editor` | Galería en la cabecera, pestaña «Fotografías 6» y fieldset con «Principal» y «•••» por imagen | Se reproduce con el modo de gestión de la galería. |

## Composición de las pantallas

**Ficha del ejemplar** (`plant-detail`): la cabecera abre con la **portada** a la izquierda —con el recuento activable— y la identidad al lado; la pestaña «Fotografías» es la galería de evolución con subida a la derecha del encabezado; la cronología pinta las miniaturas dentro de la tarjeta del evento («event-media» del prototipo). **Ficha de la especie** (`species-detail`): portada con recuento en la cabecera; pestaña «Fotografías» con galería y subida. **Editores**: el fieldset de fotografías de `plant-editor` y `species-editor`. **Listado de especies**: la `species-thumb` de cada fila.

Qué se aparta, y por qué:

1. **El copy del alta** (arriba): no se promete una miniatura en el inventario que el prototipo no tiene. El dato (`primaryPhoto`) se sirve en las filas del inventario y se aprovechará cuando la composición lo pida; **no se dibuja una columna que el prototipo no dibuja**.
2. **La «Vista de fotografías»** del listado de especies sigue marcada y deshabilitada: es una vista de tarjetas, no una miniatura (non-goal).
3. **Conmutador «Por fecha / Manual»** en la galería del ejemplar: el prototipo no lo dibuja, pero «orden configurable» (ticket) y «ver la evolución» (1.8) son dos órdenes distintos y hay que poder pasar de uno a otro.

Los patrones que aparecen en dos pantallas salen al kit con su test y su muestra (ADR-014): el **modo de gestión de `UiMediaGallery`** y **`UiCoverPhoto`** (la portada con recuento, en las dos fichas).

## Decisiones

**1. Un asset y dos satélites, no una tabla por dueño.** `media_asset(id, storage_key, content_type, width, height, size_bytes, alt_text, captured_at, created_at, updated_at)` guarda **lo que es el archivo**; `species_media(media_id PK→FK cascade, species_id, position, is_primary, credit)` y `plant_media(media_id PK→FK cascade, plant_id, event_id nulo, purpose nulo, position, is_primary)` dicen **de quién es y cómo se muestra**. Se prefirió a una tabla por dueño porque el borrado de archivos, la limpieza de huérfanos, el servido y el procesado **son uno solo** y trabajan sobre `media_asset`; los satélites solo llevan lo propio. La herencia `JOINED` de T-20 habría servido, pero un asset **no es** un evento ni tiene subtipos polimórficos: son dos relaciones de pertenencia, no una jerarquía; se mapea como `@OneToOne` del satélite al asset con el mismo identificador (`@MapsId`). El texto alternativo vive en el asset (es del archivo) y es obligatorio con un `CHECK` de no en blanco (ADR-002).

**2. «Una principal» como índice único parcial.** `UNIQUE (species_id) WHERE is_primary` y `UNIQUE (plant_id) WHERE is_primary`. Marcar otra como principal es **una transacción** que desmarca la anterior y marca la nueva (en ese orden, para no violar el índice); `primary: false` es `400` porque una galería con fotos siempre tiene portada. **La primera fotografía de un dueño nace principal** y **borrar la principal promueve la siguiente por orden** dentro de la misma transacción. «Al menos una principal si hay fotos» es una regla de conjunto que no cabe en un `CHECK`: la mantienen los métodos del dominio —`SpeciesMediaGallery.add/promote/remove`— y la prueba una batería de tests de las transiciones. El orden manual es `position` (`INT ≥ 0`, sin huecos tras reordenar); reordenar recibe **la lista entera** y reescribe las posiciones, para que dos clientes no dejen el orden a medias.

**3. Se sube *después* de crear, nunca con el alta.** `POST /plants` y `POST /species` no cambian: llevar archivos en su cuerpo mezclaría JSON con binarios, rompería el contrato probado de cuarenta tests y convertiría un fallo de imagen en un fallo del alta. El frontend orquesta: **guardar → subir → si falla, avisar y llevar a la ficha**. Es la forma de cumplir «la fotografía no bloquea el alta» **por construcción**: el ejemplar ya existe cuando se sube la primera foto. Lo que se paga es no poder deshacer el alta si la subida falla; se acepta, porque un ejemplar sin foto es válido.

**4. Dos endpoints de subida con `multipart/form-data`, y ninguno con metadatos por archivo.** La parte `files` es repetible (hasta 10) y los campos de texto (`altText`, `capturedAt`, `credit`, `purpose`, `eventId`) **valen para todos los archivos de la subida**. Metadatos distintos por archivo exigirían una convención de nombres de parte que cada cliente debe respetar; el caso real es «sube estas 3 fotos del alta» (mismo propósito por tanda) o «sube esta foto de este comentario» (una). Lo que se afine después, se hace con `PUT`. La respuesta es la **lista de entradas** en el orden recibido. **Orden por defecto de la galería del ejemplar**: `coalesce(captured_at, created_at) DESC` con el identificador de desempate —la evolución—; `?sort=position` da el manual. La de la especie es siempre manual. Ambos listados paginados (ADR-009).

**5. El evento cuelga por `plant_media.event_id → plant_event(id) ON DELETE SET NULL`.** T-20 dejó la espina precisamente para esto. Se admite cualquier evento **de la espina del mismo ejemplar** (comentario, intervención, floración, tarea completada); que el evento sea de la misma planta no cabe en un `CHECK` (cruza dos tablas) y lo comprueba el servicio → `400`. **Borrar el evento no borra la foto**: pasa a la galería sin evento, que es lo que el usuario espera de una foto del ejemplar (la foto es un dato de la planta, el comentario solo un comentario). Las lecturas, los cambios de estado y los movimientos **no son eventos de la espina** (decisión de T-20) y no admiten foto.

**6. En la cronología, `photos` por entrada y una consulta más.** `PlantTimelineService` ya agrupa por tipo y carga cada grupo con una consulta; tras cargar los eventos de la página, **una consulta `plant_media … join media_asset where event_id in (:ids)`** trae todas las fotos de la página y se reparten por evento. El campo `photos` va en `TimelineEntryResponse` y se omite si está vacío, y **`PlantEventService`** devuelve el mismo campo al crear o corregir un evento (con la lista vacía al crearlo; las fotos llegan después). Se prefiere esto a un `GET` aparte por evento: una cronología de 25 entradas no puede costar 25 peticiones.

**7. Procesado: ImageIO con extensiones, metadatos aparte, en un servicio.** `ImageProcessor` (en `application`, sin conocer discos ni HTTP) recibe bytes y devuelve las tres variantes y los hechos (dimensiones, fecha de captura). Decodifica con **`javax.imageio` + TwelveMonkeys** (JPEG y WebP; PNG viene de serie) y **lee la fecha y la orientación con `metadata-extractor` antes de decodificar**; lo que ImageIO re-codifica **no lleva ningún metadato**, que es el descarte del EXIF. La orientación se aplica girando el `BufferedImage`. Antes de decodificar entera, el lector da las **dimensiones** y se rechaza si superan los píxeles máximos (la defensa contra imágenes-bomba). **Salidas**: JPEG calidad 85 para JPEG y WebP, PNG si el original tiene canal alfa. No hay escritor WebP en esta pila y no se añade uno: un WebP sale como JPEG. Todo ocurre en memoria —10 MB × 10 archivos como mucho— y se procesa **de uno en uno**, para acotar el pico. Es una **dependencia nueva de `build.gradle.kts`** que se justifica en el ADR-018 (re-codificar) y se aísla en esta clase.

**8. Subida: validar todo, procesar todo, escribir archivos, escribir filas.** Orden fijo para que un fallo no deje nada: (1) comprobar número y tamaño de los archivos, (2) procesar **todos** en memoria, rechazando el primero inválido —nada escrito—, (3) escribir los archivos de cada imagen al almacén, (4) guardar las filas **en una transacción**, (5) si (4) falla, **retirar los archivos escritos** y propagar el error. El puerto `MediaStorage` guarda por clave `media/<id>/{thumb,medium,full}` con escritura atómica (temporal + renombrado) y valida que la clave resuelta cae bajo la raíz. El **nombre original no se usa nunca**. Los límites de la petición multipart se fijan en el servidor (`spring.servlet.multipart.max-file-size`, `max-request-size`) y un `MaxUploadSizeExceededException` se traduce a `413` con el cuerpo de error uniforme.

**9. Servido: un controlador de `media`, no de planta ni especie.** `GET /media/{id}/{variant}` lee el asset (para el tipo y el tamaño) y abre el archivo por el puerto; devuelve `Resource` con `Content-Type` del asset, `Cache-Control: public, max-age=31536000, immutable`, `ETag` = `"<id>-<variant>"` y `nosniff`. Es una excepción **declarada** al «los controllers solo inyectan servicios de `application`»: lo cumple, porque inyecta `MediaService`, no el puerto. **Las respuestas llevan rutas relativas** (`/media/123/thumb`) y el cliente antepone la base del API (ADR-013), que ya conoce; así el servidor no necesita saber su propia URL pública.

**10. El borrado confirma primero, retira después.** `MediaService.delete` borra la fila en su transacción y registra la retirada de archivos en **`TransactionSynchronization.afterCommit`**: si la transacción se deshace, los archivos siguen. Un fallo al borrar un archivo se **registra y no se propaga** (el cliente ya tiene su `204`) y lo recoge el barrido. Retirar una especie (`SpeciesService.delete`) borra primero sus fotografías por el mismo camino.

**11. El barrido es un servicio con un `@Scheduled` mudo, como el de alertas.** `MediaCleanupService.sweep()` lista los directorios del almacén, descarta los referenciados por una fila y los de menos de un día (**por la fecha de modificación del directorio**, comparada con el único `Clock`), y retira el resto. Un `@Scheduled` semanal que solo lo llama, desactivable con `cactify.media.cleanup.enabled` y apagado en los tests; el servicio se prueba con el reloj mutable y un directorio temporal. Las **filas sin archivo** solo se cuentan y se registran: corregirlas automáticamente sería decidir por el usuario qué fotos «no existieron».

**12. Los resúmenes se agregan, no se piden por fila.** `primaryPhoto` y `photoCount` de las páginas de especies y ejemplares salen de **una consulta por página** (`group by owner` con la principal y el recuento) y se reparten en memoria, el patrón de los recuentos de alertas y tareas (ADR-009). El detalle los trae con la misma consulta de una sola fila.

**13. Frontend: una feature `src/features/media/` y los dueños la consumen (ADR-015).** `media.api.service` habla multipart (el cliente HTTP gana una función `postForm`, con su test) y devuelve `ServiceResponse`; `useMediaGallery(owner)` es el caso de uso de una galería —cargar, subir con el estado por archivo, elegir la principal, corregir, reordenar, borrar— y sirve igual a `species` y `plants`; `mediaMapper` convierte la respuesta al `GalleryImage` del kit **completando la ruta con la base del API**; `usePendingUploads` es la cola que sobrevive a «guardar y subir después» del alta y de los diálogos. **La validación previa** (tipo, tamaño, número) es una función pura de `shared/utils` con su test y **la misma tabla de límites que el servidor** definida una vez; el servidor sigue siendo quien decide. `UiUploadArea` no cambia (emite ficheros).

## Riesgos / compromisos

* **El volumen hay que respaldarlo con la base.** Sin él, las filas apuntan a nada. Se anota en el README de despliegue y en `iac/local`; la política de copias es de despliegue.
* **Procesar en el hilo de la petición.** Diez imágenes de 10 MB tardan segundos y ocupan memoria. Se acota (de una en una, píxeles máximos), y si la carga lo pidiera pasaría a una cola sin cambiar el contrato.
* **Dependencia nueva de decodificación** (TwelveMonkeys y metadata-extractor): superficie de ataque conocida de los decodificadores. Se mitiga por construcción —tipo por contenido, píxeles acotados, re-codificación— y manteniéndolas actualizadas.
* **La fecha del EXIF no lleva zona.** Se interpreta como UTC y se guarda como instante: puede estar desplazada unas horas, y por eso es **corregible** y la galería ordena por día, no por minuto.
* **Subir tras crear** (decisión 3) puede dejar un ejemplar sin fotos si el usuario cierra la pestaña a medias. Es el compromiso de que nunca haya un alta bloqueada; la ficha ofrece subir en cualquier momento.
* **Sin autenticación** las rutas de las imágenes son públicas para quien alcance el API; los identificadores TSID no son secretos. Es la postura de todo el API hoy (ADR-018, decisión 5).

## Siguiente

T-29 podrá incluir los enlaces a las fotografías en la exportación; F.5 (móvil) aprovechará la cámara; F.6 y F.7 (estrés e identificación por fotografía) consumirán estas imágenes.

## Contraste final con el prototipo (tarea 5.4)

Pantalla por pantalla, contra su `data-screen` de `docs/wireframes/cactify-admin/index.html`.

| Pantalla | Se reproduce | Se aparta | Queda marcado |
|---|---|---|---|
| `plant-detail` | Portada cuadrada en la columna de 140 px con recuento activable (`UiCoverPhoto`); pestaña «Fotografías N» con el recuento real y la galería de evolución con subida; tarjeta «Fotografía y comentario» con las miniaturas dentro del evento, que se amplían | Conmutador «Por fecha / Manual» en la galería, que el prototipo no dibuja (hacen falta los dos órdenes); sin foto, «Sin fotografía» en vez de cifras de ejemplo | — |
| `plant-editor` | «Fotografías iniciales» con la zona de arrastre y las tres sugerencias que fijan el propósito; «Guardar y añadir otra» | El copy pasa a «será la portada de su ficha» (el inventario no dibuja miniaturas); la subida va tras guardar y su fallo no impide el alta | — |
| `species-detail` | Cabecera con portada, miniaturas y «＋ Añadir»; pestaña «Fotografías N» con galería, texto alternativo y autoría; el recuento no se muestra si es 0 | — | — |
| `species-editor` | Fieldset con «Principal» y «•••» por imagen, resuelto con el modo de gestión de `UiMediaGallery`; al crear, las fotos suben tras guardar | Reordenar **sin arrastrar**: «Mover antes / después» en el menú (accesible por teclado) | — |
| `species` | `species-thumb` real (`thumb`) en cada fila, con marcador y texto alternativo si no hay portada | — | El conmutador ▦ «Vista de fotografías», deshabilitado |

Marcado fuera de este change: la casilla «Incluir enlaces a las fotografías» de la exportación (T-29) y la miniatura en el listado del inventario de ejemplares, que el prototipo no dibuja (el dato `primaryPhoto` ya se sirve).
