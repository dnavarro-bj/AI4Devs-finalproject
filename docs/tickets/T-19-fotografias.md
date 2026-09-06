# T-19 - Fotografías de especies y ejemplares

**Área:** Backend + Frontend
**Historia relacionada:** — (sin escribir; §8 del documento de producto)
**Bloque:** 1 — gestión de plantas

## Descripción

Primera vez que el sistema guarda binarios. Fotografía de portada y galería de referencia en la especie; galería con evolución temporal en el ejemplar, con imágenes que pueden colgar de un evento de su historial.

## Alcance

* Subida durante el alta de un ejemplar y desde su ficha en cualquier momento posterior.
* Texto alternativo, orden configurable e indicador de fotografía principal.
* Fecha de captura cuando se conozca, además de la de subida.
* La fotografía no bloquea el alta si todavía no está disponible.
* Galería con ampliación, sobre los componentes de kit de T-12.

## Criterios de aceptación

* Un ejemplar se crea sin fotografía y admite añadirlas después.
* La galería ordena por fecha y permite ampliar cada imagen.
* Cada imagen tiene texto alternativo y la principal es identificable.

## Pendiente antes de empezar

**Necesita un ADR previo**: formatos, tamaño máximo, miniaturas, metadatos EXIF y privacidad, almacenamiento local o servicio de objetos, y si el borrado es real o conserva referencia histórica (§8.3, §24.12).
