# Cactify

Plataforma web para gestionar colecciones de cactus y pequeños viveros: registro de plantas por especie, lecturas de cultivo (manuales en el MVP) y recomendaciones de cuidado generadas por IA a partir de los rangos de la especie y el historial de cada planta.

Contexto y decisiones de producto completas en [README.md](README.md). Historial de las conversaciones que originaron el proyecto en [chats/](chats/).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Descripción de producto, arquitectura, modelo de datos, API | [README.md](README.md) |
| Historias de usuario (una por archivo; `0.x` = en alcance del MVP, `F.x` = fuera de alcance/roadmap) | [docs/user-stories/](docs/user-stories/README.md) |
| Tickets de trabajo (uno por archivo, `T-01`…`T-09`) | [docs/tickets/](docs/tickets/README.md) |
| Diagramas (modelo de datos y flujo E2E, en Mermaid) | [docs/diagramas/](docs/diagramas/) |
| ADRs — decisiones técnicas transversales (`ADR-NNN`) | [docs/adr/](docs/adr/README.md) |
| Backend | [backend/](backend/) |
| Frontend (Nuxt: `app/pages`, `app/layouts`, `app/components` —con el UI kit en `app/components/ui/`—, `app/composables`, `app/stores`, `app/assets/css`; tests en `test/`) | [frontend/](frontend/) |
| Sistema de diseño: fundamentos, componentes, patrones y tokens (referencia de diseño; la implementación viva está en `frontend/app/`) | [docs/ui-kit/](docs/ui-kit/README.md) |
| Infraestructura local (Docker Compose) | [iac/local/](iac/local/) |

## Stack

* **Backend**: Kotlin + Spring Boot 3 (Spring Web, Spring Data JPA) + PostgreSQL + OpenAI API.
* **Frontend**: Nuxt 4 + Vue 3 + Pinia, con un sistema de diseño propio en CSS gobernado por tokens, sin dependencias de estilo ([ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)).
* **Entidades principales**: `Species`, `Plant`, `CareRecord`, `AIRecommendation` (ver [docs/diagramas/modelo-datos.md](docs/diagramas/modelo-datos.md)).

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

Levanta PostgreSQL, el backend (`:8080`) y el frontend (`:3000`). Ver [iac/local/README.md](iac/local/README.md).

## Workflow: spec-driven development con OpenSpec

Todo cambio funcional pasa por un change de [OpenSpec](https://github.com/Fission-AI/OpenSpec) (CLI `openspec`, requiere Node 24: `nvm use 24`). Contexto y reglas del proyecto en [openspec/config.yaml](openspec/config.yaml).

* `openspec/specs/` describe lo **ya construido**; `openspec/changes/` lo que está **en curso**. Las specs se materializan al archivar cada change: no se escriben por adelantado.
* Cada change se deriva de un ticket (`T-XX`) y referencia sus historias de usuario (`0.x`).
* Ciclo por change: `/opsx:propose` → revisión humana de proposal/specs/tasks (`openspec validate <change>`) → `/opsx:apply` → tests en verde → `/opsx:archive`.
* Una rama y una PR por change; el change se archiva en la misma PR que lo implementa.
* Desarrollo con **TDD** ([ADR-005](docs/adr/ADR-005-tdd.md)): los escenarios WHEN/THEN de las specs se escriben como tests antes que el código, también fuera del flujo de OpenSpec.

## Estado del proyecto

* **T-01 (`modelo-datos`)**: esquema Flyway, datos semilla y entidades JPA. Archivado.
* **T-02 (`api-crud-plantas`)**: API REST del inventario y de los catálogos — `POST/GET /plants`, `GET /plants/{id}`, `PUT /plants/{id}/tags`, `POST/GET /locations`, `POST/GET /tags`, con filtros combinables por `tag` (repetible, semántica AND) y `location`. Archivado.
* **T-03 (`api-lecturas-cultivo`)**: `POST/GET /plants/{id}/care-records`. Archivado.
* **T-04 (`recomendaciones-ia`)**: generación y consulta de la recomendación de una lectura. Archivado.
* **T-08 (`api-especies`)**: catálogo de especies completo — `POST/GET /species`, `GET/PUT/DELETE /species/{id}`, con unicidad del nombre científico y `409` al retirar una especie con ejemplares. Ticket abierto por el propio change, porque ninguno cubría el API que T-05 y T-07 dan por hecho. Implementado y en verde.
* Transversales sin ticket, ya archivados: `fechas-y-auditoria` (ADR-010) e `invariantes-de-dominio` (ADR-011).
* **T-05 (`dashboard-frontend`)**: dashboard Nuxt — listado del inventario paginado, alta de planta con selector de especie y sus rangos a la vista, ficha con los cuidados heredados, registro de lecturas y generación del análisis de IA, con estados de carga y error. Añade CORS al backend ([ADR-013](docs/adr/ADR-013-acceso-del-navegador-al-api.md)) y el runner de tests del frontend (enmienda de ADR-005). Implementado y en verde.
* **T-09 (`ui-kit-frontend`)**: sistema de diseño del frontend — `tokens.css` y `base.css` como únicas hojas globales, catálogo completo de componentes en `app/components/ui/` con prefijo `Ui` (acciones, campos, estado, prioridad, filtro, panel, tabla con selección y acciones masivas, aviso, diálogo, toast, breadcrumbs, pestañas, estado vacío, error en línea y etiqueta de ejemplar), armazón en `layouts/default.vue`, galería viva en `/ui-kit` y las pantallas de T-05 reescritas sobre el kit sin cambiar su comportamiento. Añade [ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md). Implementado y en verde.
* **Pendiente**: T-06 (historial y alertas) y T-07 (test E2E).

El frontend ya es una aplicación: `frontend/app/` tiene páginas, layouts, componentes, composables y un store de Pinia, con tests en Vitest (`yarn test`). Los datos se piden **desde el cliente**, no en renderizado de servidor: la URL del API solo es válida en el navegador (ADR-013).

Reglas del frontend que ya están en verde y conviene no romper (detalle en [ADR-014](docs/adr/ADR-014-sistema-de-diseno-del-frontend.md)):

* Ninguna pantalla ni componente declara un color, un radio, una duración o un tamaño tipográfico literal: todo sale de `app/assets/css/tokens.css`, que es copia sin editar de `docs/ui-kit/`. `test/design-tokens.spec.ts` lo vigila, y también que ninguna variable usada falte en los tokens.
* Solo hay dos hojas globales, `tokens.css` y `base.css`; el resto del CSS vive en el `<style scoped>` de su componente.
* Los componentes del kit tienen **un solo elemento raíz** —ni siquiera un comentario suelto en el `<template>`, que convierte el componente en fragmento y se traga los atributos del punto de uso—. `UiField` es la excepción deliberada: `inheritAttrs: false` y los atributos van al control.
* La presentación se compone: si hace falta un patrón nuevo, es un componente del kit con su test y su muestra en la galería, no CSS en la pantalla.
