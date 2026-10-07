## ADDED Requirements

### Requirement: La lectura de una tarea evalúa las alertas como cualquier lectura

Cada lectura registrada al **completar una tarea** SHALL pasar por la detección de medición de las alertas, en la misma transacción que la escribe: una medida fuera del rango efectivo de **esa planta** SHALL abrir o actualizar su alerta, y una dentro de rango no abre nada.

#### Scenario: Fuera de rango al completar

- **WHEN** se completa una tarea con una lectura de temperatura de 2 °C sobre 2 plantas cuyo mínimo es mayor
- **THEN** cada una tiene su alerta abierta

#### Scenario: Dentro de rango al completar

- **WHEN** la lectura está dentro del rango
- **THEN** no se abre ninguna alerta
