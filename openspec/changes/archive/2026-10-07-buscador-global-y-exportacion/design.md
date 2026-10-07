# Design: buscador-global-y-exportacion

## Contexto

La búsqueda global la orquesta `useGlobalSearch` (pausa de 200 ms y descarte de respuestas obsoletas por número de secuencia) y `searchApiService`, que pide dos listados por código y mezcla localizaciones y etiquetas de `search.mock.ts`. `UiGlobalSearch` no busca: recibe grupos y emite la selección. El listado del inventario y su validación viven tras `PlantCriteria`/`SpeciesCriteria` (change 2) y el orden tras `SortKeys` (change 1).

**Dependencias:** se aplica tras archivar los changes 1 y 2 de T-21. Sin migración.

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Ticket | «Búsqueda global por código y texto sobre plantas, especies, localizaciones y etiquetas, con resultados agrupados por tipo» | Se cumple entero, sin endpoint nuevo (decisión 1). |
| Ticket | «Exportación del resultado filtrado» | CSV desde las pantallas de listado. |
| Prototipo `transfer` | Panel de exportación con contenido a elegir, XLSX, PDF de etiquetas, «incluir historial», estimación y actividad reciente | **Fuera**: es la pantalla de importar/exportar, sin ticket. Sigue como maqueta marcada. |
| Prototipo `plants`/`species` | La barra de herramientas **no** tiene botón de exportar | Se añade (§5.1 lo pide) en la barra, junto al resto de acciones del estado de la tabla; se apunta como apartarse del prototipo por falta de pieza. |
| Producto §19 | «Inventario completo o el resultado de un filtro» | «Completo» es «sin filtros»; no necesita una opción aparte. |
| Historia 1.19 | «Queda constancia de las operaciones» | Fuera: sin usuarios no hay a quién atribuirla. |

## Decisiones

**1. Cuatro consultas en paralelo, no un endpoint unificado.** Un `GET /search` devolvería los cuatro grupos en una petición y permitiría ordenar por relevancia, pero: crea una superficie nueva con su propio contrato, DTO y paginación (ADR-009 obliga a que cada grupo sea una página), **duplica** los criterios de texto que ya tienen `PlantSpecs`, `SpeciesSpecs` y las dos que se añaden aquí, y hace que un fallo de un tipo tumbe los cuatro —hoy cada tipo falla por separado y es un requisito vigente—. Cuatro peticiones tras una pausa de 200 ms son irrelevantes en coste y se reparten bien. El comentario del service actual anticipaba el endpoint único; se **descarta con este motivo**. Si algún día hace falta ordenar por relevancia entre tipos, se revisa con datos. *Es la decisión que más conviene confirmar al revisar este change.*

**2. `q` en localizaciones y etiquetas, con las mismas piezas.** `LocationSpecs.byText` (nombre y código) y `TagSpecs.byText` (nombre) usan `LikePattern.contains`, el mismo escape que plantas y especies. Son catálogos pequeños: no se tocan índices ni ordenación.

**3. La exportación es el listado sin paginar.** `GET /plants/export` recibe los parámetros de `GET /plants` y los convierte en el **mismo** `PlantCriteria`, así que «misma consulta, otro formato» es cierto por construcción y no por disciplina. El servicio hace primero un `count` con la `Specification`: si supera `EXPORT_MAX_ROWS` lanza `ExportTooLargeException(rows, max)`, que el manejador global traduce a `422` con «N filas superan el máximo de M: afina los filtros». Solo entonces lee. **No se trunca nunca** (la importación del producto dice «sin descartar silenciosamente datos»; aquí es lo mismo al revés).

**4. Se carga en bloques dentro de una transacción de lectura, no en streaming.** Con `open-in-view` apagado, un `StreamingResponseBody` escribe fuera de la transacción y la sesión ya estaría cerrada. Con el máximo en 5.000 filas, leer en páginas de 500 con la misma `Specification`, resolver **las etiquetas de cada bloque con una consulta** (no una por planta) y las **rutas de localización** de una vez (un mapa `id → ruta` con la consulta recursiva que ya usa el catálogo) y escribir el CSV en memoria es trivial. Subir el máximo mucho más allá obligaría a revisar esto: se anota en el ADR.

**5. El CSV lo escribe un componente propio y pequeño (ADR-017).** `CsvDocument` en `application/export`: separador `,`, fin de línea CRLF (RFC 4180), entrecomillado si la celda contiene coma, comilla, CR o LF y comillas dobladas, BOM UTF-8 al inicio (Excel lo necesita para leer los acentos), fechas ISO y números sin formato local. **Neutralización de fórmulas**: solo las celdas de *texto* (apodo, descripción, nombres) que empiezan por `=`, `+`, `-`, `@`, tabulador o CR llevan un apóstrofo delante; los números y las fechas los genera el sistema y no se tocan, de modo que una temperatura mínima de `-5` sigue siendo `-5`. Es un compromiso conocido: el apóstrofo se verá en una descripción que empieza por `-`. Es preferible a que un apodo pueda ejecutar una fórmula en la hoja de quien abre el archivo.

**6. Las columnas del CSV son fijas.** La tabla puede ocultar columnas y reordenarlas, pero el CSV es para trabajar **fuera** de Cactify y le conviene el conjunto completo y estable; si dependiera de la configuración de pantalla, dos exportaciones del mismo filtro serían distintas sin que nadie lo vea. Se documenta como decisión y se deja fuera del alcance.

**7. CORS tiene que exponer `Content-Disposition`.** El navegador no deja leer esa cabecera en una respuesta de otro origen salvo que el servidor la liste en `Access-Control-Expose-Headers`; sin ello el nombre de archivo fechado que fija el servidor **nunca llega** a JavaScript y la descarga se llamaría `download`. Hay que ampliar la configuración de ADR-013 (`WebMvcConfigurer`) y cubrirlo con un test del propio API: es un fallo que solo se ve en el navegador y por tanto el que más fácilmente se escapa.

**8. El cliente HTTP gana una variante binaria.** `httpClient` solo habla JSON. Se añade `getBlob(path, query)` que devuelve `{ blob, filename }` leyendo `Content-Disposition`, y que ante un error normaliza el cuerpo JSON del `422` con el `errorNormalizer` de siempre —un `Blob` de error es el fallo clásico de las descargas: el mensaje llega ilegible—. El service sigue devolviendo `ServiceResponse`. El composable `useExport(kind)` convierte el blob en descarga con un `<a download>` temporal desde `shared/utils/downloadBlob.ts`; **el componente no toca el DOM ni el API**.

**9. El frontend no conoce el máximo.** Duplicarlo (o añadir un endpoint de configuración para publicarlo) crea un segundo sitio donde cambiarlo. El botón declara el alcance con el recuento que la tabla ya tiene («Exportar 486 resultados») y, si el servidor rechaza con `422`, **muestra su mensaje tal cual**, que ya dice cuántas filas son y cuál es el máximo. A cambio, el usuario descubre el límite al pulsar y no antes; con 500–2.000 ejemplares y un máximo de 5.000 es un caso límite.

**10. `UiGlobalSearch` gana `more`.** «Ver los N resultados» es una opción del grupo y entra en el recorrido plano del teclado, igual que las demás; el componente sigue sin saber qué es un grupo del producto. Quien decide si hay más (`totalElements > mostrados`) y construye la URL (`/plants?q=…`) es el service/composable de `search`, y solo para plantas y especies: sus pantallas son las que ya filtran por `q` (change 1).

## Riesgos / compromisos

* **El apóstrofo en el CSV.** Visible en celdas de texto que empiezan por un signo; es el precio de la neutralización.
* **Cuatro peticiones.** Si el catálogo de localizaciones o etiquetas creciese mucho, `q` sin índice recorrería la tabla; son catálogos de decenas a cientos de filas.
* **Memoria en la exportación.** Acotada por `EXPORT_MAX_ROWS`; subirlo exige el streaming de la decisión 4.
* **CORS en producción.** `Content-Disposition` expuesto con CORS abierto (ADR-013) no abre nada que el origen no pudiese ya leer; cuando la lista de orígenes pase a variable de entorno, la cabecera expuesta se queda como está.
* **Excel y UTF-8 con BOM.** Es lo que Excel espera; otras herramientas (`csv` de Python con `utf-8`) verán un carácter invisible en el primer nombre de columna. Se documenta en el ADR.
