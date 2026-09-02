## ADDED Requirements

### Requirement: Restricciones de dominio de las lecturas de cultivo

El sistema SHALL garantizar en base de datos que toda lectura de cultivo persistida tiene la humedad entre `0` y `100`, las horas de luz entre `0` y `24`, la cantidad de riego mayor o igual que `0`, la acidez del sustrato entre `0` y `14` y la temperatura entre `-50` y `80`. Los valores vacíos SHALL seguir admitiéndose: la restricción aplica solo a los valores presentes.

#### Scenario: Humedad fuera de rango

- **WHEN** se intenta persistir una lectura con `humidity = 150`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Acidez del sustrato fuera de rango

- **WHEN** se intenta persistir una lectura con `soil_ph = 15.0`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Cantidad de riego negativa

- **WHEN** se intenta persistir una lectura con `water_amount_ml = -10`
- **THEN** la operación se rechaza con un error de validación

#### Scenario: Lectura con valores vacíos

- **WHEN** se persiste una lectura con `humidity`, `temperature`, `light_hours`, `water_amount_ml` y `soil_ph` vacíos y su fecha de registro informada
- **THEN** la operación se acepta: las restricciones de rango no obligan a informar ningún valor
