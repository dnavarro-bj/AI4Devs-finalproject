# ADR-005 - Desarrollo dirigido por tests (TDD)

**Estado:** Aceptado
**Fecha:** 2026-08-11
**Origen:** definición del workflow de spec-driven development, antes de implementar el primer change (T-01)

## Contexto

El proyecto sigue spec-driven development con OpenSpec: cada requisito llega a la implementación como escenarios WHEN/THEN revisados antes de escribir código. Falta decidir cuándo se escriben los tests que verifican esos escenarios: antes del código (TDD), después, o solo al final como cobertura.

## Decisión

Trabajamos con **TDD**: primero se escribe el test del escenario (en rojo), después la implementación mínima que lo pone en verde, y después se refactoriza. No se escribe código de producción sin un test que falle antes.

Los escenarios WHEN/THEN de las specs de OpenSpec son la lista de casos de test: cada escenario se traduce en al menos un test antes de implementar su requisito. En los `tasks.md` de cada change, las tareas se ordenan test-first (el test de un bloque va antes que su implementación). Para artefactos no testeables unitariamente línea a línea (p. ej. migraciones SQL), el ciclo se aplica a nivel de escenario: primero el test de integración que ejercita el comportamiento, luego la migración que lo satisface.

### Enmienda (T-05, `dashboard-frontend`): el runner del frontend

ADR-005 imponía TDD sin distinguir frontend de backend, y el frontend no tenía ni runner ni script `test`: sin runner, los escenarios WHEN/THEN de sus specs no podían escribirse antes que el código. Se fija **Vitest con `@nuxt/test-utils`**, `@vue/test-utils` y `happy-dom` como entorno DOM, con los scripts `test` y `test:watch` en `frontend/package.json`.

Es el runner que Nuxt 4 documenta y soporta de serie, comparte configuración con el build de Vite y arranca lo bastante rápido para un ciclo rojo-verde. Los tests montan componentes y páginas con el cliente HTTP doblado: **no** levantan el backend, que sigue cubierto por Testcontainers ([ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md)).

Se registra como enmienda y no como ADR nuevo, siguiendo el precedente de T-02 sobre [ADR-006](ADR-006-aislamiento-del-dominio.md): nombrar un runner no es una decisión de arquitectura que merezca su propio número.

*Descartados*: **Jest**, fuera del ecosistema de Vite que Nuxt usa, obliga a un pipeline de transformación paralelo; **solo tests end-to-end** (Playwright/Cypress), que no permiten el ciclo rojo-verde fino que este ADR pide y necesitan la pila entera levantada.

## Alternativas consideradas

* **Tests después del código (test-last)**: los tests tienden a acomodarse a lo ya escrito en vez de al requisito, y se recortan cuando aprieta el tiempo; se pierde la presión de diseño que da escribir primero el consumidor del código.
* **Solo tests E2E al final (T-07)**: feedback demasiado lento y grueso para localizar errores; T-07 queda como red de seguridad del flujo completo, no como única verificación.
* **Sin disciplina fija (a criterio de cada change)**: inconsistente y difícil de exigir en revisión.

## Consecuencias

* Las specs de OpenSpec y los tests quedan alineados uno a uno: revisar una spec es revisar el plan de tests.
* Los `tasks.md` se estructuran en pares rojo → verde; la revisión de PR puede exigir que cada requisito tenga su test.
* Ritmo inicial algo más lento a cambio de menos retrabajo y de detectar requisitos ambiguos antes de implementarlos.
* Los tests de persistencia requieren Docker por [ADR-004](ADR-004-testcontainers-para-tests-de-integracion.md) (Testcontainers), también en el ciclo TDD local.
* En el frontend el ciclo corre sobre Vitest y `@nuxt/test-utils` (ver la enmienda de T-05), sin backend levantado.
