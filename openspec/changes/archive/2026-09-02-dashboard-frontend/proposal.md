## Why

El backend del MVP está completo —inventario, catálogos, lecturas de cultivo y recomendaciones de IA— pero no hay una sola pantalla: `frontend/app` sigue siendo el `app.vue` con `NuxtWelcome` que generó el andamiaje de Nuxt. El valor del producto solo es observable a través de la interfaz, y el ticket [T-05](../../../docs/tickets/T-05-dashboard-frontend.md) es el que la construye.

Este change deriva de **T-05 (Dashboard frontend)**. El ticket cita las historias [0.3](../../../docs/user-stories/0.3-consultar-recomendaciones-por-especie.md) (ver los rangos recomendados de la especie) y [0.4](../../../docs/user-stories/0.4-obtener-analisis-de-ia.md) (obtener el análisis de IA), pero su alcance real cubre además —y es aquí donde se cierran de cara al usuario— [0.1](../../../docs/user-stories/0.1-registrar-cactus.md) (registrar un cactus seleccionando especie y localización) y [0.2](../../../docs/user-stories/0.2-registrar-condiciones-de-cultivo.md) (registrar manualmente las condiciones de cultivo). El mapeo se declara explícitamente para que ninguna de las cuatro quede sin pantalla:

| Historia | Dónde se cierra en este change |
|---|---|
| 0.1 Registrar un cactus | Listado de inventario + formulario de alta con selector de especie y de localización |
| 0.2 Registrar condiciones de cultivo | Formulario de lectura en la ficha de la planta (los cinco valores, fecha automática) |
| 0.3 Consultar recomendaciones por especie | Bloque de rangos de la especie en la ficha, visible **antes** de guardar la lectura |
| 0.4 Obtener análisis de IA | Acción de generar y vista de la recomendación (riesgo, explicación, acción, prioridad) con sus estados de carga y error |

## What Changes

* **Andamiaje del frontend**: el proyecto Nuxt pasa de la plantilla vacía a una aplicación con enrutado, capa de acceso al API, stores de Pinia y runner de tests. `frontend/package.json` no tiene hoy `devDependencies` ni script `test`; se añaden. `nuxt.config.ts` ya declara `runtimeConfig.public.apiBaseUrl` y ya carga `@pinia/nuxt`: se reutilizan tal cual, no se redefinen.
* **Listado de inventario** (`/plants`): plantas con su nickname, especie y localización, paginado sobre el envelope `PageResponse` que ya sirve `GET /plants`.
* **Alta de planta**: formulario con nickname, selector de localización (`GET /locations`) y selector de especie con sus rangos recomendados a la vista; envía `POST /plants` con `nickname`, `locationId` y `speciesId`, los tres obligatorios.
* **Ficha de la planta** (`/plants/{id}`): detalle de `GET /plants/{id}` —nickname, localización, tags y los cuidados heredados de la especie (`SpeciesCareResponse`: rangos de humedad, temperatura y horas de luz, más la pauta de riego)—, formulario de nueva lectura (`POST /plants/{id}/care-records`) y bloque de recomendación (`POST` y `GET .../recommendation`). Es la ficha mínima que cierra el flujo; T-06 la amplía con historial y alertas.
* **Flujo continuo sin recarga manual**: alta de planta → ficha → registrar lectura → generar recomendación, con navegación y refresco de estado del lado del cliente.
* **Estados de carga y error**: toda llamada al API tiene estado de carga, y el error se pinta a partir del cuerpo uniforme `{status, error, message, path}`. La generación de la recomendación, que es la lenta y la que puede devolver `502`, nunca deja la interfaz colgada.
* **Tipado del contrato**: los identificadores se tipan como `string` en todo el cliente. Son TSID por encima de `2^53`; como `number` se corrompen en silencio ([ADR-008](../../../docs/adr/ADR-008-identificadores-tipados.md)).
* **CORS abierto en el backend**: el navegador llama al API desde otro origen y hoy no hay configuración de CORS en `backend/src` ni en `application.yml`. Se habilita para cualquier origen. Es una decisión transversal y se promociona a **ADR-013**.
* **Runner de tests de frontend**: [ADR-005](../../../docs/adr/ADR-005-tdd.md) impone TDD pero no distingue frontend de backend. Se elige runner y se enmienda ADR-005 con la elección, igual que T-02 enmendó ADR-006.
* Toda dependencia nueva obliga a **regenerar `yarn.lock`**: el `Dockerfile` del frontend instala con `--frozen-lockfile` y rompe si el lockfile no cuadra con `package.json`.

### Dependencia previa, ya resuelta

El selector de especie necesita el catálogo de especies, que cuando se escribió este change **no existía**: T-02 lo había dejado como Non-goal apoyándose en las semillas de `V2__seed.sql`. Se resolvió en un change previo aparte, **`api-especies` (T-08), ya implementado y archivado**, que publicó `POST/GET /species` y `GET/PUT/DELETE /species/{id}` y cerró enteras las historias 0.3 y 0.6.

Este change se limita a **consumirlo**, y solo necesita sus dos endpoints de lectura. Conviene retener la forma, porque condiciona el formulario de alta: `GET /species` devuelve el resumen (`id`, `scientificName`, `commonName`), y los rangos y la pauta de riego están únicamente en `GET /species/{id}` — el selector se puebla con el primero y pide el segundo al seleccionarse una especie.

## Capabilities

### New Capabilities
- `plant-dashboard`: la interfaz web del inventario — listado de plantas, alta con selector de especie y localización, ficha con los cuidados recomendados de la especie, registro de lecturas y generación y consulta de la recomendación de IA, con sus estados de carga y error.

### Modified Capabilities
- `plant-inventory`: se añade al contrato transversal del API la requirement de acceso desde otro origen (CORS), que hoy no está declarada y sin la cual ningún cliente de navegador puede consumirlo.

## Impact

* **`frontend/`**: `package.json` (dependencias, `devDependencies` y script `test`), `yarn.lock` regenerado, `app/` completo (`app.vue`, `pages/`, `components/`, `composables/`, `stores/`, `types/`), configuración del runner de tests y sus tests. `nuxt.config.ts` se toca solo si el runner lo exige.
* **`backend/`**: únicamente la configuración de CORS. **Sin migraciones**: el esquema no cambia y la última aplicada es `V6__species_constraints.sql`, que llegó con T-08.
* **`docs/adr/`**: nuevo `ADR-013` (acceso del navegador al API) y enmienda a `ADR-005` (runner de tests del frontend). `openspec/config.yaml` se actualiza con el resumen de ADR-013.
* **API consumido, sin redefinirlo**: `GET/POST /plants`, `GET /plants/{id}`, `GET /locations`, `GET /species`, `GET /species/{id}`, `POST/GET /plants/{id}/care-records` y `POST/GET /plants/{id}/care-records/{careRecordId}/recommendation`.
* **`iac/local/`**: solo si la decisión de CORS obliga a tocar variables del `docker-compose.yml`.

## Non-goals

Con las 30 h presupuestadas para el MVP ya mermadas, quedan **fuera** de este change:

* **Historial de lecturas y alertas** en la ficha: son T-06. Aquí la ficha se queda en el flujo mínimo.
* **Tags y filtros**: `PUT /plants/{id}/tags` y los filtros por `tag` y `location` del listado existen en el API, pero no se exponen en la interfaz (los tags sí se **muestran** en la ficha, no se editan).
* **Edición y borrado** de plantas, lecturas o recomendaciones.
* **Autenticación** y cualquier noción de usuario.
* **Overrides de cuidados por ejemplar** (historia 0.7).
* **Pantallas de administración de especies y de mezclas de tierra**: el alta, la edición y el borrado de especies **tienen API** desde T-08, pero no se exponen en la interfaz — no están en los criterios de aceptación de T-05, y el selector solo consume el catálogo. Las mezclas de tierra (historia 0.8) siguen sin API y sin pantalla; el MVP las consume de las semillas.
* **Ambición visual**: interfaz sobria y legible; los estilos y los badges por `riskLevel` se consolidan en T-06.
* **Migraciones de base de datos** y cualquier cambio de esquema o de contrato del API existente.
