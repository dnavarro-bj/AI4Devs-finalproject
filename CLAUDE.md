# Cactify

Aplicación de administración para coleccionistas de cactus y pequeños viveros que manejan **entre 500 y 2000 ejemplares**: inventario por especie, cuidados y mediciones, planificación del trabajo, alertas y recomendaciones de IA a partir de los rangos de la especie y el historial de cada planta.

Lo construido hasta hoy es el MVP —inventario, lecturas manuales y análisis de IA—. El **alcance final del producto es bastante mayor** y está descrito en [docs/producto/definicion-funcional-y-ux.md](docs/producto/definicion-funcional-y-ux.md): ese documento manda sobre el alcance, y [README.md](README.md) sigue describiendo lo ya construido. Ver [Alcance](#alcance-mvp-construido-y-producto-completo) más abajo antes de dar por cerrado cualquier módulo.

Historial de las conversaciones que originaron el proyecto en [chats/](chats/).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Arquitectura, modelo de datos y API **de lo ya construido** | [README.md](README.md) |
| **Definición funcional y de UX del producto completo** — visión, navegación, módulos, preguntas abiertas y priorización; documento vivo de descubrimiento y fuente del alcance final | [docs/producto/definicion-funcional-y-ux.md](docs/producto/definicion-funcional-y-ux.md) |
| Wireframes navegables de administración (fidelidad media: arquitectura de información, jerarquía y flujos; abre `index.html` en el navegador) | [docs/wireframes/](docs/wireframes/README.md) |
| Historias de usuario (una por archivo; `0.x` = en alcance del MVP, `F.x` = roadmap —ojo: varias `F.x` han pasado a núcleo, ver [Alcance](#alcance-mvp-construido-y-producto-completo)) | [docs/user-stories/](docs/user-stories/README.md) |
| Tickets de trabajo (uno por archivo, `T-01`…`T-26`), organizados en tres bloques: esqueleto de la web, gestión de plantas y organización del trabajo | [docs/tickets/](docs/tickets/README.md) |
| Diagramas: modelo de datos **actual** más dos borradores de su evolución (gestión y tareas), y flujo E2E, en Mermaid | [docs/diagramas/](docs/diagramas/README.md) |
| ADRs — decisiones técnicas transversales (`ADR-NNN`) | [docs/adr/](docs/adr/README.md) |
| Backend | [backend/](backend/) |
| Frontend (Nuxt: `app/pages`, `app/layouts`, `app/components` —con el UI kit en `app/components/ui/`—, `app/composables`, `app/stores`, `app/assets/css`; tests en `test/`) | [frontend/](frontend/) |
| Sistema de diseño: fundamentos, componentes, patrones y tokens (referencia de diseño; la implementación viva está en `frontend/app/`) | [docs/ui-kit/](docs/ui-kit/README.md) |
| Infraestructura local (Docker Compose) | [iac/local/](iac/local/) |

## Stack

* **Backend**: Kotlin + Spring Boot 3 (Spring Web, Spring Data JPA) + PostgreSQL + OpenAI API.
* **Frontend**: Nuxt 4 + Vue 3 + Pinia, con un sistema de diseño propio en CSS gobernado por tokens, sin dependencias de estilo ([ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)).
* **Entidades principales**: `Species`, `Plant`, `CareRecord`, `AIRecommendation`, más los catálogos `Location`, `Tag` y `SoilMix` (ver [docs/diagramas/modelo-datos-actual.md](docs/diagramas/modelo-datos-actual.md); la evolución prevista, en los dos borradores de [docs/diagramas/](docs/diagramas/README.md)). El producto completo añade tareas, fotografías, comentarios, floraciones, movimientos y alertas con ciclo de vida propio, y parte `CareRecord` en mediciones y acciones de cuidado.

### Estructura del backend

Disciplina de capas de [ADR-006](docs/adr/ADR-006-aislamiento-del-dominio.md), `web` → `application` → `domain`, con `infrastructure` implementando los puertos:

```
com.cactify
├── domain           Entidades JPA, identificadores tipados, repos/ (puertos), specs/
├── application      Servicios de caso de uso y dto/ (DTOs de respuesta + PageResponse)
├── infrastructure   persistence/ (interfaces Spring Data) y persistence/converters/
└── web
    ├── controllers    Controllers REST y sus cuerpos de petición
    └── errors         Manejador global de errores y el cuerpo ErrorResponse
```

Reglas que ya están en verde y conviene no romper:

* Los controllers **solo** inyectan servicios de `application`; nunca repositorios ni entidades.
* Los servicios devuelven **DTOs**, nunca entidades: `open-in-view` está apagado y el mapeo tiene que ocurrir dentro de la transacción.
* `domain` no importa tipos de Spring salvo `Specification`, `Page` y `Pageable`.
* Los puertos viven en `domain/repos` y se implementan con una sola interfaz `JpaXRepository : XRepository, JpaRepository<…>` en `infrastructure/persistence`, sin clase adaptadora. La búsqueda por id se llama `findOneById` (`findById` lo ocupa Spring Data devolviendo `Optional`).

### Estructura del frontend

Organización **por features** con capas de orden estricto ([ADR-015](docs/adr/ADR-015-arquitectura-del-frontend.md)), el equivalente de ADR-006 al otro lado:

```
Component → Composable → Service → HTTP
                ↘ Store (solo si es cross-feature)
```

```
frontend/
├── app/            Lo que Nuxt resuelve por convención: pages/, layouts/,
│                   components/ui/ (el kit, ADR-014), assets/css/
└── src/
    ├── features/<dominio>/   components/ composables/ services/ dto/ types/
    │                         mappers/ store/
    └── shared/              services/ (httpClient, errorNormalizer) composables/
                             types/ mocks/ utils/
```

Aliases: `@features`, `@shared`, `@ui`.

Reglas que conviene no romper:

* Un **service** habla con el API y nada más: sin `loading`, sin estado de UI, sin tocar el store.
* Un **composable** es el caso de uso de la pantalla: estado, `loading`, `error` y orquestación. **Nunca** hace HTTP directo.
* Un **componente** no llama al API ni lee el store.
* Un **store** solo existe si el estado es global entre features. Es caché, no lógica.
* Los **errores viajan como valor**: todo service devuelve `ServiceResponse<T>` (`{success, data, error}`) y ninguno lanza. El fallo está en la firma y el composable no puede olvidarlo. `ApiError` sigue existiendo dentro del cliente HTTP; el service lo convierte en `DomainError`.
* Un **DTO nunca llega a un componente**. Los mappers se escriben donde la forma cambia de verdad, no por ritual: si el DTO y el modelo coinciden, se reexporta el tipo.
* Los **datos de ejemplo** viven en `shared/mocks/` tras una bandera y los consume el **service**, nunca un componente. Conectar una pantalla al API es cambiar la bandera, no reescribirla.

Dónde poner algo: ¿lo usa una feature? composable. ¿Varias? store en `shared/`. ¿Habla con el backend? service.

### Convenciones del API

* Los identificadores viajan como **cadena decimal** en todo el JSON, de entrada y de salida ([ADR-008](docs/adr/ADR-008-identificadores-tipados.md)).
* **Todos** los listados van paginados con el envelope `PageResponse` (`content`, `totalElements`, `totalPages`, `pageNumber`, `pageSize`); no existe el listado sin límite, tampoco en los puertos ([ADR-009](docs/adr/ADR-009-paginacion-obligatoria.md)).
* Los errores tienen un cuerpo uniforme `{status, error, message, path}`. Una referencia inexistente o un cuerpo inválido nunca es un `500`.

## Arrancar en local

```bash
cd iac/local
cp .env.example .env   # y ajusta las variables si hace falta
docker compose up --build
```

Levanta PostgreSQL, el backend (`:8080`) y el frontend (`:3005`; dentro del contenedor sigue siendo el 3000). Ver [iac/local/README.md](iac/local/README.md).

## Workflow: spec-driven development con OpenSpec

Todo cambio funcional pasa por un change de [OpenSpec](https://github.com/Fission-AI/OpenSpec) (CLI `openspec`, requiere Node 24: `nvm use 24`). Contexto y reglas del proyecto en [openspec/config.yaml](openspec/config.yaml).

* `openspec/specs/` describe lo **ya construido**; `openspec/changes/` lo que está **en curso**. Las specs se materializan al archivar cada change: no se escriben por adelantado.
* Cada change se deriva de un ticket (`T-XX`) y referencia sus historias de usuario (`0.x`).
* Ciclo por change: `/opsx:propose` → revisión humana de proposal/specs/tasks (`openspec validate <change>`) → `/opsx:apply` → tests en verde → `/opsx:archive`.
* Una rama y una PR por change; el change se archiva en la misma PR que lo implementa.
* Desarrollo con **TDD** ([ADR-005](docs/adr/ADR-005-tdd.md)): los escenarios WHEN/THEN de las specs se escriben como tests antes que el código, también fuera del flujo de OpenSpec.

## Alcance: MVP construido y producto completo

`docs/producto/definicion-funcional-y-ux.md` amplió el alcance previsto muy por encima del MVP. Lo que hay que tener presente al planificar:

* **El objetivo es administrar 500–2000 ejemplares.** Eso descarta soluciones que solo funcionan a pequeña escala: el inventario necesita búsqueda, filtros combinables, ordenación, columnas configurables, selección múltiple, acciones por lote y exportación, no solo paginación.
* **Módulos que todavía no existen y son núcleo**, no roadmap: códigos de inventario estables (`CAT-GRUSS-01`, secuencia por especie, nunca reutilizados), fotografías de especie y de planta, historial unificado de la planta como cronología de eventos, comentarios cronológicos, floraciones reales, estado y ciclo de vida del ejemplar, localizaciones **jerárquicas** con historial de movimientos, **tareas** (agenda, calendario, completar enlazando con el cuidado real), **alertas** con ciclo de vida propio (`Nueva → Revisada → Resuelta | Descartada`), Dashboard operativo, buscador global, grupos dinámicos de especies, importación/exportación CSV y etiquetas QR.
* **Tarea ≠ cuidado, y alerta ≠ tarea.** Una tarea es trabajo pendiente; un cuidado es un hecho ocurrido; una alerta es una incidencia que requiere atención. Completar una tarea crea o enlaza el cuidado; una automatización podrá crear tareas pero **nunca** marcar trabajo como realizado.
* **`CareRecord` no se parte.** El documento de producto (§13) propone separar mediciones de acciones de cuidado; se decidió **no hacerlo**. `CareRecord` es el registro de las condiciones de cultivo —insumos incluidos— y el **riego se queda dentro**: cuando el riego se automatice será un dato observado como cualquier otro, y correlacionar agua entregada contra estrés es una de las razones de ser del producto. Separarlo metería un join en la consulta más caliente del sistema. Lo que sí es una entidad nueva son las **intervenciones** (trasplante, cambio de sustrato, tratamiento, poda): irregulares, humanas y sin unidad común, no son una cantidad en una serie temporal.
* **La numeración `F.x` ya no significa «nunca».** F.1 (localización jerárquica), F.2 (cuidados por lote) y F.3 (cuidados pendientes) están promovidas a núcleo por el documento de producto; varias historias `0.x` se quedan cortas y hay que ampliarlas (§22 del documento).
* **Hay 18 preguntas abiertas** (§24) que deben resolverse antes de convertir cada módulo en un change. No inventes la respuesta: si una tarea depende de una de ellas, pregúntala.

Regla práctica: antes de proponer un change, leer la sección correspondiente del documento de producto y el wireframe de esa pantalla. El MVP no es el destino.

## Estado del proyecto

* **T-01 (`modelo-datos`)**: esquema Flyway, datos semilla y entidades JPA. Archivado.
* **T-02 (`api-crud-plantas`)**: API REST del inventario y de los catálogos — `POST/GET /plants`, `GET /plants/{id}`, `PUT /plants/{id}/tags`, `POST/GET /locations`, `POST/GET /tags`, con filtros combinables por `tag` (repetible, semántica AND) y `location`. Archivado.
* **T-03 (`api-lecturas-cultivo`)**: `POST/GET /plants/{id}/care-records`. Archivado.
* **T-04 (`recomendaciones-ia`)**: generación y consulta de la recomendación de una lectura. Archivado.
* **`catalogo-sustratos`** (abre **T-27**): el catálogo de mezclas de sustrato completo —`POST/GET /soil-mixes`, `GET/PUT/DELETE /soil-mixes/{id}`, con `409` al retirar una mezcla que alguna especie recomienda— más sus dos pantallas y su editor. `GET /species/{id}` pasa a devolver **su mezcla**: `PUT /species/{id}` es reemplazo completo y la exige, así que sin ella la ficha no bastaba para reconstruir la especie y corregir el nombre común la habría cambiado. Eso es lo que desbloquea el editor de especies. Implementado y en verde.
* **T-08 (`api-especies`)**: catálogo de especies completo — `POST/GET /species`, `GET/PUT/DELETE /species/{id}`, con unicidad del nombre científico y `409` al retirar una especie con ejemplares. Ticket abierto por el propio change, porque ninguno cubría el API que T-05 y T-07 dan por hecho. Implementado y en verde.
* Transversales sin ticket, ya archivados: `fechas-y-auditoria` (ADR-010) e `invariantes-de-dominio` (ADR-011).
* **T-05 (`dashboard-frontend`)**: dashboard Nuxt — listado del inventario paginado, alta de planta con selector de especie y sus rangos a la vista, ficha con los cuidados heredados, registro de lecturas y generación del análisis de IA, con estados de carga y error. Añade CORS al backend ([ADR-013](docs/adr/ADR-013-acceso-del-navegador-al-api.md)) y el runner de tests del frontend (enmienda de ADR-005). Implementado y en verde.
* **T-10 (`armazon-navegacion`)**: armazón completo del frontend — navegación lateral en cuatro grupos desde `app/navigation.ts`, buscador global en la barra superior (contra `app/fixtures/search.ts` hasta T-21), cabecera de página, las quince rutas del wireframe declaradas con estado vacío en las doce por construir, y pantalla de dirección desconocida. Tres componentes nuevos del kit: `UiNavGroup`, `UiGlobalSearch` y `UiPageHeader`. Unifica las rutas en inglés (`/plants/nueva` → `/plants/new`). Implementado y en verde.
* **T-09 (`ui-kit-frontend`)**: sistema de diseño del frontend — `tokens.css` y `base.css` como únicas hojas globales, catálogo de componentes en `app/components/ui/` con prefijo `Ui`, armazón en `layouts/default.vue`, galería viva en `/ui-kit` y las pantallas de T-05 reescritas sobre el kit sin cambiar su comportamiento. Añade [ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md). Implementado y en verde.
* **T-10, T-25, T-11 y T-12** cerrados: armazón y navegación, arquitectura por features, y el kit completo (30 componentes). **`esqueleto-plantas`** —primera mitad de T-13— reescribe el inventario, la ficha y el alta sobre el kit, con la composición del wireframe.
* **La ficha de planta es híbrida a propósito**: lo que el API sirve es real —planta, especie, cuidados heredados, **el historial de lecturas**, que existía desde T-03 y nadie consumía, y sus análisis de IA—; lo que no existe sale de `src/features/plants/mocks/` y **se marca en la pantalla**, no solo en el código. Una ficha con datos inventados y sin marcar es indistinguible de una que funciona.
* **Siguiente**: el [backlog reorganizado](docs/tickets/README.md) en tres bloques, en este orden — **bloque 0** (T-10…T-14) el esqueleto completo de la web sobre el UI kit, con las quince pantallas del wireframe y datos de ejemplo; **bloque 1** (T-15…T-21) la gestión de plantas; **bloque 2** (T-22…T-24) tareas, alertas y Dashboard. T-07 (E2E) va al final y **T-06 queda retirado**, repartido entre T-20 y T-23.
* **El UI kit tiene prioridad sobre todo el backend.** Todo patrón que se pueda sacar a componente genérico y reutilizable se saca en el bloque 0, con su test y su muestra en `/ui-kit`. Construir las pantallas es lo que revela lo que al kit le falta.

El frontend ya es una aplicación: `frontend/app/` tiene páginas, layouts, componentes, composables y un store de Pinia, con tests en Vitest (`yarn test`). Los datos se piden **desde el cliente**, no en renderizado de servidor: la URL del API solo es válida en el navegador (ADR-013).

Reglas del frontend que ya están en verde y conviene no romper (detalle en [ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)):

* Ninguna pantalla ni componente declara un color, un radio, una duración o un tamaño tipográfico literal: todo sale de `app/assets/css/tokens.css`, que es copia sin editar de `docs/ui-kit/`. `test/design-tokens.spec.ts` lo vigila, y también que ninguna variable usada falte en los tokens.
* Solo hay dos hojas globales, `tokens.css` y `base.css`; el resto del CSS vive en el `<style scoped>` de su componente.
* Los componentes del kit tienen **un solo elemento raíz** —ni siquiera un comentario suelto en el `<template>`, que convierte el componente en fragmento y se traga los atributos del punto de uso—. `UiField` es la excepción deliberada: `inheritAttrs: false` y los atributos van al control.
* La presentación se compone: si hace falta un patrón nuevo, es un componente del kit con su test y su muestra en la galería, no CSS en la pantalla.
* **El kit son 31 componentes** en `app/components/ui/`: acciones, campos, estado, prioridad, filtro, barra de filtros, panel, tabla, paginación, métrica navegable, resumen de estado, árbol, cronología, agenda, calendario mensual, galería, zona de subida, sección de formulario, rango de meses, barra de proporciones, aviso, diálogo, toast, breadcrumbs, grupo de navegación, pestañas, cabecera de página, búsqueda global, estado vacío, error en línea y etiqueta de ejemplar.
* **Ningún componente consulta el reloj.** La agenda y el calendario reciben la fecha de referencia por prop, igual que el backend inyecta un único `Clock` (ADR-010): un componente que llama a `new Date()` no se puede testear sin congelar el tiempo, y «vencido» es una comparación, no un hecho del universo.
* **`UiStatTile` y `UiSummaryGrid` no son lo mismo.** El primero es la cifra grande y navegable del Dashboard —«12 alertas importantes» abre su listado—; el segundo es el «de un vistazo» de una ficha: cuatro magnitudes en una sola superficie dividida, con el valor como línea compacta («24 °C · 31 %», «Mayo de 2026»), que no es un número. Confundirlos convierte un resumen en un panel de indicadores.
* La cronología **no conoce los tipos de evento del producto**: recibe los tipos y pinta el cuerpo por slot, y un tipo desconocido se muestra con representación de reserva en vez de descartarse.
* **`UiTable` no ordena por sí misma**: emite el criterio y recibe las filas ya ordenadas. Todo listado va paginado (ADR-009), así que solo tiene delante una página; ordenarla en el cliente daría un resultado plausible y equivocado. Su primera columna es la identificativa y **no se puede ocultar**.
* **Las rutas van en inglés** y las declara `app/navigation.ts`, que es el mapa de secciones: añadir una sección es una línea ahí más su página. Los encabezados de grupo agrupan y no navegan.
* Una sección declarada y todavía sin construir monta `PendingSection`, que dice qué ticket la levanta. No simula datos: una tabla de mentira es indistinguible de una pantalla rota.
* `UiGlobalSearch` **recibe** los resultados ya agrupados; quien busca es el layout. Ningún componente del kit accede a datos.
