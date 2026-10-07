# Design: filtros-y-orden-del-inventario

## Contexto

El inventario filtra ya por `location` (+ `includeDescendants`), `tag` (AND), `code` y `status` con `PlantSpecs`, y la tabla ya ordena y oculta columnas en el cliente de `UiTable`. Lo que falta es **texto libre, especie, características de cultivo y un orden honesto**. `GET /plants` y `GET /species` aceptan hoy un `Pageable` de Spring que traduce **cualquier** `sort=<propiedad>` a una propiedad de la entidad: es una puerta abierta (se puede ordenar por una colección, o provocar un `500` con un nombre cualquiera) y `sort=species` ordena por la FK. El frontend ya declara `sort` en su service y la tabla emite el criterio; no hace falta tocar `UiTable`.

El prototipo (`plants`, `species`) y el kit se consultaron antes de decidir: la barra de herramientas, los criterios aplicados y la nota «Mostrando N de M» son los del prototipo; `UiFilterBar`, `UiToolbarField` y `UiTable` ya los cubren.

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Prototipo `plants` | Caja «Código, apodo o especie»; Localización, Especie, Estado, «Más filtros»; columnas configurables; criterios aplicados | Se reproduce completo. «Más filtros» trae exposición, entorno y etiqueta. |
| Prototipo `plants` | Columna «Atención»; barra de selección (Crear tarea, Mover, Etiquetar) | **Se apartan, marcadas**: atención es T-23; la selección masiva es T-22/T-24. |
| Producto §5.1 | Orden por «fecha de última revisión o nivel de atención» | **No disponible, con su ticket** (T-20, T-23). Calcularlo ya desde `care_record` obligaría a redefinirlo cuando llegue la cronología. |
| Prototipo `species` | Filtros Exposición, Temperatura, **Riego**, Crecimiento | Riego **marcado como no disponible**: `wateringGuideline` es texto libre y un filtro sobre él sería una coincidencia de texto presentada como categoría. |
| Prototipo `species` | Fila de grupos de cultivo | Marcada con el change 2; no se simula. |
| Ticket | «Filtros por características de cultivo» | Exposición, entorno, mezcla, temperatura mínima y meses de crecimiento/floración. Las horas de luz y la humedad **no entran**: ningún grupo del prototipo ni del producto (§15.1) los usa todavía. |

## Decisiones

**1. Parámetros planos, claves públicas y `400` ante lo desconocido (→ ADR-016).** Es la convención del proyecto y se promociona a ADR porque la reutilizan los changes 2 y 3 y todo listado futuro (tareas, alertas): un parámetro por criterio; repetible = `OR` dentro del parámetro (`tag` es la excepción histórica, `AND`, y se documenta); varios parámetros = `AND`; criterio sin valor = no filtra; `sort=<clave>,<asc|desc>` con claves públicas **por recurso**; clave, dirección o valor de enumerado desconocidos → `400`. Descartado el cuerpo de búsqueda (`POST /plants/search`): no se puede enlazar ni cachear y obligaría a inventar un formato de vista guardada propio.

**2. El orden se traduce, no se delega.** Un `SortKeys` por recurso (en `domain/specs`, junto a las `Specification`) mapea clave pública → ruta de propiedad (`species` → `species.scientificName`, `location` → `location.name`) y añade el `id` como desempate final. La traducción ocurre **en el servicio**, antes de tocar el repositorio: el controller sigue entregando un `Pageable`, el servicio lo reconstruye con el orden traducido. Una clave fuera del mapa lanza una excepción de petición que el manejador global ya traduce a `400`. Sobre la ruta anidada: `QueryUtils.toOrders` reutiliza el *fetch join* de `withSpeciesAndLocation()` si existe; **se comprueba con un test**, y si Hibernate duplicase el join se ordena con una expresión explícita en la `Specification`.

**3. El texto libre se compone en una sola `Specification`.** `PlantSpecs.byText` hace `OR` de `upper(code)`, `upper(nickname)` y los dos nombres de la especie con `LikePattern.contains`, el mismo escape que ya usa `code`. Para los nombres de la especie **hace su propio `join`**, no usa el `fetch` de `withSpeciesAndLocation()`, porque la consulta de recuento de Spring Data omite el fetch (ver el comentario de esa factoría). `SpeciesSpecs.byText` es el análogo sobre científico, común y código. Sin acentos (decisión de partida): «cactus» no encuentra «cáctus»; se revisará con datos reales, y la salida sería la extensión `unaccent`, no una columna normalizada.

**4. Los meses se resuelven con un `EXISTS` por mes.** `growthMonth=12&growthMonth=1&growthMonth=2` exige que **cada** mes esté cubierto por *algún* periodo `crecimiento` de la especie. Un periodo cubre el mes `m` si `start ≤ end ∧ start ≤ m ≤ end`, o `start > end ∧ (m ≥ start ∨ m ≤ end)` —el que cruza fin de año—. Un `EXISTS` por mes (como `byAllTags` usa una subconsulta) compone con el resto sin joins que multipliquen filas ni obliguen a `DISTINCT`, y la tabla `species_period` ya tiene `species_period_species_idx`. `crecimiento_maximo`, que cae **dentro** del crecimiento, no cuenta aparte.

**5. El estado de la pantalla es la URL.** Un composable `useUrlState` en `shared/composables` lee y escribe un conjunto tipado de parámetros en `route.query` con `router.replace` (no `push`: cada tecla no es una entrada de historial) y **sanea** lo que lee: lo desconocido o inválido se descarta. Es una decisión estructural y no solo de comodidad: una vista guardada del change 2 es **exactamente** esa *query string* más las columnas, así que persistirla es guardar un texto, y exportar el resultado (change 3) reutiliza los mismos parámetros. Los criterios que ya nacían de la URL (`?location=` y `includeDescendants` desde la ficha de localización) pasan por el mismo camino.

**6. El selector de especie carga hasta 500, y se dice.** `max-page-size` es 500 y el catálogo previsto no se acerca; un único `list` con `size=500` alimenta el desplegable. Si el catálogo lo superase, el desplegable truncaría **en silencio**: por eso el composable avisa en consola de desarrollo cuando `totalElements > content.length`, y el siguiente paso sería un selector con búsqueda, no subir el máximo.

**7. Los índices se miden, no se anticipan.** Con 2.000 ejemplares y un `LIKE '%…%'` sobre cuatro columnas la exploración secuencial es del orden de milisegundos. Una tarea siembra 2.000 ejemplares en un test de integración y anota en este documento el tiempo de `q` y de la ordenación por especie. Solo si superan lo razonable se añade una migración con índices (`pg_trgm`); hasta entonces no hay migración, y por eso este change **no reserva número de versión**.

## Riesgos / compromisos

* **`sort` por ruta anidada con *fetch join*.** Si Hibernate emitiese un segundo join o rompiese la paginación, el orden por especie y por localización fallaría; lo cubre el test de orden estable entre páginas (escenario del spec).
* **`q` sensible a acentos.** Es una limitación consciente y visible: la caja no promete tolerancia.
* **Una clave pública es un contrato.** Renombrar una propiedad de la entidad ya no rompe el API —es la razón de la traducción—, pero quitar una clave sí; las vistas guardadas del change 2 dependerán de ellas.
* **`species` con muchos valores en `exposure`/`environment` nulos.** Una especie sin definir **no encaja** en ningún valor concreto: filtrar por «pleno sol» no incluye lo que aún no se ha clasificado. Es lo honesto, pero un inventario sin clasificar parecerá «vacío» al filtrar; la nota «Mostrando N de M» lo hace visible.
