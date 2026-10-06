## ADDED Requirements

### Requirement: Perfil real del ejemplar en las pantallas

La aplicación SHALL mostrar y permitir editar el **perfil real** del ejemplar —descripción, estado, germinación, adquisición y procedencia— con lo que devuelve el API, sin constantes de ejemplo.

El **formulario** de alta y edición SHALL habilitar la descripción, el año y el mes de germinación, la fecha de adquisición, la procedencia con su nota y, **solo en el alta**, el estado inicial (de entre los en curso). El mes SHALL poder quedar sin especificar y SHALL estar deshabilitado mientras no haya año. Un error del API SHALL explicarse sin perder lo escrito.

La **cabecera de la ficha** SHALL mostrar el **estado real** con su texto, y la germinación real: «Germinada 04/2021» si hay mes, y «Germinada en 2021 · ~5 años» si solo hay año, sin inventar un mes. Un ejemplar **archivado** (en un estado final) SHALL distinguirse por algo más que el color.

La ficha SHALL ofrecer **cambiar el estado**, con un motivo opcional y **obligatorio al volver a `activa` desde un estado final**, y SHALL mostrar el **historial de cambios** con su fecha, del más reciente al más antiguo, en la pestaña de datos. Solo SHALL ofrecer las transiciones que el dominio admite. El inventario y la ficha de localización SHALL mostrar el estado de cada ejemplar, y el inventario SHALL **filtrar por estado**: por defecto solo lo que está en curso, con la opción de incluir los archivados.

Lo que sigue sin tener datos —la exposición y el entorno (T-17), las fotografías (T-19), los cuidados propios por ejemplar (`cuidados-por-ejemplar`) y las tareas y alertas— SHALL seguir marcado con su ticket en su sitio.

#### Scenario: Estado real en la cabecera

- **WHEN** se abre la ficha de un ejemplar `cuarentena`
- **THEN** la cabecera muestra «Cuarentena» y no un estado de ejemplo

#### Scenario: Germinación con mes

- **WHEN** se abre la ficha de un ejemplar germinado en abril de 2021
- **THEN** la cabecera dice «Germinada 04/2021»

#### Scenario: Germinación solo con año

- **WHEN** se abre la ficha de un ejemplar con año de germinación y sin mes
- **THEN** la cabecera dice que germinó ese año con una edad aproximada, sin ningún mes

#### Scenario: Sin datos de germinación

- **WHEN** se abre la ficha de un ejemplar sin germinación
- **THEN** la cabecera no muestra ninguna germinación inventada

#### Scenario: Ejemplar archivado

- **WHEN** se abre la ficha de un ejemplar `vendida`
- **THEN** su estado se distingue con texto y forma, no solo con el color

#### Scenario: Alta con la ficha completa

- **WHEN** el usuario rellena descripción, germinación, procedencia y estado inicial y guarda
- **THEN** la planta se crea con esos datos y la ficha los muestra

#### Scenario: El mes depende del año

- **WHEN** el usuario no ha indicado el año de germinación
- **THEN** el mes está deshabilitado

#### Scenario: Estado inicial solo en el alta

- **WHEN** el usuario edita un ejemplar existente
- **THEN** el formulario no ofrece cambiar el estado, que tiene su propia acción

#### Scenario: Cambiar el estado

- **WHEN** el usuario cambia un ejemplar activo a cuarentena desde la ficha
- **THEN** la cabecera muestra el estado nuevo y el historial gana el cambio con su fecha

#### Scenario: Solo las transiciones válidas

- **WHEN** el usuario abre el cambio de estado de un ejemplar `muerta`
- **THEN** solo se ofrece volver a `activa`, y se exige el motivo

#### Scenario: Cambio rechazado por el API

- **WHEN** el API rechaza el cambio de estado
- **THEN** se explica el motivo, el estado mostrado no cambia y lo escrito no se pierde

#### Scenario: Historial de cambios

- **WHEN** se abre la pestaña de datos de un ejemplar con cambios de estado
- **THEN** se listan del más reciente al más antiguo, con su fecha, sus estados y su motivo

#### Scenario: Inventario sin archivados por defecto

- **WHEN** se abre el inventario
- **THEN** solo aparecen los ejemplares en curso, y hay una forma visible de incluir los archivados

#### Scenario: Filtrar por estado

- **WHEN** el usuario filtra el inventario por un estado
- **THEN** solo aparecen los ejemplares en ese estado y el filtro figura entre los aplicados

#### Scenario: Estado en el inventario y en la localización

- **WHEN** se abre el inventario o la ficha de una localización
- **THEN** cada ejemplar muestra su estado real
