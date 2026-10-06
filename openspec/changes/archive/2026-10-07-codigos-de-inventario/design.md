# Design: codigos-de-inventario

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-inventory/spec.md).

De lo que se parte:

* `species` y `plant` no tienen ninguna columna de identidad legible. `V1` a `V6` están aplicadas y no se editan ([ADR-001](../../../docs/adr/ADR-001-flyway-para-migraciones.md)).
* `PlantService.create` resuelve localización y especie y guarda; no hay nada que serialice dos altas de la misma especie.
* `Species.update` reemplaza la ficha entera revalidando sus invariantes ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)); `Plant.update` (T-26) ya garantiza que editar no toca la identidad.
* `SpeciesCareResponse` se reutiliza en `GET /species/{id}` y dentro de `GET /plants/{id}`.
* El frontend inventa el código en dos sitios: `mockCode()` en el inventario y `MOCK_CODE` en la ficha y la edición.
* El borrador de gestión ya proponía `SPECIES.code`, `SPECIES.nextSequence` y `PLANT.code`, con el contador bloqueando la fila como solución a las altas simultáneas.

## Goals / Non-Goals

**Goals:** que cada especie y cada ejemplar tengan un código estable, único y legible; que dos altas simultáneas nunca lo repitan; que el frontend deje de inventarlo.

**Non-Goals:** los de la propuesta —sin búsqueda, sin código de localización, sin QR, sin generación del código de especie en el servidor—.

## Decisions

### El contador vive en la especie y se toma con bloqueo de fila

`species.next_sequence` guarda el siguiente número. Dar de alta un ejemplar lee la especie con `PESSIMISTIC_WRITE`, toma el número, lo incrementa y guarda, todo en la misma transacción que crea la planta.

**Por qué**: es lo que pide el ticket y el borrador de gestión. Un `MAX(...)+1` sobre `plant` no es seguro: dos transacciones leen el mismo máximo y las dos escriben el mismo código; solo el `UNIQUE` evitaría el duplicado, y lo haría **fallando** una alta legítima. Con el bloqueo, la segunda alta espera a la primera y obtiene el número siguiente. Además el contador solo crece, así que **un número nunca se reutiliza**, ni siquiera si algún día se borrara un ejemplar.

**Alternativa descartada**: una secuencia de PostgreSQL por especie. Habría que crear una secuencia por cada especie nueva —DDL desde la aplicación— y las secuencias no hacen rollback, dejando huecos en una numeración que la gente va a leer.

**Coste aceptado**: las altas de **una misma especie** se serializan. Con una colección de 2000 plantas y un único administrador, no es un cuello de botella.

### El método de dominio asigna el número, no el servicio

`Species.nextPlantCode()` incrementa el contador y devuelve el código completo (`CAT-GRUSS-01`). `Plant` recibe el código ya compuesto y lo guarda como `val`, sin setter y con la columna `updatable = false`.

**Por qué**: ADR-011 pide que la entidad sea dueña de su consistencia. El contador y su incremento son una sola operación que no debe poder hacerse a medias desde fuera.

### El código de especie es obligatorio y lo escribe una persona; el formulario lo propone

El servidor lo exige en el alta y en la actualización, y solo lo normaliza (mayúsculas, sin espacios) y valida (formato, unicidad). **No lo genera.** El formulario de alta, en cambio, **lo propone** mientras se escribe el nombre científico: `CAT-` más las cinco primeras letras del género.

**Por qué en el cliente y no en el servidor**: la propuesta es una ayuda de escritura, no una regla del sistema. El prototipo mezcla géneros y epítetos (`CAT-GRUSS` para *Echinocactus grusonii*, `CAT-MAMMI` para el género *Mammillaria*), así que no hay *una* regla que el servidor pueda imponer sin inventarla; y como el código de una especie con ejemplares **no se puede corregir**, que lo decida siempre una persona —con una sugerencia a mano— es lo que se quiere de algo que acabará impreso en una etiqueta.

**Cómo se comporta**: sigue al nombre mientras el usuario no toque el campo; en cuanto lo escribe a mano deja de seguirlo, y si lo vacía vuelve a seguirlo. **En la edición nunca se sugiere ni se pisa**: ya hay un código y puede estar en etiquetas. La propuesta **no comprueba si ya existe**: lo dice el `409` junto al campo, y el usuario escribe otro.

**Alternativa descartada**: un endpoint de propuesta que resolviera los choques con las especies existentes. Obligaría a una ronda por cada tecleo del nombre; el `409` ya cubre el choque, y el servidor sigue sin tener ninguna regla de generación que mantener.

**Efectos**: ni prefijo configurable en el servidor ni función de propuesta en el backend. El prefijo `CAT` vive como constante de la propuesta del formulario y como literal en la migración de relleno.

### Corregir el código se decide en el servicio, con el recuento

`SpeciesService.update` compara el código recibido con el actual; si **cambia** y la especie tiene ejemplares, lanza `SpeciesCodeLockedException`, que el manejador global traduce a `409`. Que no cambie no es un conflicto: se acepta aunque haya ejemplares, porque el `PUT` es reemplazo completo y el formulario reenvía todo.

**Por qué en el servicio y no en la entidad**: la regla consulta otras filas (hay plantas), y ADR-011 deja esas reglas en `application`. La entidad solo valida el formato.

**El código también es obligatorio en el `PUT`**, porque es reemplazo completo como en el resto de catálogos: sin excepciones que recordar. El formulario siempre lo envía, y un cliente que lo omita recibe un `400` en lugar de vaciarlo o conservarlo por accidente.

### La ficha de especie lleva su recuento de ejemplares

`GET /species/{id}` pasa a devolver `SpeciesDetailResponse`: lo mismo que antes más `plantCount`.

**Por qué**: el formulario necesita saber de antemano si el código está bloqueado, y descubrirlo por el `409` al guardar sería obligar al usuario a perder lo escrito. Es el mismo patrón que `GET /locations/{id}` y `GET /tags/{id}`: el recuento en la ficha, no en el listado.

**Por qué un DTO propio y no un campo opcional en `SpeciesCareResponse`**: ese DTO también va dentro de `GET /plants/{id}`, donde un recuento no tiene sentido y obligaría a una consulta extra. Un campo nulo según quién lo construya sería una trampa.

### El relleno de la migración va en la propia migración

`V7` añade las columnas **nulables**, rellena, y solo entonces las vuelve `NOT NULL` con sus `UNIQUE` y `CHECK`. Las especies reciben el código del género (la semilla de `grusonii` recibe `CAT-GRUSS`, como el prototipo); las plantas, el de su especie más un número por orden de alta; y el contador de cada especie queda en el siguiente al último.

**Por qué**: así no existe jamás una fila sin código ni un estado en que el esquema permita nulos. Aquí sí hay que **derivar** un código para las especies que ya existen —nadie puede escribirlo—, y se hace con el género y el prefijo `CAT` literal en el SQL: una migración es una foto de un momento y no lee configuración. Es lo único del change que genera un código de especie, y es de una sola vez.

**Riesgo**: si dos especies existentes dieran el mismo código por género, el relleno añade un sufijo para desempatar. Es un caso que con los datos de hoy no aparece, pero la migración tiene que ser correcta, no suerte.

### Un `CHECK` de formato en la base, y la misma regla en el dominio

`code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'` y longitud máxima. El dominio lo exige con `require` y el esquema con `CHECK`, como todas las invariantes ([ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)).

### Frontend: borrar los mocks y mostrar lo que hay

Los tipos ganan `code`; el inventario, la cabecera y la edición lo leen del API; `mockCode()` y `MOCK_CODE` se borran. El alta compone la vista previa con el código de la especie elegida y un `··` en lugar del número, porque ese número **no existe hasta guardar**: inventarlo sería repetir el error que este change corrige.

**Qué se aparta de la composición del prototipo**: el prototipo enseña `CAT-GRUSS-01` ya en el alta. Aquí enseña `CAT-GRUSS-··`, por la razón anterior.

## Risks / Trade-offs

* **Los tests de integración corren en una transacción que se revierte**, y las altas simultáneas necesitan transacciones reales y separadas. El test de concurrencia no puede heredar ese comportamiento: sale de la transacción, crea sus datos con confirmación y los **borra al terminar**. Si se interrumpe a medias, deja filas; por eso usa una especie propia con código inconfundible.
* **Los códigos de las plantas ya existentes quedan fijados por la migración**, y como el código de una especie con ejemplares no se puede corregir, un código de especie que no guste ya no tiene arreglo. Aceptado: es la decisión de producto, y las especies de hoy son tres de semilla y las de prueba.
* **Cambiar la especie de una planta deja un código que ya no coincide con el de su especie** (`CAT-GRUSS-03` en una `CAT-MAMMI`). Es lo que pide el ticket y lo que mantiene válidas las etiquetas pegadas; la ficha no lo señala, y si confunde, es un asunto de T-16 o T-20.
* **El bloqueo serializa las altas de una especie**, aceptado arriba.
* **Un código de especie escrito a mano puede salir mal** (una errata, un prefijo distinto del resto). Mientras la especie no tenga ejemplares se corrige sin coste; el formato y la unicidad cubren lo mecánico, y nada impide que dos especies tengan prefijos con criterios distintos. Aceptado: es una decisión de quien administra.
* **Todo lo que hoy da de alta una especie sin código deja de funcionar**: los tests existentes del catálogo y de plantas, y los datos de ejemplo del frontend. Es un cambio de contrato deliberado y la tarea 3.3 lo recoge.

## Contraste final con el prototipo

Hecho en el navegador sobre la aplicación levantada, con la migración `V7` aplicada a la base local.

* **plants**: se reproduce la celda identificativa con el código real bajo el apodo (`CAT-GRUSS-01`, `CAT-MAMMI-02`). Siguen marcadas «Último riego» y «Atención» (T-20, T-23) y los filtros de búsqueda y especie (T-21).
* **plant-detail**: la cabecera muestra el código real sin marca de ejemplo. Siguen marcados el estado, el contexto botánico y la fotografía (T-16, T-17, T-19).
* **plant-create**: se reproduce el bloque del código como etiqueta física. Se aparta en una cosa, por decisión: enseña `CAT-GRUSS-··` y no `CAT-GRUSS-01`, porque el número no existe hasta guardar.
* **species / species-detail**: el código real en la tabla, en la portada y en la ficha de catálogo, y el recuento real en la ficha. Siguen marcados el recuento por fila y la lista de ejemplares (T-21), exposición, entorno y floración (T-17) y fotografías (T-19).
* **species-editor**: el campo Código, obligatorio y deshabilitado con su explicación cuando la especie tiene ejemplares. El prototipo no lo dibuja; se añade porque el contrato lo exige.
