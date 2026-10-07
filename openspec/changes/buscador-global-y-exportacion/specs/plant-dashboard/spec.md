## ADDED Requirements

### Requirement: Exportar el resultado filtrado desde el inventario y el catálogo

Las barras de herramientas de `/plants` y `/species` SHALL ofrecer un botón **Exportar** que descarga el CSV del **estado actual de la pantalla** —filtros y orden, es decir, lo que hay en la URL— pidiéndolo al API (`/plants/export`, `/species/export`). El botón SHALL **declarar su alcance antes de ejecutar**: «Exportar N resultados» con el recuento que ya muestra la tabla. Mientras se prepara SHALL indicar progreso y no admitir un segundo clic; al terminar SHALL descargar el archivo y confirmarlo con un aviso. El frontend SHALL NO conocer el máximo de exportación: cuando el API responde `422` por exceso de filas, la pantalla SHALL mostrar **su mensaje** —cuántas filas son, cuál es el máximo y que hay que afinar los filtros— en línea y sin descargar nada. Cualquier otro fallo del API SHALL mostrarse también en línea; ninguno SHALL perder los filtros. Un resultado vacío SHALL NO permitir exportar.

#### Scenario: El alcance antes de pulsar

- **WHEN** la tabla muestra 486 resultados filtrados
- **THEN** el botón dice «Exportar 486 resultados»

#### Scenario: Descargar

- **WHEN** se pulsa el botón
- **THEN** se pide `/plants/export` con los mismos filtros y orden de la URL, se descarga el archivo con el nombre que fija el servidor y aparece un aviso de que se ha exportado

#### Scenario: Una sola petición

- **WHEN** se pulsa dos veces seguidas
- **THEN** solo se pide una exportación

#### Scenario: Demasiado grande

- **WHEN** el API responde `422` porque el resultado supera el máximo
- **THEN** no se descarga nada y la pantalla muestra en línea el mensaje del servidor —cuántas filas son, cuál es el máximo y que hay que afinar los filtros—

#### Scenario: Resultado vacío

- **WHEN** ningún ejemplar cumple los filtros
- **THEN** el botón está deshabilitado

#### Scenario: Fallo

- **WHEN** el API responde un error
- **THEN** se muestra su mensaje en línea y la tabla y los filtros siguen como estaban

#### Scenario: Con una vista aplicada

- **WHEN** hay una vista guardada aplicada
- **THEN** la exportación lleva sus filtros y su orden, no sus columnas
