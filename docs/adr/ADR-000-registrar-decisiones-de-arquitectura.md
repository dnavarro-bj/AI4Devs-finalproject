# ADR-000 - Registrar las decisiones de arquitectura

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Origen:** adopción del workflow de spec-driven development

## Contexto

El proyecto sigue spec-driven development con OpenSpec: cada change lleva un `design.md` con sus decisiones técnicas, pero ese documento se archiva con el change. Las decisiones transversales (convenciones que aplican a todos los changes futuros) necesitan un registro permanente, consultable y con su razonamiento, que además la IA pueda leer antes de proponer designs nuevos.

## Decisión

Usamos Architecture Decision Records en `docs/adr/`, un archivo `ADR-NNN-titulo-corto.md` por decisión creado a partir de [template.md](template.md), con las secciones: Estado, Fecha, Origen, Contexto, Decisión, Alternativas consideradas y Consecuencias.

El flujo de trabajo: las decisiones nacen en el `design.md` del change que las necesita; al revisar el change, las transversales se promocionan a ADR y el design pasa a referenciarlas. Los ADRs son inmutables una vez aceptados: si una decisión cambia, se crea un ADR nuevo que supersede al anterior y se anota el cambio de estado en el antiguo. `openspec/config.yaml` mantiene un resumen de una línea por ADR para que la IA los aplique al generar cada artefacto.

## Alternativas consideradas

* **Mantener las decisiones solo en los `design.md` de OpenSpec**: se archivan con el change y obligan a repetir las convenciones en cada design nuevo; descartado (es justo el problema que motiva este registro).
* **Mantenerlas solo como resumen en `openspec/config.yaml`**: el context se inyecta en cada generación y debe ser corto; no captura el porqué ni las alternativas descartadas.
* **Wiki externa al repositorio**: se desincroniza del código y queda fuera de la revisión de PRs.

## Consecuencias

* Las convenciones globales tienen una única fuente con su contexto y alternativas, revisada en PR como el resto del repositorio.
* Los `design.md` quedan más ligeros: referencian ADRs en lugar de repetir decisiones.
* Hay que mantener sincronizados el resumen de `openspec/config.yaml` y el índice de `docs/adr/README.md` al añadir o cambiar el estado de un ADR.
