## ADDED Requirements

### Requirement: Registrar una lectura dispara la detección de medición

Registrar una lectura SHALL evaluar sus medidas contra el rango efectivo del ejemplar **en la misma transacción** y abrir o actualizar las alertas que correspondan, según la capability `alerts`. La respuesta del alta SHALL ser la misma de siempre —la lectura—, sin incluir las alertas. Una lectura rechazada por invariante NO SHALL abrir ninguna alerta, y registrar una lectura NO SHALL fallar porque no genere alerta.

#### Scenario: La lectura abre una alerta

- **WHEN** se registra una lectura con la temperatura fuera de rango
- **THEN** la respuesta es `201 Created` con la lectura, y `GET /alerts?plant=…` trae una alerta de temperatura enlazada a ella

#### Scenario: La lectura no abre nada

- **WHEN** se registra una lectura dentro de rango
- **THEN** la respuesta es `201 Created` y no hay ninguna alerta nueva

#### Scenario: Una lectura inválida no deja alertas

- **WHEN** se envía una lectura con humedad de 140 %
- **THEN** la respuesta es `400` y no existe ninguna alerta

#### Scenario: Las lecturas anteriores no se reevalúan

- **WHEN** se aplica la migración sobre una base con lecturas fuera de rango ya guardadas
- **THEN** no aparece ninguna alerta: solo las lecturas posteriores se evalúan
