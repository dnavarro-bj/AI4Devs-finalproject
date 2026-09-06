# T-15 - Códigos de inventario de especie y ejemplar

**Área:** Backend + Frontend
**Historia relacionada:** — (sin escribir; §6 del documento de producto)
**Bloque:** 1 — gestión de plantas

## Descripción

Dar a especies y ejemplares una identidad legible, estable e imprimible: `CAT-GRUSS` para la especie y `CAT-GRUSS-01` para el ejemplar. Es el primer ticket del bloque porque el código aparece en casi todas las pantallas ya esqueletadas y lo necesitan la búsqueda, las etiquetas físicas y el QR.

## Alcance

* `code` único en `Species`, propuesto a partir del nombre científico y corregible antes de usarse.
* `code` inmutable en `Plant`, compuesto por el de su especie y un secuencial propio de esa especie.
* Generación segura ante dos altas simultáneas: contador en la especie con bloqueo de fila, no `MAX(...)+1`.
* Un número no se reutiliza aunque el ejemplar se archive; el código crece más allá de dos dígitos con naturalidad.
* Búsqueda por código en el buscador global y en el inventario.
* Las pantallas ya construidas dejan de usar datos de ejemplo para el código.

## Criterios de aceptación

* Dos altas simultáneas de la misma especie obtienen códigos distintos y consecutivos.
* El código de un ejemplar no cambia al editarlo, ni al cambiarle la especie.
* Un código liberado por archivar un ejemplar no se vuelve a asignar.
* Buscar por código encuentra el ejemplar.

## Pendiente antes de empezar

Si el código de una especie que ya tiene plantas puede cambiarse (§24.2). La recomendación del documento es que no.
