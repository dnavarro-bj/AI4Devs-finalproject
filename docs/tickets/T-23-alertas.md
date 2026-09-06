# T-23 - Alertas con ciclo de vida

**Área:** Backend + Frontend
**Historia relacionada:** — (sin escribir; §17 del documento de producto)
**Bloque:** 2 — organización del trabajo

## Descripción

Convertir la alerta en una incidencia operativa con ciclo de vida propio —nueva, revisada, resuelta o descartada— en lugar de un color aplicado a una recomendación histórica. Recoge la mitad de T-06, que se retira.

## Alcance

* Alerta con planta o localización, motivo, severidad, fecha de detección, acción recomendada y estado.
* Resolución con fecha y comentario.
* Orígenes: medición fuera de rango, demasiado tiempo sin revisar, cuidado vencido, incidencia anotada a mano y recomendación de IA. La IA enriquece la explicación pero no es el único mecanismo de detección.
* Apertura y resolución visibles en la cronología del ejemplar.
* Desde una alerta se crea una tarea precompletada; completar la tarea propone resolver la alerta, sin ocultarla automáticamente.

## Criterios de aceptación

* Una alerta recorre su ciclo y cada transición queda registrada con su fecha.
* Descartar una alerta no la borra ni la confunde con resolverla.
* La bandeja filtra por severidad y por estado.
* Crear una tarea desde una alerta la deja enlazada a ella.

## Pendiente antes de empezar

Qué eventos generan alertas automáticamente y si la detección corre al escribir cada lectura o en un proceso programado (§24.10).
