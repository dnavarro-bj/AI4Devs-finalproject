## ADDED Requirements

### Requirement: La ficha muestra la cronología real del ejemplar

La ficha del ejemplar SHALL pintar su cronología desde `GET /plants/{id}/timeline`, con los seis tipos, sin eventos de maqueta. Cada tipo SHALL tener su representación —la lectura con sus medidas y su recomendación, el comentario con su texto, la intervención con sus datos propios, la floración con su intervalo y estado, el cambio de estado con el motivo, el movimiento con origen y destino—, y un tipo desconocido SHALL mostrarse igualmente. El filtro por tipo SHALL pedirse al servidor y SHALL conservarse al cargar más. «Cargar registros anteriores» SHALL añadir la página siguiente sin repetir ni perder eventos y desaparecer al llegar al final. Un evento con `batchId` SHALL indicar que formó parte de una operación sobre varias plantas. Una cronología vacía SHALL decirlo y ofrecer añadir el primer comentario. Si la cronología falla, la ficha SHALL seguir mostrando la planta.

#### Scenario: Todos los tipos en una sola lista

- **WHEN** se abre la ficha de un ejemplar con eventos de los seis tipos
- **THEN** la cronología los muestra juntos, del más reciente al más antiguo, y ninguno está marcado como ejemplo

#### Scenario: Cada tipo con su cuerpo

- **WHEN** la cronología contiene una floración y un comentario
- **THEN** la floración muestra su intervalo y estado, y el comentario su texto

#### Scenario: Filtrar pide al servidor

- **WHEN** se pulsa el filtro «Floración»
- **THEN** se pide la cronología con ese tipo, y la lista y su recuento son los del filtro

#### Scenario: Cargar anteriores conserva el filtro

- **WHEN** hay un filtro activo y se pulsa «Cargar registros anteriores»
- **THEN** se pide la página siguiente con el mismo filtro y se añade sin repetir eventos

#### Scenario: Sin más páginas

- **WHEN** ya se cargó la última página
- **THEN** el botón de cargar anteriores no aparece

#### Scenario: Evento de un lote

- **WHEN** un evento trae `batchId`
- **THEN** su tarjeta dice que fue una operación sobre varias plantas

#### Scenario: Sin eventos

- **WHEN** el ejemplar no tiene ninguno
- **THEN** la cronología lo dice y ofrece añadir un comentario

#### Scenario: Un fallo no tumba la ficha

- **WHEN** la cronología falla
- **THEN** la ficha muestra la planta y un error en el panel del historial

### Requirement: Entran sin recargar

Los eventos nuevos SHALL aparecer en la cronología sin recargar la página: una lectura registrada, un cambio de estado y un comentario, una intervención o una floración creados desde la ficha. Corregir o retirar un evento SHALL actualizarlo o quitarlo en el momento. Con un filtro activo, un evento de otro tipo NO SHALL colarse en la lista filtrada.

#### Scenario: Registrar una lectura

- **WHEN** se registra una lectura
- **THEN** es la primera entrada de la cronología sin recargar

#### Scenario: Cambiar el estado

- **WHEN** se cambia el estado de la planta
- **THEN** el cambio aparece en la cronología

#### Scenario: Con filtro, no se cuela

- **WHEN** el filtro es «Floración» y se anota un comentario
- **THEN** el comentario no aparece en la lista filtrada

### Requirement: Comentarios, intervenciones y floraciones desde la ficha

La ficha SHALL ofrecer «＋ Añadir» con comentario, intervención y floración, cada uno con su formulario en un diálogo. **El comentario** pide texto y permite fijar la fecha; **la intervención** pide el tipo y muestra solo los campos del tipo elegido —maceta en el trasplante, mezcla en el cambio de sustrato, producto en el tratamiento y la fertilización—; **la floración** pide inicio y permite fin, estado, número de flores y notas, con el fin solo cuando está finalizada. Los errores del API SHALL explicarse sin perder lo escrito. Las tarjetas de comentario, intervención y floración SHALL ofrecer corregir y retirar; **retirar SHALL pedir confirmación**, y un comentario corregido SHALL mostrar «editado».

#### Scenario: Elegir el tipo de intervención

- **WHEN** se elige «Trasplante» y luego «Poda»
- **THEN** el campo de maceta aparece solo con el trasplante y el de producto solo con tratamiento y fertilización

#### Scenario: Anotar un comentario

- **WHEN** se escribe un texto y se guarda
- **THEN** el diálogo se cierra y el comentario aparece en la cronología

#### Scenario: Comentario vacío

- **WHEN** se intenta guardar sin texto
- **THEN** el formulario lo señala junto al campo y no envía nada

#### Scenario: Floración abierta y cerrada

- **WHEN** se elige el estado «Finalizada»
- **THEN** el formulario pide la fecha de fin, y con «En flor» no la muestra

#### Scenario: Corregir un comentario

- **WHEN** se corrige y se guarda
- **THEN** la tarjeta muestra el texto nuevo y «editado»

#### Scenario: Retirar con confirmación

- **WHEN** se pulsa retirar
- **THEN** se pide confirmación, y solo al confirmar se retira; cancelar no cambia nada

#### Scenario: Error del API sin perder lo escrito

- **WHEN** el API rechaza el guardado
- **THEN** el diálogo explica el motivo y conserva lo introducido

### Requirement: Pestaña Floración y última floración real

La pestaña «Floración» de la ficha SHALL listar las floraciones **observadas** del ejemplar, la más reciente primero, con su recuento junto al nombre de la pestaña, y permitir registrar una nueva y cerrar o corregir una abierta. «Última floración» de «de un vistazo» SHALL salir de la última floración real —su mes y cuánto duró, o que sigue abierta— y dejar de ser un dato de ejemplo; sin ninguna, SHALL decirlo. Los datos de floración esperada de la especie NO SHALL mezclarse en esta pestaña.

#### Scenario: Listar las floraciones

- **WHEN** se abre la pestaña con tres floraciones
- **THEN** las muestra de la más reciente a la más antigua y la pestaña lleva el número 3

#### Scenario: Última floración real

- **WHEN** la última floración fue de mayo de 2026 y duró 4 días
- **THEN** «de un vistazo» dice «Mayo de 2026» y «Duró 4 días», sin marca de ejemplo

#### Scenario: Floración en curso

- **WHEN** la última floración sigue abierta
- **THEN** «de un vistazo» dice que está en curso

#### Scenario: Sin floraciones

- **WHEN** el ejemplar nunca ha florecido
- **THEN** «de un vistazo» dice que no hay floraciones registradas y la pestaña ofrece registrar la primera
