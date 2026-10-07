## ADDED Requirements

### Requirement: Espina de eventos y satélites en el esquema

El esquema SHALL incluir `plant_event` —identificador, planta (clave foránea), tipo, instante, `batch_id` opcional y marcas de auditoría— con índice por planta e instante descendente, y tres tablas satélite con clave primaria que es a la vez clave foránea al evento y **borrado en cascada**: `plant_comment` (texto obligatorio no en blanco e instante de edición opcional), `plant_intervention` (tipo, producto, maceta, mezcla de sustrato —clave foránea a `soil_mix`— y notas) y `plant_bloom` (inicio, fin, estado, número de flores y notas). El tipo del evento SHALL aceptar solo `comentario`, `intervencion` y `floracion`. Las lecturas, los cambios de estado y los movimientos NO SHALL copiarse a esta tabla.

#### Scenario: Un evento de cada clase

- **WHEN** se guardan un evento con su comentario, otro con su intervención y otro con su floración
- **THEN** la base los acepta

#### Scenario: Tipo de evento desconocido

- **WHEN** se guarda un evento de tipo `alerta`
- **THEN** la base rechaza la fila

#### Scenario: Un comentario no puede estar en blanco

- **WHEN** se guarda un comentario con texto vacío o solo espacios
- **THEN** la base rechaza la fila

#### Scenario: Tipo de intervención y datos propios

- **WHEN** se guarda una intervención de tipo `riego`, una poda con maceta o un trasplante con producto
- **THEN** la base rechaza la fila

#### Scenario: Reglas de la floración

- **WHEN** se guarda una floración con fin anterior al inicio, finalizada sin fin, abierta con fin o con flores negativas
- **THEN** la base rechaza la fila

#### Scenario: Retirar un evento retira su satélite

- **WHEN** se elimina un evento
- **THEN** su comentario, intervención o floración desaparece con él

#### Scenario: Evento de una planta inexistente

- **WHEN** se guarda un evento con una planta que no existe
- **THEN** la base rechaza la fila

### Requirement: Los datos existentes no cambian

La migración SHALL NO modificar ni copiar ninguna lectura, cambio de estado ni movimiento existentes, y SHALL NO fabricar eventos para lo ya registrado.

#### Scenario: Aplicar la migración con historia previa

- **WHEN** se aplica sobre una base con lecturas y cambios de estado
- **THEN** siguen donde estaban, sin filas nuevas en `plant_event`
