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
* **Frontend**: Nuxt 3 + Vue 3 + Pinia.
* **Entidades principales**: `Species`, `Plant`, `CareRecord`, `AIRecommendation` (ver [docs/diagramas/modelo-datos.md](docs/diagramas/modelo-datos.md)).

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

Solo hay documentación y esqueleto de infraestructura (Dockerfiles, docker-compose). Backend y frontend aún no tienen código de aplicación. OpenSpec está inicializado; aún no hay changes ni specs.
