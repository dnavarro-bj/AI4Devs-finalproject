# T-27 - API del catálogo de mezclas de sustrato

**Área:** Backend
**Historia relacionada:** [0.8](../user-stories/0.8-registrar-mezcla-de-tierra.md)
**Bloque:** 1 — gestión de plantas. **Va antes de la pantalla del catálogo** del bloque 0, que hoy no tiene contra qué hablar.

## Descripción

La mezcla de sustrato es la única entidad del MVP **sin ningún endpoint**. La tabla `soil_mix` existe desde [T-01](T-01-modelo-de-datos-de-plantas-y-lecturas.md), con sus restricciones de composición en la base de datos; la entidad JPA tiene sus invariantes de dominio ([ADR-011](../adr/ADR-011-invariantes-de-dominio.md)); y `SoilMixRepository` solo declara `findOneById`, con un comentario que dice justamente esto: *no es el catálogo de mezclas, que no tiene endpoints todavía*.

Es decir: la historia [0.8](../user-stories/0.8-registrar-mezcla-de-tierra.md) está **entera sin cumplir**, aunque su modelo de datos lleve meses en verde. Ni siquiera se puede crear una mezcla si no es por SQL.

**Lo destapó el change `catalogo-sustratos`** al construir la pantalla del catálogo, igual que [T-08](T-08-api-del-catalogo-de-especies.md) y [T-26](T-26-api-de-edicion-de-planta.md) en su momento.

## Alcance

* CRUD completo del catálogo: alta, listado paginado ([ADR-009](../adr/ADR-009-paginacion-obligatoria.md)), consulta individual, corrección y retirada.
* La composición se valida en el dominio, no solo en la base de datos: los porcentajes suman exactamente 100 y el pH está en rango. Una composición incoherente responde `400`, nunca `500`.
* Retirar una mezcla **en uso** por algún ejemplar responde `409`, como el catálogo de especies.
* El puerto `SoilMixRepository` crece con lo que el caso de uso necesita; no se reescribe.

## Criterios de aceptación

* Se puede dar de alta una mezcla con su composición y consultarla después.
* Una composición que no suma 100 responde `400` con el cuerpo de error uniforme.
* Retirar una mezcla usada por un ejemplar responde `409` y la mezcla sigue existiendo.
* El listado va paginado y la pantalla del catálogo deja de usar datos de ejemplo.

## Notas

* No hace falta migración: la tabla y sus `CHECK` existen desde `V1__schema.sql`.
* La asociación de una mezcla a un ejemplar concreto es de [T-16](T-16-ficha-del-ejemplar-ampliada.md); aquí solo se administra el catálogo.
