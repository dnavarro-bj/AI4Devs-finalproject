# Proposal: catalogo-localizaciones

**Tickets:** la parte de localizaciones de [T-13](../../../docs/tickets/T-13-esqueleto-de-las-pantallas-de-gestion.md); prepara [T-18](../../../docs/tickets/T-18-localizaciones-jerarquicas.md)
**Historias:** [0.9](../../../docs/user-stories/0.9-registrar-localizacion.md), [F.1](../../../docs/user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md) (solo lo que no es jerarquía)

## Why

La localización es el catálogo que más se usa —toda planta tiene una, obligatoria— y el que menos API tiene junto a las etiquetas: `LocationController` solo sabe **crear y listar**.

Eso deja tres agujeros que se ven en cuanto se construye la pantalla:

* **No hay ficha.** Para saber qué hay en el Invernadero 1 no existe ningún endpoint; el inventario filtra por localización (`GET /plants?location=`) pero nadie puede consultar la localización en sí.
* **No se puede corregir un nombre.** La entidad `Location` **ya tiene `rename`** desde el change de invariantes de dominio, con su validación. Nunca se ha expuesto.
* **No se puede retirar** una localización que sobra, ni saber si se puede.

El wireframe define el catálogo y su ficha, y ninguno de los dos se sostiene con lo que hay. Es el mismo hallazgo que en mezclas y etiquetas, y el tercero de esta serie.

## What Changes

**Backend** — completar el catálogo sin tocar la jerarquía:

* `GET /locations/{id}`, con el número de ejemplares que alberga.
* `PUT /locations/{id}` para corregir el nombre, apoyándose en el `rename` que la entidad ya tiene.
* `DELETE /locations/{id}`, que responde **`409`** si la localización tiene ejemplares: es la misma regla que retirar una especie en uso.
* El puerto `LocationRepository` gana consultar el uso y retirar; no se reescribe.

* `GET /locations` gana el **recuento por fila**, resuelto en una sola consulta agregada. Sin él, el mapa del vivero del prototipo no dice nada: una localización sin su carga es un nombre suelto.

**Frontend** — las dos pantallas del prototipo, con **su composición**, no solo con sus datos:

* `/locations` — la pantalla `locations`: cabecera con el recuento y el alta, **mapa del vivero** como árbol recorrible a un lado, y **vista general** al otro con una tarjeta por localización, su carga y su proporción ocupada, más la salida al inventario completo.
* `/locations/[id]` — la pantalla `location-detail`: portada con la marca del espacio, su identidad y sus acciones; **fila de métricas**; columna principal con lo que contiene y los ejemplares que alberga; y columna lateral con características, próximo trabajo y últimos movimientos.

Lo que el prototipo muestra y el API todavía no sirve —los niveles de la jerarquía y la ruta completa, el código del espacio, las características, el histórico de movimientos, las tareas y las alertas— **va marcado en la pantalla** con su ticket ([T-15](../../../docs/tickets/T-15-codigos-de-inventario.md), [T-18](../../../docs/tickets/T-18-localizaciones-jerarquicas.md), [T-22](../../../docs/tickets/T-22-tareas.md), [T-23](../../../docs/tickets/T-23-alertas.md)) **y en el sitio del layout que le corresponde**, no omitido ni simulado en silencio.

La composición se reproduce aunque falte la mitad de los datos: es lo mismo que se corrigió en mezclas con [`sustratos-como-el-wireframe`](../archive/2026-09-07-sustratos-como-el-wireframe/proposal.md). Los datos correctos en una composición equivocada son una pantalla mal entregada.

**No hace falta migración.** La tabla `location` existe desde `V1__schema.sql` y este change no cambia el esquema.

## Capabilities

### Modified Capabilities

- `catalogs`: el catálogo de localizaciones gana consulta individual con uso, corrección del nombre y retirada protegida.
- `plant-dashboard`: se añaden el catálogo de localizaciones y su ficha.

## Non-goals

* **La jerarquía es T-18**, entera: ni padre, ni hijos, ni ruta completa, ni mover una localización dentro de otra. Este change deja el catálogo plano que el esquema tiene hoy. Lo que sí reproduce es **la composición** del prototipo: el mapa existe, con un solo nivel y el hueco de los demás marcado.
* **Las alertas y el trabajo de la vista general son T-22 y T-23**: el bloque «Requieren atención» del prototipo se declara, no se rellena.
* **No se impone unicidad del nombre.** El esquema no la tiene, y con la jerarquía el nombre pasará a ser único dentro de su padre y no globalmente; imponerla ahora sería una restricción que habría que retirar.
* No se mueven plantas entre localizaciones desde aquí: el movimiento es un evento de la cronología (T-18, T-20).
* No se describen las características del espacio —cubierto, orientación, sombreo—: son de T-18.
* No se toca el esquema.

## Impact

* `backend/` — `domain/repos/LocationRepository.kt` ampliado, `application/LocationService.kt` y sus DTOs, `web/controllers/LocationController.kt`. Tests de integración con Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).
* `frontend/src/features/catalogs/` — el service de localizaciones crece con las operaciones nuevas.
* `frontend/app/pages/locations/` — las dos pantallas.
* Sin cambios en el esquema ni en la infraestructura.
