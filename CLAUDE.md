# Cactify

Plataforma web para gestionar colecciones de cactus y pequeños viveros: registro de plantas por especie, lecturas de cultivo (manuales en el MVP) y recomendaciones de cuidado generadas por IA a partir de los rangos de la especie y el historial de cada planta.

Contexto y decisiones de producto completas en [README.md](README.md). Historial de las conversaciones que originaron el proyecto en [chats/](chats/).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Descripción de producto, arquitectura, modelo de datos, API | [README.md](README.md) |
| Historias de usuario (una por archivo; `0.x` = en alcance del MVP, `F.x` = fuera de alcance/roadmap) | [docs/user-stories/](docs/user-stories/README.md) |
| Tickets de trabajo (uno por archivo, `T-01`…`T-07`) | [docs/tickets/](docs/tickets/README.md) |
| Diagramas (modelo de datos y flujo E2E, en Mermaid) | [docs/diagramas/](docs/diagramas/) |
| ADRs — decisiones técnicas transversales (`ADR-NNN`) | [docs/adr/](docs/adr/README.md) |
| Backend | [backend/](backend/) |
| Frontend | [frontend/](frontend/) |
| Infraestructura local (Docker Compose) | [iac/local/](iac/local/) |

## Stack

* **Backend**: Kotlin + Spring Boot 3 (Spring Web, Spring Data JPA) + PostgreSQL + OpenAI API.
* **Frontend**: Nuxt 4 + Vue 3 + Pinia.
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
* **T-02 (`api-crud-plantas`)**: API REST del inventario y de los catálogos — `POST/GET /plants`, `GET /plants/{id}`, `PUT /plants/{id}/tags`, `POST/GET /locations`, `POST/GET /tags`, con filtros combinables por `tag` (repetible, semántica AND) y `location`. Implementado y en verde.
* **Pendiente**: T-03 (lecturas de cultivo), T-04 (recomendaciones de IA), T-05/T-06 (frontend), T-07.

El frontend sigue siendo el esqueleto de Nuxt: aún no tiene código de aplicación.
