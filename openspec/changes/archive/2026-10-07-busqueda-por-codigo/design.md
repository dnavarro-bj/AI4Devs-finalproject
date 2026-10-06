# Design: busqueda-por-codigo

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-inventory/spec.md).

De lo que se parte:

* `PlantSpecs` ya compone filtros como piezas con `Specification` (localización, tags); `GET /plants` los aplica con `.and()`. `PlantService.search` es el sitio natural.
* `SpeciesRepository.findAll(pageable)` no admite filtros; `JpaSpeciesRepository` no ejecuta `Specification`.
* `plant.code` y `species.code` existen, son únicos y están en mayúsculas ([`codigos-de-inventario`](../archive/2026-10-07-codigos-de-inventario/design.md)).
* La búsqueda global (`searchApiService`) resuelve contra un catálogo de ejemplo. `useGlobalSearch` lanza una petición por cada cambio del texto y no descarta respuestas tardías.
* En el inventario, los filtros viven como estado de la pantalla con un `watch` que recarga; la caja «Buscar» está deshabilitada.

## Goals / Non-Goals

**Goals:** llegar a una planta o a una especie escribiendo su código, desde el inventario y desde la barra superior, con datos reales.

**Non-Goals:** los de la propuesta —sin búsqueda por apodo o nombre, sin endpoint unificado, sin relevancia, sin índice—.

## Decisions

### Coincidencia parcial sin distinguir mayúsculas, no prefijo

`upper(code) LIKE '%' || upper(texto) || '%'`.

**Por qué**: quien teclea `gruss` quiere `CAT-GRUSS-01`, y un prefijo no lo encontraría porque el código empieza por `CAT-`. La coincidencia parcial también cubre el prefijo de especie (`CAT-GRUSS-`) y el código entero. Los códigos solo llevan mayúsculas, cifras y guiones, así que comparar en mayúsculas es exacto.

**Alternativa descartada**: exacto o por prefijo. Obliga a escribir el código completo o casi, que es lo que la gente no recuerda.

### El texto se escapa: los comodines son literales

`%` y `_` se escapan con `\` y la consulta declara `ESCAPE '\'`.

**Por qué**: sin escapar, buscar `_` o `%` devolvería todo el inventario, y un texto pegado con uno de ellos daría resultados que no explica nadie. Está en el contrato como escenario.

### Una especificación por filtro, y una pieza compartida de escape

`PlantSpecs.byCodeContaining(text)` y su equivalente `SpeciesSpecs.byCodeContaining(text)` devuelven `null` cuando el texto está en blanco, igual que `byLocation` y `byAllTags`. El escape vive en una función pequeña y probada que ambos usan.

**Por qué**: es la convención del paquete (`null` = «no aplica», componible con `.and()`), y el escape es la parte fácil de equivocar y la que no debe duplicarse.

### Las especies ganan `JpaSpecificationExecutor`

`SpeciesRepository` añade `findAll(spec, pageable)` y su interfaz Spring Data implementa `JpaSpecificationExecutor<Species>`, como ya hace `JpaPlantRepository`. El listado sin filtro sigue usando el mismo camino con una especificación nula.

**Por qué**: es el mecanismo que ya usa el inventario; añadir una consulta a mano para un solo filtro sería una segunda forma de hacer lo mismo.

### El retardo vive en un composable compartido

`useDebouncedRef` (en `shared/composables`) entrega el valor tras una pausa. Lo usan la caja del inventario y la búsqueda global.

**Por qué**: son dos pantallas con el mismo problema —una petición por tecla— y la solución duplicada acabaría con dos retardos distintos. ADR-015: lo que usan varias features sube a `shared`.

### La búsqueda global descarta lo obsoleto con un contador

Cada búsqueda lleva un número de secuencia; al volver su respuesta solo se aplica si sigue siendo la última.

**Por qué**: con retardo y red irregular, dos peticiones pueden cruzarse, y el diálogo acabaría mostrando resultados de un texto que ya no está en la caja. Es más simple y fiable que cancelar peticiones, y no exige que el cliente HTTP admita cancelación.

### Plantas y especies reales; localizaciones y etiquetas, ejemplo y marcadas

`searchApiService.search` lanza **dos** peticiones paralelas (`/plants?code=` y `/species?code=`, con un tamaño de página pequeño) y las agrupa; las localizaciones y las etiquetas siguen saliendo del catálogo de ejemplo, **con `· ejemplo` en su detalle**. Se borran del catálogo de ejemplo las plantas y las especies.

**Por qué**: mezclar resultados reales con inventados sin distinguirlos es el error que el bloque 0 evita en cada pantalla. Si falla una de las dos peticiones, esa sección desaparece pero la otra se muestra: la búsqueda no tiene por qué ser todo o nada.

**Alternativa descartada**: esperar a T-21 y un endpoint único. Dejaría la búsqueda por código —que es lo que cierra T-15— sin entregar, y el endpoint único no cambia la forma de los resultados que consume el diálogo.

### La caja del inventario busca por código y lo dice

La caja pasa de maqueta a real, con el texto de ayuda «Código · apodo y especie llegan con T-21». El filtro aparece como filtro aplicado, con su botón de quitar, igual que los demás.

**Qué se aparta del prototipo**: el prototipo promete buscar por «código, apodo o especie». Aquí solo el código, y la caja lo declara en vez de parecer un buscador completo. Es la misma decisión que en el resto de pantallas con huecos.

## Risks / Trade-offs

* **Una coincidencia parcial recorre la tabla** → con 2000 plantas es inmediato y el listado ya está paginado. Si T-21 mide un problema, ese ticket decide el índice.
* **Dos peticiones por búsqueda global** → baratas, paralelas y con página pequeña. El endpoint unificado de T-21 las reducirá a una.
* **La búsqueda global de plantas por apodo deja de «funcionar»** → funcionaba solo con datos inventados. Ahora no encuentra por apodo hasta T-21, y se declara en el diálogo.
* **Texto largo o con caracteres raros** → se escapa y se acota; un código no tiene más de 30 caracteres, así que un texto mayor no puede coincidir y devuelve vacío.

## Contraste final con el prototipo

Hecho en el navegador sobre la aplicación levantada, con el backend desplegado.

* **plants**: se reproduce la caja de búsqueda del inventario, ahora real: escribir `mammi` deja las dos plantas `CAT-MAMMI` y aparece el filtro aplicado «Código: mammi» con su botón de quitar. Se aparta del prototipo en que **solo busca por código** (el prototipo promete «código, apodo o especie»): lo dice el propio texto de la caja, con T-21 para el resto.
* **Búsqueda global**: escribir `gruss` muestra, agrupadas, las plantas reales `CAT-GRUSS-01` y `-02` con su apodo y localización, y la especie `CAT-GRUSS` con su nombre científico. Las localizaciones y etiquetas siguen siendo ejemplo y llevan «· ejemplo» en su detalle.
