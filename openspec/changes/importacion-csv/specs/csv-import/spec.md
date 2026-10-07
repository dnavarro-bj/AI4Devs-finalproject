## Purpose

Cargar plantas y especies desde un CSV de forma controlada: se revisa antes de aplicar, los errores se ven por fila, nada se descarta en silencio y una importación nunca modifica lo que ya existe.

## ADDED Requirements

### Requirement: Revisar un archivo sin escribir nada

`POST /imports/{kind}/review`, con `kind` `plantas` o `especies` (otro valor, `404`), SHALL recibir un archivo CSV en la parte `file` y responder **sin escribir nada** en el sistema: el recuento de filas **listas**, **con avisos** y **con errores**, las columnas reconocidas y las ignoradas, y **el resultado de cada fila** con su número en el archivo, un identificador legible, su estado y los motivos. El archivo SHALL ser UTF-8, con o sin marca de orden de bytes, separado por `,` o `;` (el de la cabecera), con la convención RFC 4180 para las comillas. Las columnas SHALL reconocerse **por su nombre**, sin distinguir mayúsculas ni acentos y en cualquier orden. El archivo SHALL admitir **hasta 10 MB** y **hasta 5.000 filas** (configurable); lo que exceda SHALL responder `413` y `422` respectivamente, diciendo el número y el máximo, y **nunca se truncará**. Un archivo vacío o con solo la cabecera, sin una columna obligatoria o que no sea texto UTF-8 SHALL responder `400` diciendo qué falla.

#### Scenario: Revisión con filas de los tres estados

- **WHEN** se revisa un archivo de plantas con 231 filas correctas, 12 con avisos y 5 con errores
- **THEN** la respuesta trae 231 listas, 12 con avisos y 5 con errores, y una entrada por fila con su número, su estado y sus motivos

#### Scenario: La revisión no escribe nada

- **WHEN** se revisa cualquier archivo, con o sin errores
- **THEN** no se crea ninguna especie ni planta, no se consume ningún número de código y no se registra ninguna importación

#### Scenario: Columnas en otro orden y con otro formato

- **WHEN** el archivo trae las columnas desordenadas, con mayúsculas distintas, sin acentos o separadas por `;`
- **THEN** se reconocen todas por su nombre

#### Scenario: Columnas ignoradas

- **WHEN** el archivo trae una columna que el formato no conoce
- **THEN** la respuesta la lista entre las ignoradas y la revisión no falla

#### Scenario: Falta una columna obligatoria

- **WHEN** el archivo de plantas no trae la columna del apodo
- **THEN** la respuesta es `400` y dice cuál falta

#### Scenario: Archivo sin filas

- **WHEN** el archivo solo tiene la cabecera
- **THEN** la respuesta es `400`

#### Scenario: Demasiadas filas

- **WHEN** el archivo trae más filas que el máximo configurado
- **THEN** la respuesta es `422` con el número de filas y el máximo, y no se revisa ninguna

#### Scenario: Tipo desconocido

- **WHEN** se pide revisar el tipo `etiquetas`
- **THEN** la respuesta es `404`

### Requirement: Formato del CSV de especies

Cada fila de un CSV de especies SHALL crear una especie con **las mismas reglas que el alta** (`POST /species`). Las columnas obligatorias SHALL ser **Código**, **Nombre científico**, **Nombre común**, **Mezcla de sustrato** (por su nombre), **Temperatura mínima/máxima**, **Humedad mínima/máxima**, **Horas de luz mínimas/máximas** y **Riego orientativo**; opcionales, **Exposición** y **Entorno** con los valores del API. Los nombres de columna SHALL ser los de la exportación de especies, de modo que **la columna «Ejemplares» se acepta y se ignora**. Una fila SHALL ser error si el código o el nombre científico ya existen —en el sistema **o en una fila anterior del mismo archivo**—, si la mezcla no existe, si un valor no es del tipo o del rango admitido o si rompe una invariante de la especie (mínimo mayor que máximo, escalas).

#### Scenario: Una fila correcta

- **WHEN** una fila trae todos los datos obligatorios válidos y una mezcla existente
- **THEN** su estado es «lista» y, al aplicar, crea la especie con su mezcla

#### Scenario: El código ya existe

- **WHEN** el código de la fila es el de una especie existente
- **THEN** la fila es un error que dice que ya existe y que la importación no actualiza

#### Scenario: Nombre científico repetido en el archivo

- **WHEN** dos filas traen el mismo nombre científico
- **THEN** la primera es válida y la segunda es un error que señala la fila de la primera

#### Scenario: Mezcla inexistente

- **WHEN** el nombre de la mezcla no existe
- **THEN** la fila es un error que nombra la mezcla

#### Scenario: Rangos incoherentes

- **WHEN** la temperatura mínima es mayor que la máxima
- **THEN** la fila es un error con el mismo motivo que daría el alta

#### Scenario: La columna de ejemplares

- **WHEN** el archivo es una exportación de especies, con su columna «Ejemplares»
- **THEN** la columna se ignora sin aviso y no cuenta como desconocida

### Requirement: Formato del CSV de plantas

Cada fila de un CSV de plantas SHALL crear un ejemplar con **las mismas reglas que el alta** (`POST /plants`). Las columnas obligatorias SHALL ser **Apodo**, **Localización** y la especie, que se SHALL dar en **Código de especie** o en **Especie** (nombre científico); si vienen las dos y no son la misma especie, es un error. La **Localización** SHALL ser el código `LOC-…` o la **ruta completa** que exporta el listado (`Invernadero 1 / A3`); una ruta que coincida con dos localizaciones es un error. Opcionales: **Estado** (solo uno en curso; por defecto `activa`), **Etiquetas** (separadas por `;`, y todas SHALL existir), **Descripción**, **Año** y **Mes de germinación**, **Fecha de adquisición**, **Procedencia** y **Nota de procedencia**. **El código del ejemplar SHALL asignarlo el servidor** al aplicar, en el orden del archivo, con la regla del alta. Las columnas de la exportación de plantas **Código** y **Fecha de alta** SHALL aceptarse: un **Código** que ya existe es un error («ya existe; la importación no actualiza») y uno que no existe es un **aviso** de que se ignora y se asignará otro.

#### Scenario: Una fila correcta

- **WHEN** la fila trae apodo, una especie existente y una localización existente
- **THEN** su estado es «lista» y, al aplicar, crea el ejemplar con su código asignado

#### Scenario: Especie por código o por nombre

- **WHEN** una fila da el código de la especie y otra su nombre científico
- **THEN** ambas resuelven la misma especie

#### Scenario: Dos datos de especie que no coinciden

- **WHEN** el código de especie y el nombre científico son de especies distintas
- **THEN** la fila es un error

#### Scenario: Localización por ruta y por código

- **WHEN** una fila trae `Invernadero 1 / A3` y otra `LOC-INV1-A3`
- **THEN** ambas resuelven la localización

#### Scenario: Localización inexistente o ambigua

- **WHEN** la localización no existe, o su ruta coincide con dos
- **THEN** la fila es un error que lo dice

#### Scenario: Etiqueta inexistente

- **WHEN** una fila trae una etiqueta que no existe
- **THEN** la fila es un error que nombra la etiqueta y no se crea ninguna etiqueta

#### Scenario: Un estado final no se admite en el alta

- **WHEN** la fila trae el estado `muerta`
- **THEN** la fila es un error con el motivo que daría el alta

#### Scenario: Un código que ya existe

- **WHEN** la columna «Código» trae el de un ejemplar existente
- **THEN** la fila es un error que dice que ya existe y que no se actualiza

#### Scenario: Un código que no existe

- **WHEN** la columna «Código» trae uno que no existe
- **THEN** la fila es un aviso de que se ignora y el ejemplar recibe el código que le toque

#### Scenario: Reimportar una exportación

- **WHEN** se importa tal cual un CSV de plantas exportado del sistema
- **THEN** todas las filas son error por ya existir y no se crea nada

### Requirement: Aplicar una importación todo o nada

`POST /imports/{kind}` SHALL recibir el archivo, **volver a validarlo con el mismo código que la revisión** —no confía en que se revisara— y, **solo si ninguna fila es un error**, crear todo **en una sola transacción** y responder `201` con las filas creadas y con avisos y el identificador de la importación. Con **una sola fila con error** SHALL responder `422` con el recuento y **no crear nada**. Las filas con aviso SHALL aplicarse. Un archivo SHALL poder aplicarse una sola vez con efecto: **aplicarlo de nuevo SHALL dar errores por ya existir** y no crear nada. Los ejemplares SHALL recibir sus códigos **en el orden del archivo**, y un fallo a mitad de la escritura SHALL deshacerlo todo.

#### Scenario: Aplicar un archivo correcto

- **WHEN** se aplica un archivo de 248 plantas sin errores
- **THEN** la respuesta es `201`, se crean 248 ejemplares con sus códigos correlativos por especie en el orden del archivo y se registra la importación

#### Scenario: Una fila con error lo impide todo

- **WHEN** se aplica un archivo con 247 filas correctas y una con error
- **THEN** la respuesta es `422` con el recuento, no se crea ninguna fila y la importación queda registrada como rechazada

#### Scenario: Las filas con aviso se aplican

- **WHEN** el archivo solo tiene filas correctas y con avisos
- **THEN** se crean todas

#### Scenario: Aplicar dos veces

- **WHEN** se aplica el mismo archivo por segunda vez
- **THEN** la respuesta es `422` con todas las filas como error por ya existir y no se duplica nada

#### Scenario: Un fallo a mitad de la escritura

- **WHEN** la base falla al crear la fila 100 de 200
- **THEN** no queda ninguna de las 200 filas ni consumido ningún número de código

#### Scenario: Lo creado es lo que habría creado el alta

- **WHEN** se importa una especie o una planta
- **THEN** el resultado es indistinguible del alta equivalente por el API: mismos códigos, estado inicial, valores por defecto y eventos

### Requirement: Errores por fila y archivo de errores

Cada fila SHALL llevar su **número en el archivo** (la primera de datos es la 2, contando la cabecera), un **identificador legible** y **todos sus motivos**, no solo el primero. Ningún dato SHALL descartarse sin decirlo: lo que se ignora (columnas, códigos) SHALL ser un aviso. `POST /imports/{kind}/errors` SHALL devolver un CSV descargable (ADR-017: UTF-8 con BOM, CRLF, nombre fechado `cactify-errores-<tipo>-AAAA-MM-DD.csv`, celdas de texto neutralizadas) con **las filas con error o aviso del archivo, con sus columnas originales** más **Fila**, **Resultado** y **Motivo**, de modo que se corrija y se vuelva a cargar. Sin filas con error ni aviso SHALL responder `204`.

#### Scenario: Varios motivos en una fila

- **WHEN** una fila tiene la especie inexistente y una etiqueta inexistente
- **THEN** su entrada trae los dos motivos

#### Scenario: Descargar el archivo de errores

- **WHEN** se piden los errores de un archivo con 5 filas con error y 12 con aviso
- **THEN** se descarga un CSV con esas 17 filas, sus columnas originales y las tres columnas añadidas, que se puede corregir y volver a revisar

#### Scenario: Una fórmula en un apodo

- **WHEN** una fila con error tiene un apodo que empieza por `=`
- **THEN** la celda del archivo de errores lleva el apóstrofo de la neutralización

#### Scenario: Sin nada que descargar

- **WHEN** el archivo no tiene filas con error ni aviso
- **THEN** la respuesta es `204`

### Requirement: Plantillas

`GET /imports/templates/{kind}` SHALL devolver la plantilla CSV del tipo —solo la cabecera, con todas las columnas del formato en el orden de la exportación y la marca de orden de bytes—, de modo que **la plantilla se puede cargar** con filas añadidas y la exportación del mismo tipo comparte nombres de columna con ella. Un tipo desconocido SHALL responder `404`.

#### Scenario: Descargar la plantilla de plantas

- **WHEN** se pide la plantilla de plantas
- **THEN** se obtiene un CSV con solo la cabecera y todas las columnas del formato

#### Scenario: Una plantilla vacía no se importa

- **WHEN** se revisa la plantilla tal cual
- **THEN** la respuesta es `400` por no traer filas

### Requirement: Historial de importaciones

Cada `POST /imports/{kind}` SHALL registrar **una importación** con su tipo, el nombre del archivo, su **resultado** (`aplicada` o `rechazada`), las filas totales, creadas, con aviso y con error, y su instante (el del reloj del sistema). Las revisiones NO SHALL registrarse. `GET /imports` SHALL devolverlas **paginadas** (ADR-009) de la más reciente a la más antigua. Un archivo inservible (`400`, `413`, `422` por tamaño) NO SHALL registrarse: no llegó a ser una importación. No se registra quién la hizo, porque no hay usuarios.

#### Scenario: Una importación aplicada

- **WHEN** se aplica un archivo de 248 plantas con 12 avisos
- **THEN** el historial tiene una entrada `aplicada` con 248 filas totales, 248 creadas, 12 con aviso y ninguna con error

#### Scenario: Una importación rechazada

- **WHEN** se intenta aplicar un archivo con 5 filas con error
- **THEN** el historial tiene una entrada `rechazada` con 5 filas con error y ninguna creada

#### Scenario: Las revisiones no cuentan

- **WHEN** se revisa un archivo varias veces
- **THEN** el historial no cambia

#### Scenario: Listar el historial

- **WHEN** se consulta `GET /imports`
- **THEN** la respuesta es una página `PageResponse` con la más reciente primero

### Requirement: El archivo se trata como no confiable

Un archivo SHALL leerse **solo como texto CSV**: nunca se ejecuta ni se interpreta una celda, el nombre del archivo SHALL guardarse **recortado y sin separadores de ruta**, y una celda de texto SHALL recortarse de espacios antes de validarse. Toda celda SHALL someterse a las mismas **longitudes máximas** que el alta. Una celda que empiece por `=`, `+`, `-` o `@` SHALL aceptarse como texto —el sistema la guarda tal cual— y SHALL neutralizarse al exportarse de nuevo.

#### Scenario: Un nombre de archivo malicioso

- **WHEN** se aplica un archivo llamado `../../etc/passwd.csv`
- **THEN** el historial guarda `passwd.csv`

#### Scenario: Un apodo larguísimo

- **WHEN** una celda supera la longitud máxima del campo
- **THEN** la fila es un error con el mismo motivo que daría el alta

#### Scenario: Una celda con espacios

- **WHEN** el apodo trae espacios al principio y al final
- **THEN** se guarda recortado
