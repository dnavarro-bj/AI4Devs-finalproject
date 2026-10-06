# Tasks: ficha-del-ejemplar

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). El esquema y el backend antes que las pantallas.

## 1. Esquema

- [x] 1.1 Escribir los tests del esquema de «Perfil y estado del ejemplar en el esquema»: estado inválido o ausente, mes sin año, mes fuera de rango, año implausible, año sin mes aceptado, procedencia fuera de lista, cambio de estado a sí mismo o con estado inválido, y que las plantas existentes quedan activas. En rojo
- [x] 1.2 Crear `V8__plant_profile_and_status.sql`: columnas de `plant` con `status NOT NULL DEFAULT 'activa'`, la tabla `plant_status_change`, y sus `CHECK` y claves

## 2. Dominio

- [x] 2.1 Escribir los tests de `PlantStatus`: los siete valores, cuáles son finales y la matriz de transiciones completa. En rojo
- [x] 2.2 Escribir los de `PlantOrigin` y de las invariantes de `Plant`: germinación con mes sin año, mes fuera de rango, año implausible, descripción en blanco como ausente. En rojo
- [x] 2.3 Escribir los de `Plant.changeStatus`: transición válida devuelve el cambio y actualiza el estado, inválida no cambia nada, volver de un final exige motivo, el mismo estado se rechaza, y nacer en un final se rechaza. En rojo
- [x] 2.4 Implementar `PlantStatus`, `PlantOrigin`, sus converters, los campos de `Plant` con su validación, `PlantStatusChange` con su identificador tipado y `Plant.changeStatus`

## 3. Ficha ampliada

- [x] 3.1 Escribir los tests de integración de «Ficha ampliada del ejemplar»: alta con la ficha completa, germinación solo con año, mes sin año → `400`, mes fuera de rango, procedencia fuera de lista, alta sin opcionales, edición con reemplazo completo y texto en blanco. En rojo
- [x] 3.2 Ampliar `POST /plants` y `PUT /plants/{id}`, el servicio y los DTO de detalle y listado con los campos nuevos
- [x] 3.3 Comprobar que los tests de edición (T-26) y de códigos siguen en verde

## 4. Estado y su historial

- [x] 4.1 Escribir los tests de integración de «Estado de un ejemplar»: por defecto, estado inicial en curso, nacer en un final → `400`, estado inexistente → `400`, el `PUT` de la ficha ignora el estado, un archivado sigue consultable. En rojo
- [x] 4.2 Escribir los de «Cambio de estado y su historial»: entre en curso, a un final con motivo, motivo opcional, corrección con motivo, corrección sin motivo → `400`, transición no permitida → `409`, mismo estado → `409`, inexistente → `404`, historial ordenado y paginado, y que el código no cambia. En rojo
- [x] 4.3 Implementar `PUT /plants/{id}/status`, `GET /plants/{id}/status-changes`, el repositorio del historial y la traducción de las transiciones inválidas a `409`
- [x] 4.4 Escribir los de «Inventario por estado»: sin filtro solo en curso, un estado final, varios estados, estado inexistente → `400`, combinado con localización y el total que refleja el filtro. En rojo
- [x] 4.5 Implementar el filtro `status` repetible y el comportamiento por defecto en `PlantSpecs`, `PlantService` y `PlantController`
- [x] 4.6 Suite completa del backend en verde

## 5. Los tipos y los services del frontend

- [x] 5.1 Comprobar con `curl` la forma real del detalle, el cambio de estado, el historial y los errores `400` y `409`
- [x] 5.2 Escribir los tests de los services: campos nuevos en alta y edición, `changeStatus`, `statusChanges` paginado, filtro `status` repetible y los errores como valor. En rojo
- [x] 5.3 Ampliar los tipos, `plantsApiService` y `usePlants`; añadir la función pura de transiciones permitidas con su test

## 6. Formulario y ficha

- [x] 6.1 Escribir los escenarios del formulario: campos habilitados, el mes deshabilitado sin año, estado inicial solo en el alta, y el error del API sin perder lo escrito. En rojo
- [x] 6.2 Habilitar los campos de `PlantForm` y retirar sus marcas «T-16»
- [x] 6.3 Escribir los de la cabecera: estado real, germinación con mes, solo con año con edad aproximada, sin germinación, y archivado distinguido por texto y forma. En rojo
- [x] 6.4 Mostrar el estado y la germinación reales en `PlantHeader`; borrar `MOCK_STATUS` y la germinación de `MOCK_CONTEXT`
- [x] 6.5 Escribir los del cambio de estado y su historial: solo las transiciones válidas, motivo obligatorio al corregir, rechazo del API, y la lista del más reciente al más antiguo. En rojo
- [x] 6.6 Implementar el diálogo de cambio de estado en la ficha y el historial en la pestaña de datos

## 7. Inventario y localización

- [x] 7.1 Escribir los escenarios del inventario: sin archivados por defecto con forma visible de incluirlos, filtro por estado como filtro aplicado, y estado real en la fila y en la ficha de localización. En rojo
- [x] 7.2 Habilitar el filtro de estado del inventario, mostrar el estado en la tabla y en la ficha de localización y retirar sus marcas

## 8. Cierre

- [x] 8.1 Actualizar `docs/diagramas/modelo-datos-actual.md` y el modelo del `README.md`, y pasar lo hecho de «pendiente» en el borrador de gestión
- [x] 8.2 Anotar en `docs/tickets/T-16-ficha-del-ejemplar-ampliada.md` que se parte en dos changes y cuáles son las decisiones tomadas
- [x] 8.3 Suites completas del backend y del frontend en verde, y comprobación de tokens
- [x] 8.4 Contraste final contra `plant-create`, `plant-detail` y `plants` del prototipo, bloque a bloque, con la lista de lo que se reproduce y lo que sigue marcado con su ticket
