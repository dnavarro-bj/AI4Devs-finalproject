# F.1 - Organizar cactus por localizaciones jerárquicas

**Tipo:** Must-Have
**Estado:** **Promovida al núcleo** — bloque 1 (era roadmap)
**Ticket:** [T-18](../tickets/T-18-localizaciones-jerarquicas.md)

> Absorbe a [0.9](0.9-registrar-localizacion.md), que describía el mismo catálogo sin jerarquía. Un catálogo plano es esta misma historia con un solo nivel, así que se mantienen como una sola.

## Historia

**Como** propietario de una colección grande
**Quiero** organizar mis cactus mediante localizaciones anidadas (vivero > invernadero > bancada > bandeja)
**Para** gestionar conjuntamente las plantas de una misma zona en lugar de recorrerlas una a una.

## Criterios de aceptación

* Se puede crear una localización indicando un nombre y, opcionalmente, la localización que la contiene.
* Una localización sin padre es una raíz; el catálogo plano actual es el caso de un solo nivel.
* La ruta completa («Invernadero 1 / Bancada norte / Bandeja A3») se muestra en la ficha y en los breadcrumbs.
* La ficha de una localización muestra sus sublocalizaciones, las plantas que contiene y el recuento de plantas directas y de descendientes.
* Se puede seleccionar cualquier localización al registrar o editar un cactus.
* Hacer que una localización descienda de sí misma se rechaza.

## Notas

* Es prerrequisito de los cuidados por lote ([F.2](F.2-registrar-cuidados-por-lote.md)) y de las tareas dirigidas a una zona ([1.11](1.11-dirigir-una-tarea-a-varias-plantas.md)).
* Mover plantas entre localizaciones dejando rastro es una historia aparte ([1.9](1.9-mover-plantas-entre-localizaciones.md)).
* Los datos existentes no se rompen: cada localización actual pasa a ser una raíz o una hoja de la jerarquía.
