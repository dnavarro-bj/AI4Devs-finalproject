# Tasks: catalogo-localizaciones

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El backend antes que las pantallas. Los tests de integración corren contra PostgreSQL real ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

## 1. Consulta y recuento

- [x] 1.1 Escribir el test del puerto para contar los ejemplares de una localización, incluido el caso de cero. En rojo
- [x] 1.2 Ampliar `LocationRepository` y `LocationService` con la consulta individual y su recuento, e implementar `GET /locations/{id}` con su test de integración: con ejemplares, vacía, e inexistente → `404`

## 2. Corrección del nombre

- [x] 2.1 Escribir el test de corrección: el nombre nuevo se persiste y **los ejemplares que alberga no cambian**; en blanco → `400`; inexistente → `404`. En rojo
- [x] 2.2 Implementar `PUT /locations/{id}` apoyándose en el `rename` que la entidad ya tiene, sin duplicar su validación en el servicio

## 3. Retirada

- [x] 3.1 Escribir el test de retirada: vacía → se acepta; con ejemplares → `409` comprobando además que la localización **y sus plantas** siguen ahí; inexistente → `404`. En rojo
- [x] 3.2 Implementar `DELETE /locations/{id}` comprobando el uso **antes** del borrado, no capturando la violación de clave foránea
- [x] 3.3 Suite del backend en verde

## 4. El service del frontend

- [x] 4.1 Comprobar con `curl` la forma real de las tres operaciones nuevas, incluido el cuerpo del `409`
- [x] 4.2 Escribir el test del service con el cliente doblado, incluidos los caminos de error. En rojo
- [x] 4.3 Ampliar el service de catálogos devolviendo `ServiceResponse` y sin lanzar ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md))

## 5. El catálogo

- [x] 5.1 Escribir los escenarios de «Catálogo de localizaciones», incluidos el estado vacío y el error de carga. En rojo
- [x] 5.2 Crear `app/pages/locations/index.vue` sobre `UiTable`, con el alta, hasta que 5.1 pase

## 6. La ficha

- [x] 6.1 Escribir los escenarios de «Ficha de una localización»: con ejemplares navegables y enlace al inventario filtrado, vacía ofreciendo retirarla, y **lo que falta marcado con su ticket**. En rojo
- [x] 6.2 Crear `app/pages/locations/[id]/index.vue`, listando los ejemplares con el filtro por localización que ya existe desde T-02
- [x] 6.3 Dejar declarados, marcados como maqueta y con su ticket, la jerarquía y las características del espacio (T-18), los movimientos (T-18/T-20) y las tareas del lugar (T-22)

## 7. Administrar

- [x] 7.1 Escribir los escenarios de administración: nombre corregido, retirada confirmada, y **retirada bloqueada por uso que dice cuántos ejemplares hay y ofrece verlos**. En rojo
- [x] 7.2 Implementar corregir y retirar desde la ficha con `UiDialog`, prefiriendo el mensaje del API cuando venga

## 9. El recuento en el listado

- [x] 9.1 Escribir el test del puerto: una página de localizaciones trae el recuento de cada una, y la localización vacía trae cero. En rojo
- [x] 9.2 Implementar la consulta agregada —`LEFT JOIN` con `GROUP BY`, **una sola** para toda la página— y ampliar `GET /locations` con `plantCount`, con su test de integración
- [x] 9.3 Ampliar el test del service y el tipo del frontend con el recuento del listado

## 10. El catálogo como el prototipo

- [x] 10.1 Contrastar `app/pages/locations/index.vue` con la pantalla `locations` del [prototipo](../../../docs/wireframes/cactify-admin/index.html) y anotar bloque a bloque lo que falta
- [x] 10.2 Escribir los escenarios de composición: el mapa es un árbol y no una lista, cada localización dice su carga, el total encabeza el mapa, y los niveles que faltan quedan marcados con T-18 **dentro del mapa**. En rojo
- [x] 10.3 Recomponer el catálogo con `UiTree` para el mapa y tarjetas de zona con `UiProgressBar` para la vista general, sin CSS que debiera ser un componente del kit
- [x] 10.4 Declarar «Requieren atención» con su ticket (T-23), en su sitio del layout

## 11. La ficha como el prototipo

- [x] 11.1 Contrastar `app/pages/locations/[id]/index.vue` con la pantalla `location-detail` y anotar lo que falta
- [x] 11.2 Escribir los escenarios de composición: portada con marca e identidad, métricas como cifras destacadas, y cada hueco marcado **en el bloque que ocupa en el prototipo**. En rojo
- [x] 11.3 Recomponer la ficha: portada, fila de métricas con `UiStatTile`, «Dentro de» y ejemplares en la principal, y características, próximo trabajo y movimientos en la lateral
- [x] 11.4 Si algún patrón del prototipo no está en el kit, sacarlo a componente con su test y su muestra en `/ui-kit` (ADR-014), no resolverlo con CSS de pantalla

  > No hizo falta ninguno: el kit ya tenía `UiTree` (mapa), `UiStatTile` (métricas), `UiProgressBar` (carga), `UiEntityHero`, `UiDetailLayout`, `UiSectionHeader` y `UiEntityCell`. Lo único que queda como CSS de pantalla es la rejilla de tarjetas de zona, que hoy aparece en una sola pantalla; si sale en una segunda, se saca al kit.

## 8. Cierre

- [x] 8.1 Las dos suites en verde, incluido `test/architecture.spec.ts`
- [x] 8.2 `git diff` de los tests existentes mostrando que ninguno se reescribe
- [x] 8.3 Recorrer con la pila levantada: crear una localización, asignarle una planta, comprobar que no se puede retirar y que el enlace lleva al inventario filtrado, moverla en el editor de la planta y retirarla ya vacía

  > Recorrido hecho contra la pila en `docker compose` (alta, ficha con recuento, `409` al retirar en uso, `GET /plants?location=` devolviendo el ejemplar, renombrado sin tocar la planta, y retirada ya vacía). **Mover la planta desde el editor no se pudo comprobar**: el editor no guarda porque `PUT /plants/{id}` todavía no existe —es [T-26](../../../docs/tickets/T-26-api-de-edicion-de-planta.md)—, así que la planta se movió por SQL para llegar al último paso. La tarea daba por hecho un API que aún no está.
- [x] 8.4 `openspec validate catalogo-localizaciones --strict` en verde, y `README.md` y `CLAUDE.md` al día con los endpoints nuevos
- [x] 8.5 Contraste final de las dos pantallas contra su `data-screen` del prototipo, bloque a bloque, con la lista de lo reproducido y lo marcado con su ticket

  > **`locations`** — cabecera con recuento y alta ✔ · mapa del vivero como árbol ✔ (un nivel; los demás marcados T-18 dentro del mapa) · total de la colección ✔ (real, del inventario) · vista general con tarjeta por zona, carga y proporción ✔ (la proporción es sobre la colección; la capacidad orientativa va marcada T-18) · salida al inventario ✔ · «Requieren atención» marcado T-22/T-23 · barra de búsqueda y filtros: **no**, son T-21.
  >
  > **`location-detail`** — portada con marca, identidad, estado y acciones ✔ (código del espacio marcado T-15, ruta marcada T-18) · fila de métricas ✔ (Plantas real y navegable; Sublocalizaciones, Tareas y Alertas marcadas T-18/T-22/T-23) · «Dentro de» marcado T-18 · plantas en la ubicación ✔ con salida al inventario filtrado (columna de estado marcada T-16) · lateral con características T-18, próximo trabajo T-22 y movimientos T-18/T-20 ✔ · «Mover plantas» y «Crear tarea aquí»: **no**, son T-18 y T-22.
