# T-22 - Tareas: creación, agenda y finalización

**Área:** Backend + Frontend
**Historia relacionada:** — (sin escribir; §14 del documento de producto)
**Bloque:** 2 — organización del trabajo

## Descripción

El módulo que responde «qué trabajo tengo que hacer, cuándo y sobre qué plantas». Completamente manual en esta primera versión: el usuario crea, programa y completa. Conecta con datos reales la agenda y el calendario que T-14 dejó esqueletados.

## Alcance

* Tipos iniciales de tarea, deliberadamente pocos: riego, protección frente al frío, protección frente al sol, poda de raíces, cambio de maceta y «otra».
* Destino: una planta, varias seleccionadas o una localización completa.
* Periodo previsto, prioridad, notas y origen.
* Agenda, calendario y completadas sobre los mismos datos.
* Reprogramar, completar, omitir con motivo y cancelar.
* Completar crea o enlaza el registro correspondiente en el historial de cada planta afectada, mostrando antes el alcance exacto y permitiendo excluir excepciones.
* «Vencida» se calcula, no se almacena ni se elige a mano.

## Criterios de aceptación

* Crear una tarea no escribe nada en el historial de cuidados.
* Completar una tarea de grupo deja su evento en cada planta incluida y en ninguna de las excluidas.
* Cancelar u omitir conserva que la tarea estuvo planificada y no genera un cuidado realizado.
* Una tarea pendiente con fecha pasada aparece como vencida sin que nadie la haya marcado.

## Pendiente antes de empezar

Cuatro preguntas del §24 que condicionan el modelo: si una tarea sobre una localización afecta a las plantas de cuando se creó o de cuando se completa (§24.15), día exacto contra periodo (§24.14), si hace falta recurrencia manual ya (§24.17), y si completar crea siempre un cuidado (§24.18).
