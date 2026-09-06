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

## Notas sobre la ficha de planta

La ficha es la pantalla más usada del producto y la que más se aparta de lo que dejó T-05, que es una sola columna con nombre, tags, cuidados y formulario. La referencia es la pantalla `plant-detail` del [wireframe](../wireframes/cactify-admin/index.html): cabecera de ejemplar con fotografía, identidad y sus tres acciones; aviso; pestañas (Resumen e historial, Fotografías, Floración, Datos); «De un vistazo» con cuatro métricas; cronología; y columna derecha con recomendación de IA, cuidados efectivos y próximo trabajo.

Decisiones ya tomadas al revisarla:

* **El formulario de lectura va en un diálogo**, no ocupando la columna de forma permanente.
* Las pestañas salen de `UiTabs` y el diálogo de `UiDialog`, que ya están en el kit. «De un vistazo» necesita `UiStatTile` (T-11) y la cronología `UiTimeline` (T-12): la ficha va después de esos dos.
* La cabecera es un componente de la feature, no del kit: es de esta pantalla.
* **Híbrida**: lo que el API ya sirve es real; lo que no —fotografía, código, estado, contexto de exposición y germinación, avisos, tareas, floraciones y los eventos de la cronología que no son lecturas— sale de datos de ejemplo **marcados con el ticket que los sustituye**.

**Hallazgo:** `GET /plants/{id}/care-records` existe desde [T-03](T-03-api-de-lecturas-ambientales.md) y **el frontend nunca lo ha consumido** — `useCareRecords` solo tiene `create`. Hoy la ficha muestra la lectura que acabas de registrar y ninguna anterior, así que la historia [0.5](../user-stories/0.5-consultar-historial-de-cuidados.md) está sin cumplir aunque su API lleve meses en verde. La cronología de lecturas se puede montar ya, sin tocar backend.

## Criterios de aceptación

* Las diez pantallas navegan entre sí y respetan los breadcrumbs de la jerarquía de información, no del recorrido del usuario.
* La ficha de planta muestra cabecera, resumen y cronología, con la etiqueta del ejemplar y su código sin truncar.
* Alta y edición comparten formulario; en edición el código de inventario aparece bloqueado.
* Los tests de T-05 siguen en verde.
* Ninguna pantalla declara CSS que debiera ser un componente del kit.
