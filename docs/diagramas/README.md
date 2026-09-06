# Diagramas

Diagramas en Mermaid. Se renderizan en GitHub y en cualquier visor de Markdown con soporte de Mermaid.

## Modelo de datos

Está separado en tres archivos, en orden de evolución. Cada borrador **incluye** el modelo del anterior.

| Archivo | Qué describe | Cuándo se toca |
|---|---|---|
| [modelo-datos-actual.md](modelo-datos-actual.md) | Lo que hay **hoy en las migraciones**. Describe lo construido, no lo previsto | Al archivar cada change que toque el esquema |
| [borrador-modelo-datos-gestion.md](borrador-modelo-datos-gestion.md) | **Fase 1 — gestión de plantas**: códigos estables, ficha ampliada, herencia de cuidados, localizaciones jerárquicas, fotografías, intervenciones y cronología unificada | Conforme se abran y cierren los tickets de la fase |
| [borrador-modelo-datos-tareas.md](borrador-modelo-datos-tareas.md) | **Fase 2 — organización del trabajo**: tareas, destinos, alertas y su rastro en la cronología | Igual, en su fase |

Son **borradores** a propósito: al abrir cada ticket aparecerán cosas que hoy no se ven, y se corrigen ahí. Cada uno lleva su lista de decisiones tomadas y de preguntas abiertas; las preguntas se responden antes de convertir su bloque en un change, no durante.

El orden importa: la fase de tareas depende de la de gestión —una tarea se dirige a plantas y a localizaciones jerárquicas, y al completarse escribe en la cronología del ejemplar—, mientras que la de gestión no depende de nada de la de tareas.

El alcance del que salen ambos borradores está en [docs/producto/definicion-funcional-y-ux.md](../producto/definicion-funcional-y-ux.md).

## Otros

| Archivo | Qué describe |
|---|---|
| [flujo-e2e.md](flujo-e2e.md) | El flujo principal de extremo a extremo |
