# T-06 - Historial y alertas

> **Retirado.** Se queda corto frente al [documento de producto](../producto/definicion-funcional-y-ux.md): el historial pasa a ser una cronología unificada de eventos ([T-20](T-20-cronologia-unificada.md)) y la alerta, una entidad con ciclo de vida propio ([T-23](T-23-alertas.md)). Se conserva como registro de por dónde iba el MVP; no se implementa tal cual.

**Área:** Frontend
**Historia relacionada:** [0.5](../user-stories/0.5-consultar-historial-de-cuidados.md)

## Descripción

Construir la vista de historial de una planta, mostrando sus lecturas y recomendaciones de IA ordenadas por fecha, y resaltando visualmente las lecturas con nivel de riesgo alto o moderado (alerta).

## Alcance

* Vista de historial accesible desde la ficha de cada planta.
* Listado de lecturas + recomendación asociada, ordenado por fecha descendente.
* Resaltado visual (badge/color) según `riskLevel`.

## Criterios de aceptación

* Desde la ficha de una planta se accede a su historial completo.
* Las entradas con riesgo alto son visualmente distinguibles de las de riesgo bajo.
* El historial se actualiza tras registrar una nueva lectura sin recargar toda la página.
