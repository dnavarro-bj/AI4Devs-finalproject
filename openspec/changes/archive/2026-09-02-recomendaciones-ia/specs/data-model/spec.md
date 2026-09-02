## ADDED Requirements

### Requirement: Restricciones de dominio de las recomendaciones de IA

El sistema SHALL garantizar en base de datos que toda recomendación persistida tiene un nivel de riesgo y una prioridad dentro de sus conjuntos admitidos, y que **una lectura no puede tener más de una recomendación**.

#### Scenario: Nivel de riesgo fuera del conjunto

- **WHEN** se intenta persistir una recomendación con un nivel de riesgo que no pertenece al conjunto admitido
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Prioridad fuera del conjunto

- **WHEN** se intenta persistir una recomendación con una prioridad que no pertenece al conjunto admitido
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Segunda recomendación para la misma lectura

- **WHEN** existe una recomendación para una lectura y se intenta persistir otra para esa misma lectura
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Recomendaciones de lecturas distintas

- **WHEN** se persisten recomendaciones para dos lecturas diferentes
- **THEN** ambas operaciones se aceptan
