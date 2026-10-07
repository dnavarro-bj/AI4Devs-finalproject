# ADR-018 - Almacenamiento y tratamiento de fotografías

**Estado:** Aceptado
**Fecha:** 2026-10-07
**Origen:** change `fotografias` (T-19); §8.3 y §24.12 del documento de producto

## Contexto

T-19 es la **primera vez que el sistema guarda binarios**. Hasta ahora todo era filas pequeñas en PostgreSQL. Una imagen plantea decisiones que un registro no: dónde vive el archivo, qué se acepta de un cliente no confiable, qué se hace con los metadatos —el EXIF de un móvil lleva la **geolocalización** de quien fotografía—, cómo se sirve una galería de 2000 ejemplares sin cargar megas por miniatura y qué significa borrar.

El producto es de **un vivero pequeño** (500–2000 ejemplares) y de **un solo servidor**: no hay multiusuario ni despliegue distribuido (F.14). La cámara del móvil es el punto de captura natural (§2.1), así que las subidas llegan de dispositivos con fotos grandes.

## Decisión

**1. Los archivos viven en disco local, detrás de un puerto.** Un directorio configurable (`cactify.media.root`), montado como volumen en Docker, con una disposición estable y sin nombres del usuario (`<id>/original`, `<id>/thumb`, …). El acceso es un **puerto en `application`** (`MediaStorage`: guardar, abrir, borrar) y su adaptador de disco vive en `infrastructure`, igual que las demás integraciones ([ADR-012](ADR-012-integraciones-externas.md)). Pasar a un servicio de objetos es cambiar el adaptador; el dominio y el API no se enteran. La base guarda **la referencia y los metadatos**, nunca el binario.

**2. Se acepta JPEG, PNG y WebP, hasta 10 MB por archivo y 10 por subida.** El tipo se decide **por el contenido** (cabecera del archivo), nunca por la extensión ni por el `Content-Type` que declare el cliente. Un archivo que no sea una imagen decodificable, que exceda el tamaño o que traiga dimensiones absurdas se rechaza con `400` (`413` si excede el tamaño del cuerpo) antes de escribir nada en disco. HEIC queda fuera: se convierte en el dispositivo.

**3. Toda imagen se re-codifica en el servidor.** Lo que se guarda **no es lo que subió el cliente**: se decodifica, se aplica la orientación del EXIF, se descarta **todo el EXIF** —geolocalización incluida— y se vuelve a codificar. Eso neutraliza de paso las imágenes malformadas o con carga oculta. Antes de descartarlo se lee **la fecha de captura**, que se guarda como dato propio (`captured_at`) y se puede corregir. Se generan **miniaturas** (una de lista y una de galería) en la subida, de modo que ninguna pantalla de listado sirve el original.

**4. El borrado es real.** Se elimina la fila y **todos** los archivos. Si la imagen colgaba de un evento del historial, el evento permanece y la imagen desaparece; la cronología no guarda un hueco. Como el archivo y la fila son dos almacenes, el orden es **primero la fila, luego los archivos**: un fallo a medias deja huérfanos en disco —recuperables con una limpieza— y nunca una fila que apunta a un archivo inexistente.

**5. Se sirve con el API, con la caché del navegador y sin URL adivinable.** Las imágenes se sirven por un endpoint del propio backend con `Cache-Control` largo e `immutable` (el contenido de un identificador no cambia), `Content-Type` fijado por el servidor y `X-Content-Type-Options: nosniff`. Los identificadores son TSID ([ADR-003](ADR-003-tsid-como-clave-primaria.md)); no hay autenticación todavía, así que **la privacidad es la del resto del API**: cuando exista multiusuario las imágenes entran bajo el mismo control de acceso que el resto de recursos.

**6. Los límites son configuración.** Tamaño máximo, número por subida, dimensiones máximas, calidad de la re-codificación y tamaños de miniatura salen de `cactify.media.*` con valores por defecto, no de constantes sin nombre.

## Alternativas consideradas

* **MinIO/S3 desde el primer día.** Más robusto y escalable, pero añade un contenedor, un SDK y credenciales a un sistema de un solo servidor. El puerto de la decisión 1 deja la puerta abierta sin pagarlo ahora.
* **Guardar el binario en PostgreSQL (`bytea`).** Una sola fuente y copias de seguridad unificadas, pero infla la base, castiga la caché del motor y complica servir las imágenes con caché HTTP. Rechazada.
* **Conservar el original sin tocar.** Evita re-codificar, pero guarda la geolocalización de quien fotografía y acepta tal cual lo que envía un cliente no confiable. La privacidad y la seguridad pesan más que la fidelidad bit a bit en un registro de plantas.
* **Aceptar HEIC.** Las fotos de iPhone entrarían directas, pero exige una librería de conversión nativa en el servidor. Se descarta por ahora; si hiciera falta, es una ampliación del decodificador.
* **Borrado lógico.** Permite deshacer, a costa de disco y de decidir cuándo se purga. Los comentarios ya se pueden borrar sin historial (§24.8) y una fotografía no tiene valor de auditoría.
* **Generar las miniaturas bajo demanda.** Ahorra espacio, pero mete CPU en la ruta de lectura de la galería. Rechazada: se pagan una vez, al subir.

## Consecuencias

* **Más fácil:** la galería carga miniaturas pequeñas y cacheables; ningún EXIF sale del servidor; cambiar de almacén es escribir un adaptador.
* **Más difícil:** hay un directorio que **respaldar junto con la base** —sin él, las filas apuntan a nada— y un volumen que dimensionar (2000 ejemplares con unas pocas fotos cada uno son del orden de gigas). Hay que acotar la **memoria** de la decodificación (dimensiones máximas) para que una imagen enorme no tumbe el proceso.
* **Neutral:** un archivo huérfano en disco es basura sin consecuencia funcional y se puede barrer con un proceso de mantenimiento; una fila sin archivo sí lo sería, y el orden de borrado la evita.
* **Pendiente:** el tamaño del volumen en producción y la política de copias, que son de despliegue y no de este ADR.
