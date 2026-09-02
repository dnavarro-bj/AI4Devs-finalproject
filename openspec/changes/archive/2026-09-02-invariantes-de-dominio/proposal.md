# Proposal: invariantes-de-dominio

**Ticket:** ninguno. Este change **no nace de un ticket ni de una historia de usuario**, sino de una decisión de diseño sobre cómo el proyecto entiende el dominio. Como `fechas-y-auditoria`, es deuda de base que se salda antes de que crezca el número de entidades que la arrastran, y su resultado se promociona a ADR para que los changes siguientes lo hereden. La convención de citar un ticket queda anotada como excepción consciente.

**Historias afectadas indirectamente:** [0.6](../../../docs/user-stories/0.6-registrar-especie-y-cuidados-recomendados.md) y [0.8](../../../docs/user-stories/0.8-registrar-mezcla-de-tierra.md), cuyas reglas de rango se refuerzan aquí sin abrir todavía su API.

## Why

Hoy **ninguna entidad del dominio comprueba nada**. Las reglas de negocio del modelo viven en otros dos sitios:

* En **`CHECK` de base de datos** ([ADR-002](../../../docs/adr/ADR-002-restricciones-en-base-de-datos.md)): que los porcentajes de una mezcla sumen 100, que su rango de pH no esté invertido, que las medidas de una lectura estén dentro de escala.
* En **anotaciones sobre los cuerpos de petición**, que están en `web`: es decir, fuera del dominio y **solo en el camino HTTP**.

Eso deja el modelo indefenso por dentro. Un `SoilMix` con `organicPercentage = 90` y `mineralPercentage = 90` es hoy un objeto perfectamente construible; nada lo impide hasta que la base de datos lo rechaza al hacer `flush`, y el error llega desde la infraestructura, no desde el dominio. Y la regla, escrita solo en SQL y en un DTO de `web`, no se puede leer en la clase a la que pertenece.

Hay además un hueco que ninguna de las dos capas cubre: **`Species` no valida sus rangos en ningún sitio**. Nada impide una especie con `minHumidity = 80` y `maxHumidity = 10`, y esa especie es la que T-04 usará para calcular las desviaciones que manda al prompt de la IA.

## What Changes

* **Cada entidad pasa a ser dueña de su consistencia interna.** Las invariantes se expresan con `require(...)` en un bloque `init`, en la propia clase, y no con anotaciones: la regla se lee donde vive el concepto.
* **La consistencia se protege también frente a la modificación**, no solo frente a la construcción. Los campos pasan a `private set` y el cambio se hace por métodos de dominio que revalidan (`location.rename(...)`). Un `init` solo protege el momento de crear; con `var` públicos, la invariante se rompe en la línea siguiente. No se inventan métodos que nadie llama: con el `set` cerrado, una entidad sin método de cambio queda de hecho inmutable, y el change futuro que necesite modificar algo escribirá el suyo con su `require`.
* **Se cubre el hueco de `Species`**: sus tres rangos recomendados —humedad, temperatura y horas de luz— pasan a exigir `min <= max`, que hoy no comprueba nadie.
* **Nada se retira.** Las anotaciones de `web` siguen dando el `400` con el nombre del campo, y los `CHECK` de base de datos siguen siendo la última red que exige ADR-002. Queda una defensa en tres niveles con un dueño claro: **la regla la define el dominio**; `web` la anticipa para dar un buen mensaje y la base de datos la respalda para lo que entre por SQL crudo.
* **`web` pasa a admitir solo comprobaciones de tipo y de rango.** Catorce de las dieciséis validaciones que hay hoy allí ya lo cumplen. Las dos que no —la fecha no futura, cuyo validador recibe un `Clock` y el margen por inyección, y la regla cruzada "al menos un valor"— se mueven al dominio, y el paquete `web/validation` desaparece.
* **Las invariantes que necesitan un colaborador se expresan en una factoría del `companion object`**, no en el `init`. Es el caso de la fecha de una lectura, que para saber si es futura necesita un reloj: `CareRecord.record(...)` lo recibe como parámetro. El constructor primario de esa entidad pasa a ser privado, para que la factoría sea una garantía y no una convención.
* **Un `require` que falle deja de ser un `500`.** Hoy `IllegalArgumentException` no tiene manejador, así que saldría con el cuerpo por defecto de Spring, sin campo `message` — justo lo que la spec de errores del API prohíbe.
* **Se promociona a [ADR-011](../../../docs/adr/README.md)**: dónde vive cada regla y quién manda cuando las tres capas dicen algo distinto.

## Capabilities

### New Capabilities

Ninguna. No se abre ningún endpoint ni ninguna vía de entrada.

### Modified Capabilities

- `data-model`: se añade el requisito de consistencia interna de las entidades (el modelo rechaza existir en un estado inválido, tanto al crearse como al modificarse) y el de restricciones de dominio de las especies (`min <= max` en sus tres rangos recomendados), que hoy no cubre ninguna capa.

## Non-goals

* **Retirar los `CHECK` de base de datos**: ADR-002 sigue vigente y es inmutable; quitarlos exigiría un ADR que lo supersede y dejaría sin protección las filas que entran por SQL crudo, que los tests de esquema insertan a propósito.
* **Retirar las anotaciones de validación de `web`**: dan el `400` con el nombre del campo, que es la mejor respuesta posible para el cliente. Este change las convierte en una comodidad del borde, no en la fuente de la verdad.
* **Convertir el modelo en agregados con raíces estrictas**: no se introducen `AggregateRoot`, repositorios por agregado ni reglas de navegación entre entidades. Aquí solo se trata la consistencia **interna** de cada una.
* **Objetos de valor** (`Percentage`, `PhRange`, `HumidityRange`…): encapsular cada regla en su propio tipo es el paso natural siguiente y probablemente el correcto a la larga, pero multiplica las clases y el mapeo JPA. Queda anotado como evolución.
* **Reglas que dependen de otras filas** (que un tag no esté duplicado, que la especie referenciada exista): no son consistencia interna de una entidad, requieren consultar el sistema y siguen viviendo en `application`.
* **Bajar a base de datos las dos reglas que se mueven**: ni "al menos un valor" ni la fecha no futura ganan `CHECK`. La primera obligaría a un `CHECK` cruzado sobre cinco columnas que contradiría la tolerancia a nulos que `V4__` fijó a propósito; la segunda depende de la hora actual, que no es una restricción de integridad. Ambas quedan sin red bajo el dominio, como la de `Species`.
* **Tocar el esquema**: este change no lleva migración. Los `CHECK` de `soil_mix` y `care_record` se quedan tal cual, y la invariante nueva de `Species` **no baja a la base de datos**: hoy no hay ninguna vía de entrada que escriba especies —solo las semillas—, así que un `CHECK` protegería un camino que aún no existe. Cuando se abra la API de especies, la invariante del dominio ya estará puesta y añadir el respaldo será una migración de tres líneas. Excepción consciente a ADR-002, registrada en el ADR (ver `design.md`, decisión 5).

## Impact

* `backend/src/main/kotlin/com/cactify/domain/`: las siete entidades ganan su bloque `init` con `require(...)`, pasan sus campos a `private set` y exponen los métodos de dominio que hagan falta para modificarlos.
* `backend/src/main/kotlin/com/cactify/web/`: se retiran las dos validaciones que no son de tipo ni de rango del cuerpo de petición de lecturas, y **se borra el paquete `web/validation`** con la anotación `NotFarInFuture` y su validador.
* `backend/src/main/kotlin/com/cactify/application/CareRecordService.kt`: el valor por defecto de la fecha y su recorte a microsegundos se van a la factoría del dominio; el servicio pasa a llamarla con el reloj y el margen que ya tiene inyectados.
* `backend/src/main/kotlin/com/cactify/web/errors/ApiExceptionHandler.kt`: un `@ExceptionHandler` más para que una invariante violada salga con el cuerpo de error uniforme y no como `500` desnudo.
* `backend/src/test/`: tests de dominio **unitarios** —sin contenedor, porque una invariante no necesita base de datos para probarse— más el ajuste de `AuditTimestampsTest`, el único punto de todo el proyecto que hoy modifica un campo de una entidad después de construirla.
* `docs/adr/ADR-011`: la convención y el reparto entre las tres capas, más su entrada en el índice y su línea en `openspec/config.yaml`.
* `README.md` §3.2: las invariantes documentadas junto a los campos a los que aplican.
* **Sin migración**: el esquema no se toca y `V5__` sigue libre y reservada para T-04.
* **Cambian dos mensajes de error**, no los códigos: los de la fecha futura y el de la lectura vacía dejan de llevar el prefijo del campo, porque ya no vienen de una anotación. El segundo mejora — hoy nombra `atLeastOneValue`, un campo que el cliente nunca envió. Los tests de T-03 que afirman esos mensajes se ajustan.
