# Proposal: api-crud-plantas

**Ticket:** [T-02 - API CRUD de plantas](../../../docs/tickets/T-02-api-crud-de-plantas.md)
**Historias relacionadas:** [0.1](../../../docs/user-stories/0.1-registrar-cactus.md), [0.9](../../../docs/user-stories/0.9-registrar-localizacion.md), [0.10](../../../docs/user-stories/0.10-etiquetar-cactus-con-tags.md), [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md)

## Why

Tras `modelo-datos` (T-01) el backend tiene esquema y entidades JPA, pero ni una sola vía de entrada: no existe capa web y nada del sistema es utilizable todavía. Este change abre el inventario —crear plantas, consultarlas, etiquetarlas y filtrarlas— que es el primer eslabón del flujo E2E y el prerrequisito de T-03 (lecturas, que cuelgan de una planta) y de T-05 (dashboard, que consume estos endpoints).

## What Changes

* Se añade la **capa web** al backend: `spring-boot-starter-web` y `spring-boot-starter-validation`, con la estructura de paquetes `web` → `application` → `domain`/`infrastructure` que fija [ADR-006](../../../docs/adr/ADR-006-aislamiento-del-dominio.md).
* **Inventario de plantas**:
  * `POST /plants` — crea una planta con `nickname`, `locationId` y `speciesId`.
  * `GET /plants` — lista el inventario **paginado**; admite los filtros opcionales `tag` (repetible, semántica **AND**: la planta debe tener todos los tags indicados) y `location`, combinables entre sí.
  * `GET /plants/{id}` — detalle de una planta, incluyendo los datos de cuidado heredados de su especie y sus tags asignados.
  * `PUT /plants/{id}/tags` — reemplaza el conjunto completo de tags de una planta a partir de IDs de tags ya existentes.
* **Catálogos de soporte**: `POST /locations`, `GET /locations`, `POST /tags`, `GET /tags`, con los listados igualmente paginados.
* **Validación y errores controlados**: `nickname` obligatorio y no en blanco; especie, localización y tags referenciados deben existir. Toda referencia inexistente o cuerpo inválido produce una respuesta de error estructurada (400/404), nunca un 500. Se introduce un manejador global de errores para el API.
* **Identificadores tipados**: los `Long` pelados de las entidades de T-01 pasan a tipos propios sobre TSID (`PlantId`, `SpeciesId`, `LocationId`, `TagId`…) mapeados con `@Embeddable`/`@EmbeddedId` sobre la misma columna `BIGINT`, siguiendo la convención del monorepo `hub4fans`. Alcanza a las siete entidades del modelo, no solo a las que este change usa. La entidad `PlantTag` desaparece: `plant_tag` es una tabla de unión pura y pasa a mapearse como el `@ManyToMany` entre `Plant` y `Tag`, igual que `post_tags` en ese mismo monorepo. La tabla no cambia. **Sin migración**: las columnas siguen siendo `bigint` con el mismo valor.
* **Contrato de IDs**: los identificadores se serializan y aceptan como **cadenas decimales** en todo el JSON del API, para no perder precisión en el cliente JavaScript; los DTOs los declaran como `String` y la conversión ocurre en el borde (ver `design.md`).
* **Paginación obligatoria en todos los listados** (inventario y catálogos), con la misma forma de respuesta: contenido, total de elementos, total de páginas, número de página y tamaño aplicado. El tamaño de página por defecto (25) y el máximo admitido (500) son configurables.
* Normalización de nombres de tag (recorte de espacios, comparación insensible a mayúsculas) al crear tags, respetando el índice único ya existente en base de datos.

## Capabilities

### New Capabilities

- `plant-inventory`: gestión del inventario de plantas vía API REST — alta de plantas con especie y localización válidas, consulta de listado y de detalle (con cuidados heredados de la especie), asignación de tags y filtrado combinable por tag y localización.
- `catalogs`: catálogos de soporte de localizaciones y tags vía API REST — alta y listado, con nombres de tag únicos y normalizados.

### Modified Capabilities

Ninguna. `data-model` no cambia: este change no toca esquema, migraciones ni invariantes de persistencia; solo consume las entidades ya definidas.

## Non-goals

* Editar (`PUT /plants/{id}`) o borrar plantas, localizaciones y tags: fuera del alcance de T-02, que solo pide crear y consultar. La historia [0.10](../../../docs/user-stories/0.10-etiquetar-cactus-con-tags.md) menciona "editar un cactus" para añadir o quitar tags; eso queda cubierto por `PUT /plants/{id}/tags`, no por una edición general de la planta.
* Lecturas de cultivo y su API (`POST /plants/{id}/care-records`) — T-03.
* Recomendaciones de IA — T-04.
* API de especies y mezclas de tierra (`POST/PUT /species`, `POST/GET /soil-mixes`): el MVP las consume desde los datos semilla; no hay ticket que las pida todavía.
* Frontend — T-05/T-06.
* Autenticación, autorización y multi-usuario: el MVP es monousuario.
* Ordenación configurable desde el cliente: los listados se devuelven en un orden estable definido por el servidor; elegir el criterio queda fuera de T-02.
* Paginación por cursor: la paginación es por índice de página, suficiente para el volumen del MVP.
* Búsqueda de texto libre por nickname o nombre científico (ver notas de [0.11](../../../docs/user-stories/0.11-buscar-cactus-por-tag-o-localizacion.md)).

## Impact

* `backend/build.gradle.kts`: nuevas dependencias `spring-boot-starter-web` y `spring-boot-starter-validation` (el comentario que hoy dice que aún no hay capa web deja de aplicar).
* `backend/src/main/kotlin/com/cactify/`: nuevos paquetes `web` (controllers, DTOs, manejador de errores), `application` (servicios de caso de uso) e `infrastructure` (repositorios Spring Data y converters). El paquete `domain` se amplía con los tipos de identificador, los puertos de repositorio y las specifications, y **sus siete entidades cambian el tipo de su identificador**.
* `SpeciesRepository`, que hoy vive en `domain` extendiendo `JpaRepository` de Spring, se reubica según ADR-006: el puerto se queda en `domain/repos` y la interfaz Spring Data pasa a `infrastructure/persistence` (decisión 2 del `design.md`).
* `backend/src/test/`: nuevos tests de integración de API con MockMvc sobre PostgreSQL real vía Testcontainers ([ADR-004](../../../docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)), escritos antes del código ([ADR-005](../../../docs/adr/ADR-005-tdd.md)).
* `docs/adr/`: se enmienda **ADR-006** (tipos de Spring Data admitidos en `domain`, patrón de puertos y repositorios, DTOs devueltos desde `application`) y se añaden **ADR-007** (enums de dominio y sus converters), **ADR-008** (identificadores tipados y su representación en el API) y **ADR-009** (paginación obligatoria en los endpoints de índice).
* `backend/src/main/resources/application.yml`: nuevas propiedades de tamaño de página por defecto y máximo, sobreescribibles por variable de entorno.
* Contrato público consumido por el frontend en T-05: los IDs viajan como cadenas y los listados llegan paginados.
* Base de datos: sin cambios (ninguna migración nueva).
