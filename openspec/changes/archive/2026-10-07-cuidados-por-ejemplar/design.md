# Design: cuidados-por-ejemplar

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-inventory/spec.md).

De lo que se parte:

* `Species` guarda la pauta (ocho valores: los rangos de humedad, temperatura y luz, la pauta de riego y la mezcla) y valida **en el dominio** que en cada rango el mínimo no supera al máximo ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)).
* El ejemplar **hereda por referencia**: el detalle devuelve `species` completa y el cliente la lee tal cual. No hay ningún sitio donde el ejemplar se aparte.
* `Plant.update` es reemplazo completo y revalida antes de asignar; `ficha-del-ejemplar` ya lo extendió con la ficha opcional.
* En el frontend, el formulario tiene un interruptor «Personalizar cuidados» deshabilitado que dice «llega en T-16», y el panel de cuidados efectivos de la ficha lee los rangos de la especie.
* El borrador de gestión proponía una tabla 1-1 `PLANT_CARE_OVERRIDE` con columnas nulables, y que nulo significa «hereda».

## Goals / Non-Goals

**Goals:** que un ejemplar pueda apartarse de la pauta de su especie en lo que haga falta, sin copiar lo que no cambia, y que la ficha diga qué se aplica y de dónde viene.

**Non-Goals:** los de la propuesta —sin exposición ni entorno propios, sin historial, sin tocar la IA—.

## Decisions

### Columnas nulables en `plant`, no una tabla aparte

Ocho columnas opcionales directamente en la fila del ejemplar, mapeadas como un objeto de valor incrustado. **Se aparta del borrador**, que proponía una tabla 1-1.

**Por qué**: la tabla aparte obliga a una entidad con su propio tipo de identificador, a un `join` en cada lectura del ejemplar, y a que la asociación 1-1 inversa **no pueda cargarse perezosamente** en Hibernate —cada planta del listado dispararía una consulta más—. Las columnas incrustadas dan lo mismo: «nulo = hereda» y cambiar la especie se propaga sin recalcular nada. El único coste es una fila de `plant` más ancha, que con 2000 ejemplares es irrelevante.

**Qué se conserva del borrador**: la semántica —nulo hereda, valor sobrescribe— y las columnas tipadas. Se rechazó, igual que allí, el par clave-valor: perdería el tipado y las restricciones de la base.

### Un objeto de valor que guarda lo propio y resuelve lo efectivo

`CareOverrides` agrupa los ocho valores opcionales y sabe resolver el perfil efectivo contra una especie. Un ejemplar sin ningún valor propio **no tiene objeto** (es `null`), en vez de uno con todo vacío.

**Por qué**: la lógica de «propio si hay, de la especie si no» vive en un sitio, no en el servicio ni en el cliente. Y `null` para «nada propio» es lo que Hibernate devuelve de todas formas cuando todas las columnas de un incrustado son nulas; tratarlo como un objeto vacío obligaría a normalizar en cada lectura.

### El servidor devuelve el perfil efectivo ya resuelto

El detalle lleva `careOverrides` (solo lo propio) y `effectiveCare` (lo que se aplica) con la lista de campos que se apartan.

**Por qué**: el cliente sin lógica de mezcla no puede equivocarse al mezclar, y la IA y las alertas de mañana usarán la misma resolución. **Alternativa descartada**: devolver solo `careOverrides` y que el cliente combine con `species`; son tres lugares que tendrían que acordar la regla, y el primero en divergir mostraría en la ficha un valor que el servidor no aplica.

### Los rangos efectivos se validan contra la especie, con la regla de `Species`

Sobrescribir un extremo se juzga contra el otro extremo **que se aplicaría**. La comprobación «el mínimo no supera al máximo» pasa a una función única que usan `Species` y `CareOverrides`, con los mismos mensajes. Las cotas de escala —humedad 0–100, luz 0–24— solo se exigen a lo propio y se repiten en el esquema.

**Por qué**: es la misma regla y no debe existir dos veces. Las cotas solo para lo propio porque `Species` hoy no las exige y añadirlas allí cambiaría su contrato sin que nadie lo haya pedido; si se quiere endurecer la especie, es otro change.

### Cambiar la especie conserva lo propio y revalida

Al cambiar de especie se vuelve a juzgar el perfil efectivo contra la nueva. Si queda incoherente, la edición se rechaza con un `400` que lo explica.

**Por qué**: la alternativa de descartar los cuidados propios en silencio destruye una decisión del cultivador sin avisar; la de conservarlos sin revalidar deja una planta con un rango imposible. Rechazar y explicar es la única que no pierde nada y no deja basura. El usuario puede entonces ajustar los valores propios en la misma edición, que es reemplazo completo.

### `careOverrides` viaja dentro del cuerpo de la ficha, sin endpoint propio

`POST /plants` y `PUT /plants/{id}` lo aceptan, y la edición es reemplazo completo.

**Por qué**: cuidados propios y ficha se guardan **a la vez y todo o nada** —un apodo nuevo con unos cuidados incoherentes no aplica ni el apodo—, que con dos endpoints serían dos peticiones no atómicas. **Riesgo asumido**: un cliente que edite sin enviar `careOverrides` los borra. Es el comportamiento de reemplazo completo de todo el `PUT` (la descripción, la germinación…) y el único cliente, el formulario, siempre manda la ficha entera.

### Nada de la IA en este change

Las recomendaciones siguen calculándose con los rangos de la **especie**.

**Por qué**: pasar a los rangos efectivos cambia lo que el proveedor recibe, los análisis ya generados quedan calculados con otros rangos, y es una decisión de producto propia. Se deja anotado como siguiente paso natural: este change es el que lo hace posible.

### Frontend: el editor parte de lo heredado, la ficha marca el origen

El interruptor abre un editor de los cinco conceptos; cada campo vacío muestra el valor de la especie como referencia, y solo lo rellenado viaja. Desactivarlo envía el objeto sin cuidados propios. La ficha muestra `effectiveCare` con la marca «propio» o «de la especie» **en texto** y un trazo distinto para lo propio.

**Qué se aparta del prototipo**: nada de lo que el prototipo compone. El prototipo dibuja el interruptor y la pauta heredada; aquí se habilitan y se añade la marca de origen, que el prototipo da por supuesta.

## Risks / Trade-offs

* **El `PUT` sin `careOverrides` los quita** → coherente con el reemplazo completo, documentado en la spec, y el formulario siempre envía todo.
* **Cambiar la pauta de la especie puede dejar incoherente el perfil de un ejemplar que sobrescribe solo un extremo** (la especie sube su humedad máxima por debajo del mínimo propio) → no se revalida a las plantas al actualizar la especie, por coste y porque es la especie quien se corrige. El perfil efectivo se sigue calculando y la ficha lo muestra tal cual; el siguiente guardado de esa ficha lo rechazará y obligará a ajustarlo. Se anota para T-23 (una alerta de «perfil incoherente»).
* **Cinco conceptos con ocho columnas** → la humedad, la temperatura y la luz son rangos de dos extremos; el editor los trata como un solo concepto con mínimo y máximo, y la lista `overridden` es de campos para que el cliente sepa si se aparta solo un extremo.
* **Una fila de `plant` más ancha** → irrelevante a esta escala.

## Contraste final con el prototipo

Hecho en el navegador sobre la aplicación levantada, con `V9` aplicada a la base local.

* **plant-detail**: el panel «Cuidados efectivos» muestra el perfil que se aplica: los valores propios con un trazo lateral más grueso, fondo y la marca «▪ propio», y los heredados con «de la especie». Con dos conceptos propios, el pie dice «2 conceptos se apartan de la pauta de la especie; el resto lo hereda». El prototipo dibuja la pauta heredada; la marca de origen se añade porque sin ella no se distingue lo propio.
* **plant-create / edición**: se reproduce la sección «Cuidados efectivos» —la pauta heredada a la vista y el interruptor «Personalizar cuidados para esta planta»—. El interruptor deja de ser maqueta y abre el editor de los cinco conceptos con el valor heredado como referencia en cada uno; la edición de un ejemplar con cuidados propios llega con el interruptor activo y sus valores. La exposición y el entorno propios siguen marcados con T-17.
