## ADDED Requirements

### Requirement: Las fotografías de un evento en la cronología

Cada entrada de `GET /plants/{id}/timeline` que sea un evento de la espina —`comentario`, `intervencion`, `floracion` y `tarea`— SHALL traer sus **`photos`**: las fotografías que cuelgan de él, en el orden de su fecha de captura, cada una con su identificador, texto alternativo, dimensiones y las rutas de sus variantes. La entrada de un evento sin fotografías SHALL omitir el campo. Las fotografías de **toda la página** SHALL cargarse **con una consulta** y no una por entrada, y las respuestas de crear o corregir un evento SHALL traer el mismo campo. El resto de los tipos NO SHALL traer `photos`.

#### Scenario: Un comentario con dos fotografías

- **WHEN** un comentario tiene dos fotografías enlazadas
- **THEN** su entrada trae las dos en `photos`

#### Scenario: Un evento sin fotografías

- **WHEN** una floración no tiene fotografías
- **THEN** su entrada no trae `photos`

#### Scenario: Las lecturas no traen fotos

- **WHEN** se consulta una entrada de lectura
- **THEN** no trae `photos`

#### Scenario: Una consulta para la página

- **WHEN** se pide una página de 25 entradas con eventos fotografiados
- **THEN** las fotografías se obtienen con una sola consulta

#### Scenario: Fotografiar un evento aparece sin recargar

- **WHEN** se sube una fotografía con el `eventId` de un comentario y se vuelve a pedir la cronología
- **THEN** la entrada del comentario trae la nueva fotografía
