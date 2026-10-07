# ADR-016 - Filtros y orden en los listados

**Estado:** Aceptado
**Fecha:** 2026-10-07
**Origen:** change `filtros-y-orden-del-inventario` (T-21)

## Contexto

Cada listado nuevo ha inventado la forma de sus filtros: `location`, `tag` (repetible, AND), `code`, `status` (repetible). Y el orden se delega por completo en el `Pageable` de Spring, que traduce **cualquier** `?sort=<propiedad>` a una propiedad de la entidad: una puerta abierta (se puede ordenar por una colección o provocar un `500` con un nombre cualquiera) y un contrato frágil, porque renombrar una propiedad rompe el API. Además `sort=species` ordena por la clave de la FK, no por el nombre: ordena plausible y mal.

A 500–2000 ejemplares, y con vistas guardadas y exportación en camino, el producto necesita **un lenguaje único, serializable y estable** para filtrar y ordenar. Las vistas guardadas serán, literalmente, una *query string*.

## Decisión

**Parámetros planos.** Un parámetro por criterio, con el nombre del criterio en inglés y camelCase (`q`, `code`, `location`, `species`, `exposure`…). No hay cuerpo de búsqueda.

* **Repetible = cualquiera de los valores (`OR`).** `?species=a&species=b` admite las dos especies. La excepción histórica es `tag`, que es `AND` (la planta debe tener todas), y así se mantiene y se documenta.
* **Varios parámetros = `AND`.**
* **Sin valor o en blanco = no filtra.**
* **Texto libre (`q`)**: coincidencia parcial, sin distinguir mayúsculas, con `%` y `_` como texto literal (`LikePattern`); no distingue acentos hasta que haya evidencia de que molesta.
* **Un valor que no se puede interpretar es `400`**: un enumerado fuera de lista, un identificador mal formado, un mes fuera de 1–12. Un identificador bien formado que no existe **no es un error**: da un resultado vacío.

**Orden con claves públicas.** `sort=<clave>,<asc|desc>`, repetible. Cada recurso declara su lista de claves públicas (`SortKeys`) y la traduce a la ruta de la entidad (`species` → `species.scientificName`); lo que no esté en la lista, una dirección distinta de `asc`/`desc` o una clave de orden ajena responde `400`. El identificador se añade al final como desempate, de modo que el orden es siempre total y estable entre páginas. Sin `sort` se conserva el orden por defecto del recurso (`@SortDefault`, ADR-009). La traducción ocurre en el servicio, antes de tocar el repositorio.

**Una clave pública puede ordenar por varias propiedades**: `SortKeys` admite que una clave mapee a una lista de rutas con la misma dirección (en las tareas, `due` ordena por el fin del periodo y, a igualdad, por su inicio). La clave sigue siendo una, pública y estable; qué propiedades la componen es detalle del recurso. Se añadió con las tareas (T-22).

**Una clave pública es un contrato**: quitarla rompe a quien la use (vistas guardadas incluidas); renombrar una propiedad de la entidad, no.

## Alternativas consideradas

* **Cuerpo de búsqueda (`POST /plants/search`).** Más expresivo (`OR` anidados, rangos), pero no se puede enlazar, la respuesta no es cacheable y obligaría a inventar un formato propio para las vistas guardadas. Descartada.
* **Dejar el `sort` de Spring tal cual.** Cero código, pero es la puerta abierta de arriba y ordena mal por relaciones.
* **Un lenguaje de filtros (RSQL, `filter=a:eq:b`).** Potente, y una dependencia y un parser más que mantener para necesidades que hoy son una docena de criterios planos.

## Consecuencias

* Más fácil: guardar una vista es guardar una *query string*; exportar el resultado es la misma consulta con otro formato; un cliente no puede provocar un `500` ordenando por una propiedad cualquiera.
* Más difícil: cada criterio nuevo se declara explícitamente (un parámetro, su `Specification` y su validación); cada recurso mantiene su lista de claves de orden.
* El `OR` entre valores repetidos se queda corto para «A o B pero no C» (no hay negación): si hace falta, es un criterio nuevo, no un lenguaje nuevo.
