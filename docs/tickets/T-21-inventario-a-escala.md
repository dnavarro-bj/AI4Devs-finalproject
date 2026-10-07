# T-21 - Inventario a escala: búsqueda, filtros y vistas guardadas

**Área:** Backend + Frontend
**Historia relacionada:** [0.11](../user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md)
**Bloque:** 1 — gestión de plantas

## Descripción

Hacer que el inventario aguante entre 500 y 2000 ejemplares sin depender de recorrer páginas a mano, y dar sentido real al buscador global que T-10 dejó montado contra datos de ejemplo.

## Alcance

* Búsqueda global por código y texto sobre plantas, especies, localizaciones y etiquetas, con resultados agrupados por tipo.
* Filtros combinables por especie, localización, etiqueta, estado y características de cultivo.
* Ordenación por código, nombre, especie, localización y fecha de última revisión.
* Columnas configurables y vistas guardadas.
* Agrupación de especies por características mediante filtros guardados, sin duplicar datos.
* Exportación del resultado filtrado.

## Criterios de aceptación

* El buscador global encuentra por código exacto y por texto parcial, y agrupa por tipo.
* Los filtros se combinan y los criterios aplicados se ven y se retiran uno a uno.
* Una vista guardada reproduce filtros, orden y columnas al volver a ella.
* Una especie que deja de cumplir la regla de un grupo dinámico sale de él sin intervención.

## Pendiente antes de empezar

Si hacen falta grupos manuales además de los dinámicos (§24.11), y la convención de cómo se expresan filtros y orden en el API, que hoy no está escrita en ningún ADR.

## Reparto en changes

T-21 se parte en tres changes, en este orden:

1. **`filtros-y-orden-del-inventario`** — **hecho**. Convención de filtros y orden ([ADR-016](../adr/ADR-016-filtros-y-orden-en-los-listados.md)), `q`, especie y rasgos de cultivo en `/plants` y `/species`, orden por claves públicas, estado de la pantalla en la URL.
2. **`vistas-guardadas-y-grupos-de-especies`** — **hecho**. Vistas con nombre (filtros, orden y columnas) y grupos dinámicos de especies. Cierra §24.11: solo grupos dinámicos.
3. **`buscador-global-y-exportacion`** — **hecho**. Buscador global sobre datos reales y exportación CSV del resultado filtrado.

**Fuera del orden por ahora:** «última revisión» (T-20, ya hecho, pendiente de ordenar por ella) y «nivel de atención» (T-23).

## Resolución

**Cerrado** con tres changes: `filtros-y-orden-del-inventario` (sin migración, [ADR-016](../adr/ADR-016-filtros-y-orden-en-los-listados.md)), `vistas-guardadas-y-grupos-de-especies` (migración `V14`) y `buscador-global-y-exportacion` (sin migración, [ADR-017](../adr/ADR-017-exportacion-a-csv.md)). Las decisiones que resolvieron lo pendiente:

* **§24.11:** solo grupos dinámicos, sin grupos manuales. Un grupo es una vista guardada del catálogo y entra o sale sola.
* **Convención del API:** parámetros planos y `sort` con claves públicas, no un cuerpo de búsqueda; una vista guardada es, por tanto, una *query string*.
* **Búsqueda global:** sin endpoint unificado; cuatro consultas con `q` en paralelo, para que cada tipo falle por separado.
* **Exportación:** un `GET` con los filtros del listado, acotado por `EXPORT_MAX_ROWS` (`422`, nunca truncada). La pantalla de importar y exportar y la importación **no** forman parte de este ticket: ver [T-29](T-29-importar-exportar-y-configuracion.md).

Quedó fuera del orden «última revisión» (la cronología ya existe: falta definir qué cuenta como revisión) y «nivel de atención» (T-23).
