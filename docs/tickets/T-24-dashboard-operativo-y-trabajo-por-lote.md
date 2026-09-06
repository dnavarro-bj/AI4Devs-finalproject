# T-24 - Dashboard operativo y trabajo por lote

**Área:** Backend + Frontend
**Historia relacionada:** [F.2](../user-stories/F.2-registrar-cuidados-por-lote.md), [F.3](../user-stories/F.3-consultar-cuidados-pendientes.md)
**Bloque:** 2 — organización del trabajo

## Descripción

Cerrar el bloque conectando el Dashboard con datos reales y permitiendo aplicar una acción a muchas plantas de una vez, que es lo que hace manejable una colección de 2000 ejemplares.

## Alcance

* Dashboard con alertas abiertas, tareas vencidas y de hoy, plantas sin revisar en el intervalo configurado, incidencias por localización y actividad reciente.
* Cada cifra agregada abre el conjunto que representa, ya filtrado.
* Aplicar una acción a plantas seleccionadas, a todas las de una localización o al resultado de un filtro guardado, con confirmación explícita del alcance.
* El número exacto de plantas afectadas se muestra **antes** de guardar.
* Cada planta afectada recibe su evento, conservando que fue una sola operación.

## Criterios de aceptación

* Ninguna cifra del Dashboard es un callejón sin salida: todas navegan a su listado filtrado.
* Una acción por lote declara cuántos elementos afecta antes de ejecutarse.
* Tras una acción sobre 31 plantas, las 31 fichas la muestran en su historial.
* El Dashboard no añade tablas nuevas al modelo.
