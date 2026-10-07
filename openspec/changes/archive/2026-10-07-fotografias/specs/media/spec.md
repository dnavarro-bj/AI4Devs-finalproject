## ADDED Requirements

### Requirement: Subida de fotografías

Las subidas SHALL ser `multipart/form-data` con de **1 a 10 archivos** en la parte `files` y campos de texto opcionales que valen **para toda la subida**. Cada archivo SHALL ser de **hasta 10 MB** y SHALL ser **JPEG, PNG o WebP decidido por su contenido** —su cabecera real—, nunca por la extensión ni por el `Content-Type` que declare el cliente. Una subida SHALL validarse **entera antes de escribir nada**: si un solo archivo no es válido, la respuesta SHALL ser un error y **no SHALL quedar ningún archivo ni ninguna fila**. Un archivo que no sea una imagen decodificable, de un tipo no admitido o con dimensiones que superen el máximo configurado SHALL responder `400` diciendo cuál; un archivo que exceda el tamaño, `413`; una subida sin archivos o con más de diez, `400`. La respuesta SHALL ser `201 Created` con **una entrada por archivo, en el orden recibido**.

#### Scenario: Subir una imagen válida

- **WHEN** se sube un JPEG de 3 MB
- **THEN** la respuesta es `201 Created` con una entrada con su identificador, sus dimensiones y las rutas de sus variantes

#### Scenario: Varias imágenes en una subida

- **WHEN** se suben cuatro imágenes válidas a la vez
- **THEN** la respuesta trae cuatro entradas en el orden recibido y las cuatro quedan guardadas

#### Scenario: El contenido manda, no el nombre

- **WHEN** se sube un archivo de texto con extensión `.jpg` y `Content-Type: image/jpeg`
- **THEN** la respuesta es `400` indicando que no es una imagen admitida

#### Scenario: Un tipo no admitido

- **WHEN** se sube un GIF o un HEIC
- **THEN** la respuesta es `400` indicando los formatos admitidos

#### Scenario: Una sola inválida invalida la subida

- **WHEN** se suben tres imágenes válidas y un archivo corrupto
- **THEN** la respuesta es `400`, no se guarda ninguna fila y el almacén no contiene ningún archivo nuevo

#### Scenario: Archivo demasiado grande

- **WHEN** se sube un archivo de 11 MB
- **THEN** la respuesta es `413` y no se guarda nada

#### Scenario: Demasiados archivos

- **WHEN** se suben once archivos
- **THEN** la respuesta es `400` y no se guarda nada

#### Scenario: Sin archivos

- **WHEN** se envía la subida sin ninguna parte `files`
- **THEN** la respuesta es `400`

#### Scenario: Una imagen que desborda la memoria

- **WHEN** se sube una imagen cuyas dimensiones superan el máximo de píxeles configurado
- **THEN** la respuesta es `400` antes de decodificarla entera

### Requirement: Procesado de la imagen

Toda imagen SHALL **re-codificarse en el servidor** y lo guardado NO SHALL ser lo que subió el cliente. El procesado SHALL: leer **antes** la fecha de captura del EXIF, aplicar la **orientación** del EXIF, **descartar todos los metadatos** —la geolocalización incluida— y generar tres variantes: **`thumb`** (lado mayor de hasta 320 px), **`medium`** (hasta 1280 px) y **`full`** (hasta el máximo configurado, 4096 px por defecto). Una variante NO SHALL ampliar la imagen original. Los JPEG y los WebP SHALL guardarse como JPEG y los PNG con transparencia como PNG. La fecha de captura leída SHALL guardarse como dato propio, y un cliente SHALL poder fijarla o corregirla.

#### Scenario: El EXIF no sale del servidor

- **WHEN** se sube un JPEG con geolocalización y fecha de captura en su EXIF
- **THEN** ninguna de las variantes guardadas contiene EXIF ni coordenadas

#### Scenario: La fecha de captura se conserva como dato

- **WHEN** se sube un JPEG cuyo EXIF dice que se tomó el 14 de agosto de 2026
- **THEN** la entrada trae esa fecha de captura, distinta de la fecha de subida

#### Scenario: Sin fecha de captura

- **WHEN** se sube una imagen sin EXIF
- **THEN** la fecha de captura queda ausente y la de subida es la del reloj

#### Scenario: La fecha del cliente manda

- **WHEN** se sube una imagen con `capturedAt` explícito
- **THEN** la entrada trae esa fecha, aunque el EXIF diga otra

#### Scenario: La orientación se aplica

- **WHEN** se sube un JPEG fotografiado en vertical y marcado con orientación 6
- **THEN** las variantes están ya giradas y sus dimensiones son las de la imagen derecha

#### Scenario: Tres variantes y ninguna ampliada

- **WHEN** se sube una imagen de 4000×3000
- **THEN** existen `thumb` de 320×240, `medium` de 1280×960 y `full` de 4000×3000; y una de 200×100 genera las tres variantes de 200×100

#### Scenario: Un PNG con transparencia

- **WHEN** se sube un PNG con canal alfa
- **THEN** las variantes se guardan como PNG y conservan la transparencia

#### Scenario: Un WebP

- **WHEN** se sube un WebP
- **THEN** se guarda como JPEG

### Requirement: Servir las imágenes

`GET /media/{id}/{variant}` SHALL devolver el binario de la variante `thumb`, `medium` o `full` con el **`Content-Type` fijado por el servidor** a partir de lo guardado, `X-Content-Type-Options: nosniff` y `Cache-Control` **largo e `immutable`**, porque el contenido de un identificador no cambia. SHALL admitir `ETag` y responder `304` a una petición condicional. Un identificador inexistente o una variante desconocida SHALL responder `404`. Las respuestas de fotografías SHALL traer, por cada imagen, las **rutas relativas de sus tres variantes**, que el cliente completa con la base del API.

#### Scenario: Servir una miniatura

- **WHEN** se pide `GET /media/{id}/thumb` de una imagen guardada
- **THEN** la respuesta es `200 OK` con la imagen, su tipo, `nosniff` y la caché inmutable

#### Scenario: Petición condicional

- **WHEN** se repite la petición con el `ETag` recibido
- **THEN** la respuesta es `304` sin cuerpo

#### Scenario: Imagen inexistente

- **WHEN** se pide una imagen que no existe, o una variante `enorme`
- **THEN** la respuesta es `404`

### Requirement: Almacenamiento detrás de un puerto

El sistema SHALL guardar los binarios a través de un **puerto `MediaStorage` en `application`** —guardar, abrir y borrar— cuyo adaptador de disco vive en `infrastructure` (ADR-012) y escribe bajo el directorio `cactify.media.root`, con una disposición por identificador y **sin ningún nombre que venga del usuario**. Las escrituras SHALL ser atómicas (se escribe en un nombre temporal y se renombra) y el adaptador SHALL rechazar cualquier clave que salga del directorio raíz. La base SHALL guardar **la referencia y los metadatos, nunca el binario**, y una fila SHALL escribirse **después** de que sus archivos existan; si la fila falla, los archivos SHALL retirarse.

#### Scenario: Una clave que intenta salir del directorio

- **WHEN** el adaptador recibe una clave con `../`
- **THEN** la rechaza y no lee ni escribe fuera de la raíz

#### Scenario: Fallo al guardar la fila

- **WHEN** la base de datos rechaza la fila de una imagen ya escrita en disco
- **THEN** los archivos de esa imagen se retiran y la subida responde con error

#### Scenario: El nombre original no se usa

- **WHEN** se sube un archivo llamado `../../etc/passwd.jpg`
- **THEN** el almacén no contiene ese nombre y la respuesta no lo expone

### Requirement: Borrado real

Borrar una fotografía SHALL eliminar **la fila y todos sus archivos**. El orden SHALL ser **primero la fila, después los archivos**, y estos últimos SHALL retirarse **tras confirmarse** la transacción: un fallo a medias puede dejar archivos huérfanos, nunca una fila que apunte a un archivo inexistente. Un fallo al retirar un archivo NO SHALL deshacer el borrado ni responder con error al cliente; se registra y lo recoge el barrido de mantenimiento.

#### Scenario: Borrar una fotografía

- **WHEN** se borra una fotografía
- **THEN** la fila desaparece, sus tres archivos también y el servido de sus rutas responde `404`

#### Scenario: Fallo al retirar un archivo

- **WHEN** el borrado de uno de los archivos falla tras confirmarse la fila
- **THEN** la respuesta sigue siendo `204`, la fila no vuelve y el archivo queda para el barrido

#### Scenario: Transacción deshecha

- **WHEN** la transacción de un borrado se deshace
- **THEN** ningún archivo se retira

### Requirement: Barrido de archivos huérfanos

El sistema SHALL ofrecer un **barrido programado** —desactivable y con su periodicidad configurable— que retire del almacén **los archivos que ninguna fila referencia** y tengan **más de un día**, de modo que una subida en curso no se confunda con un huérfano. El barrido SHALL ser invocable como servicio de aplicación y probarse con el reloj inyectado, y NO SHALL borrar nunca un archivo referenciado ni tocar nada fuera del directorio raíz. Informar de las **filas sin archivo** SHALL limitarse a registrarlas, nunca a corregirlas.

#### Scenario: Un huérfano antiguo

- **WHEN** hay un directorio en el almacén sin fila y de hace tres días
- **THEN** el barrido lo retira

#### Scenario: Un huérfano reciente

- **WHEN** el directorio sin fila es de hace una hora
- **THEN** el barrido lo respeta

#### Scenario: Un archivo referenciado

- **WHEN** una fotografía tiene fila y archivos, aunque sean antiguos
- **THEN** el barrido no los toca

#### Scenario: Una fila sin archivo

- **WHEN** una fila apunta a un archivo que no existe
- **THEN** el barrido lo registra y no cambia ninguna fila

### Requirement: Límites en configuración

El tamaño máximo, el número de archivos por subida, el de **fotografías por dueño** —50 por defecto—, las dimensiones y píxeles máximos, la calidad de la re-codificación, los tamaños de las variantes, la edad mínima de un huérfano y la ruta raíz SHALL leerse de `cactify.media.*` con valores por defecto, y los límites de la petición multipart de la configuración del servidor. Una configuración incoherente SHALL impedir el arranque.

#### Scenario: Valores por defecto

- **WHEN** no hay configuración propia
- **THEN** se aplican 10 MB, 10 archivos, 50 fotografías por dueño, miniaturas de 320 px y 1280 px, y un máximo de 4096 px

#### Scenario: Configuración incoherente

- **WHEN** el tamaño de `medium` está configurado mayor que el máximo de `full`
- **THEN** la aplicación no arranca y dice por qué
