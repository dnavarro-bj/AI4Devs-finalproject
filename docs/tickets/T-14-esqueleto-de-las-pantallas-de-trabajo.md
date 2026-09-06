# T-14 - Esqueleto de las pantallas de trabajo

**Área:** Frontend
**Historia relacionada:** [F.3](../user-stories/F.3-consultar-cuidados-pendientes.md); las de tareas y alertas están sin escribir
**Bloque:** 0 — esqueleto de la web

## Descripción

Cerrar el esqueleto con las pantallas que organizan el trabajo y las de administración: Dashboard, tareas en sus tres vistas, bandeja de alertas, importación y exportación, y configuración. También contra datos de ejemplo.

## Alcance

* `dashboard`: trabajo pendiente primero —alertas abiertas, vencidas, hoy, plantas sin revisar— con cifras navegables al conjunto que representan (§4).
* `tasks` en agenda, calendario y completadas (§14.5).
* `alerts`: bandeja con severidad y estado del ciclo de vida (§17).
* `transfer`: importación con revisión previa y errores por fila, y exportación (§19).
* `settings`: configuración por ámbitos (§20).

## Criterios de aceptación

* El Dashboard presenta trabajo pendiente y no métricas decorativas; cada cifra abre su listado ya filtrado.
* Las tres vistas de tareas muestran los mismos datos y se alternan sin recargar.
* La bandeja de alertas distingue severidad y estado por texto o forma, no solo por color.
* La revisión de una importación muestra los errores por fila y no descarta datos en silencio.
