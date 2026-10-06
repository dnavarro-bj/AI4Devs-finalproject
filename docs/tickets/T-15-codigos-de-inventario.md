# T-15 - Códigos de inventario de especie y ejemplar

**Área:** Backend + Frontend
**Historia relacionada:** — (sin escribir; §6 del documento de producto)
**Bloque:** 1 — gestión de plantas

## Descripción

Dar a especies y ejemplares una identidad legible, estable e imprimible: `CAT-GRUSS` para la especie y `CAT-GRUSS-01` para el ejemplar. Es el primer ticket del bloque porque el código aparece en casi todas las pantallas ya esqueletadas y lo necesitan la búsqueda, las etiquetas físicas y el QR.

## Alcance

* `code` único en `Species`, **obligatorio al dar de alta y escrito por quien la da de alta** (no se propone), y corregible mientras la especie no tenga ejemplares.
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

## Se implementa en dos changes

1. **`codigos-de-inventario`** — hecho: esquema (`V7`) con relleno de lo existente, código de especie y de ejemplar, generación segura con bloqueo de fila, inmutabilidad, y los códigos reales en las pantallas.
2. **`busqueda-por-codigo`** — hecho: `?code=` en `GET /plants` y `GET /species` (coincidencia parcial, sin distinguir mayúsculas, texto literal), la caja de búsqueda del inventario y el buscador global con plantas y especies reales.

**El ticket queda cerrado.** Lo que no cubre —buscar por apodo o nombre, un endpoint de búsqueda unificado, la relevancia y los índices— es de [T-21](T-21-inventario-a-escala.md).

## Decisiones tomadas

* El código de una especie con ejemplares **no se puede cambiar** (§24.2).
* El código de especie es **obligatorio y escrito a mano**: no se genera (§24.1).
* El código del ejemplar es **inmutable** y no se regenera al cambiarle la especie.
* El código de las **localizaciones** (`LOC-···` del prototipo) queda fuera de este ticket; se hará más adelante.
