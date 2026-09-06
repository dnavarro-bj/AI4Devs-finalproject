# T-13 - Esqueleto de las pantallas de gestión

**Área:** Frontend
**Historia relacionada:** [0.1](../user-stories/0.1-registrar-cactus.md), [0.3](../user-stories/0.3-consultar-recomendaciones-por-especie.md), [0.6](../user-stories/0.6-registrar-especie-y-cuidados-recomendados.md), [0.8](../user-stories/0.8-registrar-mezcla-de-tierra.md), [0.9](../user-stories/0.9-registrar-localizacion.md), [0.10](../user-stories/0.10-etiquetar-cactus-con-tags.md), [F.1](../user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md)
**Bloque:** 0 — esqueleto de la web

## Descripción

Construir, compuestas sobre el kit, las pantallas de la colección y de los catálogos que el prototipo define: inventario, ficha de planta, especies y su ficha, localizaciones y su ficha, mezclas de sustrato y etiquetas, con sus formularios de alta y edición.

Se construyen **contra datos de ejemplo**, no contra el API. El objetivo es fijar la arquitectura de información y descubrir lo que al kit todavía le falta, que es más barato ahora que después de haber construido el backend.

## Alcance

* `plants`, `plant-detail`, `species`, `species-detail`, `locations`, `location-detail`, `soil-mixes`, `soil-mix-detail`, `tags`, `tag-detail`.
* Formularios de alta y edición de planta, especie, localización y mezcla, compartiendo formulario entre alta y edición (§5.4).
* Las pantallas de T-05 que ya existen (`/plants`, `/plants/nueva`, `/plants/{id}`) se absorben en las nuevas sin perder su comportamiento actual ni sus tests.
* Todo patrón que aparezca en dos pantallas sale al kit con su test y su muestra, no se copia.

## Criterios de aceptación

* Las diez pantallas navegan entre sí y respetan los breadcrumbs de la jerarquía de información, no del recorrido del usuario.
* La ficha de planta muestra cabecera, resumen y cronología, con la etiqueta del ejemplar y su código sin truncar.
* Alta y edición comparten formulario; en edición el código de inventario aparece bloqueado.
* Los tests de T-05 siguen en verde.
* Ninguna pantalla declara CSS que debiera ser un componente del kit.
