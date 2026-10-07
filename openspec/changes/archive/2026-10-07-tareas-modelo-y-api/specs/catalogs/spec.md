## ADDED Requirements

### Requirement: Una localización con tareas no se retira

`DELETE /locations/{id}` SHALL responder `409` si alguna tarea —en cualquier estado— apunta a esa localización, y la localización SHALL conservarse. El mensaje SHALL decir que hay tareas que la usan. Las tareas dirigidas a plantas expresas SHALL NOT impedir retirar la localización donde estén las plantas, que sigue gobernada por las reglas de ejemplares y sublocalizaciones.

#### Scenario: Con una tarea pendiente

- **WHEN** una tarea pendiente apunta a una localización y se intenta retirar
- **THEN** responde `409` y la localización sigue existiendo

#### Scenario: Con una tarea completada

- **WHEN** solo hay tareas completadas dirigidas a esa localización
- **THEN** responde `409` igualmente, porque la historia conserva la referencia

#### Scenario: Sin tareas

- **WHEN** ninguna tarea apunta a la localización y no tiene ejemplares ni sublocalizaciones
- **THEN** se retira
