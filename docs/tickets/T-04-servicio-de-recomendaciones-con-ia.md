# T-04 - Servicio de recomendaciones con IA

**Área:** Backend
**Historia relacionada:** [0.4](../user-stories/0.4-obtener-analisis-de-ia.md)

## Descripción

Implementar el servicio que, dada una lectura (`CareRecord`), construye un prompt estructurado con la especie, la lectura, el último riego y las desviaciones respecto a los rangos recomendados, lo envía a la API de OpenAI, y persiste la recomendación (`AIRecommendation`) devuelta.

## Alcance

* `POST /plants/{id}/care-records/{careRecordId}/recommendation`: genera la recomendación de IA de esa lectura y la persiste. Idempotente: si ya existe, la devuelve sin volver a consultar al proveedor.
* `GET /plants/{id}/care-records/{careRecordId}/recommendation`: devuelve la recomendación de esa lectura, o `404` si aún no tiene. Nunca genera. Se aparta del `GET` generador con que se escribió el ticket: un verbo de lectura que llama a un proveedor de pago y escribe una fila no es un `GET`, y el historial de T-06 lo encadenaría hasta 25 veces por pantalla.
* Construcción del prompt: especie, última lectura, último riego registrado, rangos recomendados de la especie y desviaciones detectadas.
* Parseo de la respuesta de la IA a los campos `riskLevel`, `recommendationText`, `recommendedAction` y `priority`. Son los cuatro que prometen la historia 0.4, el README §1.2 y el alcance de T-05; el ticket se escribió con dos.
* Manejo de errores si el proveedor de IA no responde (timeout, error de API): la petición no debe romper el resto del flujo, se debe devolver un error controlado.

## Criterios de aceptación

* Dada una lectura con valores fuera de rango, la recomendación generada indica un nivel de riesgo distinto de `low`. El vocabulario persistido va en inglés (`low`/`medium`/`high`, [ADR-007](../adr/ADR-007-enums-de-dominio.md)); la etiqueta que ve el usuario la pone el frontend.
* La recomendación queda persistida y asociada a la lectura de origen.
* El prompt utilizado queda documentado en [docs/prompts-ia.md](../prompts-ia.md) — `prompts.md` en la raíz ya existía con otro propósito (los prompts con que se construyó el proyecto).
