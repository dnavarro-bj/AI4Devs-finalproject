## ADDED Requirements

### Requirement: Ficha ampliada del ejemplar

El sistema SHALL permitir indicar, al dar de alta y al editar un ejemplar, una **descripción**, el **año y el mes de germinación**, la **fecha de adquisición**, la **procedencia** —de una lista cerrada: vivero, intercambio, germinación propia, compra, regalo u otro— y una **nota** de procedencia. Todos son opcionales y SHALL viajar en el alta, el detalle y la edición; la edición, al ser reemplazo completo, SHALL borrar los que no se envíen.

La germinación SHALL admitir **año sin mes**, y SHALL rechazar un mes sin año y un mes fuera de 1 a 12 con `400 Bad Request`. Nunca se inventa un día ni un mes. La descripción y la nota se almacenan sin espacios al principio ni al final y, en blanco, equivalen a ausentes.

#### Scenario: Alta con la ficha completa

- **WHEN** se da de alta un ejemplar con descripción, germinación en abril de 2021, adquisición y procedencia `intercambio` con su nota
- **THEN** la respuesta es `201 Created` e incluye todos esos datos tal y como se enviaron

#### Scenario: Germinación solo con el año

- **WHEN** se guarda un ejemplar con año de germinación 2021 y sin mes
- **THEN** la respuesta lo devuelve con el año y sin mes, sin ningún mes inventado

#### Scenario: Mes sin año

- **WHEN** se intenta guardar un ejemplar con mes de germinación y sin año
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error que lo explica, y no se guarda nada

#### Scenario: Mes fuera de rango

- **WHEN** se intenta guardar un ejemplar con mes de germinación 13
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Procedencia fuera de la lista

- **WHEN** se intenta guardar un ejemplar con una procedencia que no es de la lista
- **THEN** la respuesta es `400 Bad Request` con un cuerpo de error, y no se produce un error interno del servidor

#### Scenario: Ejemplar sin ficha ampliada

- **WHEN** se da de alta un ejemplar sin ninguno de los campos opcionales
- **THEN** se crea y los campos opcionales se devuelven ausentes

#### Scenario: Edición con reemplazo completo

- **WHEN** se edita un ejemplar sin enviar la descripción que tenía
- **THEN** la descripción queda ausente

#### Scenario: Texto en blanco

- **WHEN** se guarda un ejemplar con la descripción en blanco
- **THEN** la descripción queda ausente

### Requirement: Estado de un ejemplar

Todo ejemplar SHALL tener un **estado**, uno de siete: `activa`, `cuarentena` y `enferma` —**en curso**— y `cedida`, `vendida`, `muerta` y `perdida` —**finales**—. Al darlo de alta SHALL ser `activa` si no se indica otro, y solo puede nacer en un estado en curso. El estado SHALL viajar en el alta, el detalle y el listado. La edición de la ficha (`PUT /plants/{id}`) SHALL NO cambiar el estado: tiene su propia operación, que deja constancia.

Un ejemplar en un estado final **no desaparece**: sigue existiendo, con su código y su historial.

#### Scenario: Estado por defecto

- **WHEN** se da de alta un ejemplar sin indicar estado
- **THEN** queda `activa`

#### Scenario: Estado inicial en curso

- **WHEN** se da de alta un ejemplar indicando `cuarentena`
- **THEN** queda en cuarentena y no hay ningún cambio de estado registrado

#### Scenario: No se puede nacer en un estado final

- **WHEN** se intenta dar de alta un ejemplar con estado `muerta`
- **THEN** la respuesta es `400 Bad Request` y no se crea ninguna planta

#### Scenario: Estado inexistente

- **WHEN** se intenta dar de alta o cambiar un ejemplar a un estado que no existe
- **THEN** la respuesta es `400 Bad Request`, no un error interno

#### Scenario: Editar la ficha no cambia el estado

- **WHEN** se edita un ejemplar enviando en el cuerpo un estado distinto
- **THEN** el estado enviado se ignora y el ejemplar conserva el suyo

#### Scenario: Un ejemplar archivado sigue consultable

- **WHEN** se consulta el detalle de un ejemplar `muerta`
- **THEN** la respuesta es `200 OK` con su código, su ficha y su estado

### Requirement: Cambio de estado y su historial

El sistema SHALL permitir cambiar el estado de un ejemplar con `PUT /plants/{id}/status`, indicando el estado nuevo y, opcionalmente, un **motivo**, y SHALL dejar constancia de cada cambio con el estado anterior, el nuevo, el motivo y **el instante en que ocurrió**. Las transiciones válidas son:

* entre estados **en curso**, cualquiera a cualquiera;
* de un estado en curso a uno **final**;
* de un estado **final** solo a `activa`, y en ese caso el **motivo es obligatorio**, porque es una corrección y no una resurrección silenciosa.

Cualquier otra transición, y pasar al estado que ya se tiene, SHALL rechazarse con `409 Conflict` explicando por qué, sin cambiar nada. `GET /plants/{id}/status-changes` SHALL devolver el historial **paginado, del más reciente al más antiguo**.

#### Scenario: Cambio entre estados en curso

- **WHEN** un ejemplar activo pasa a `cuarentena`
- **THEN** la respuesta es `200 OK` con el estado nuevo y el historial tiene un cambio de `activa` a `cuarentena` con su fecha

#### Scenario: Paso a un estado final

- **WHEN** un ejemplar activo pasa a `vendida` con el motivo `Vendida a un coleccionista`
- **THEN** queda `vendida` y el historial guarda el cambio con su motivo

#### Scenario: Motivo opcional

- **WHEN** un ejemplar pasa de `activa` a `enferma` sin motivo
- **THEN** el cambio se acepta y se registra sin motivo

#### Scenario: Corrección desde un estado final

- **WHEN** un ejemplar `muerta` vuelve a `activa` indicando el motivo `Era un error al marcarla`
- **THEN** queda `activa` y el historial conserva los dos cambios

#### Scenario: Corrección sin motivo

- **WHEN** se intenta volver a `activa` desde un estado final sin motivo
- **THEN** la respuesta es `400 Bad Request` que pide el motivo, y el ejemplar conserva su estado

#### Scenario: Transición no permitida

- **WHEN** se intenta pasar de `muerta` a `vendida`
- **THEN** la respuesta es `409 Conflict` explicando que desde un estado final solo se vuelve a `activa`, y el ejemplar no cambia

#### Scenario: Mismo estado

- **WHEN** se intenta pasar a un ejemplar al estado que ya tiene
- **THEN** la respuesta es `409 Conflict` y no se registra ningún cambio

#### Scenario: Ejemplar inexistente

- **WHEN** se cambia el estado de un ejemplar que no existe
- **THEN** la respuesta es `404 Not Found`

#### Scenario: Historial ordenado y paginado

- **WHEN** se consulta el historial de un ejemplar con varios cambios
- **THEN** la respuesta es el envelope paginado, del cambio más reciente al más antiguo, y un ejemplar sin cambios devuelve una página vacía

#### Scenario: El código no cambia con el estado

- **WHEN** un ejemplar pasa a un estado final y vuelve a `activa`
- **THEN** conserva el mismo código y no se asigna ninguno nuevo

### Requirement: Inventario por estado

El listado del inventario SHALL **no mezclar lo que está en curso con lo archivado**: sin filtro de estado devuelve solo los ejemplares en estado en curso. El filtro `status` SHALL ser repetible y devolver los ejemplares en **cualquiera** de los estados indicados, finales incluidos; un estado inexistente SHALL responder `400 Bad Request`. Se combina con el resto de filtros y con la paginación.

#### Scenario: Sin filtro, solo lo que está en curso

- **WHEN** existen ejemplares activos y uno vendido y se consulta el listado sin filtro de estado
- **THEN** la respuesta contiene los activos y no el vendido

#### Scenario: Pedir un estado final

- **WHEN** se consulta el listado con el filtro `status=vendida`
- **THEN** la respuesta contiene el ejemplar vendido y ninguno en curso

#### Scenario: Varios estados

- **WHEN** se consulta el listado con `status=activa` y `status=muerta`
- **THEN** la respuesta contiene los ejemplares activos y los muertos

#### Scenario: Estado inexistente

- **WHEN** se consulta el listado con un estado que no existe
- **THEN** la respuesta es `400 Bad Request`

#### Scenario: Combinado con otros filtros

- **WHEN** se filtra por estado y por localización
- **THEN** la respuesta cumple las dos condiciones

#### Scenario: El total refleja el filtro

- **WHEN** se consulta el listado sin filtro de estado
- **THEN** el total de elementos del envelope cuenta solo los ejemplares en curso
