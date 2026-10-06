# Design: ficha-del-ejemplar

## Context

Ver [proposal.md](proposal.md) y [specs/](specs/plant-inventory/spec.md).

De lo que se parte:

* `Plant` tiene `code`, `nickname`, `location` y `species`, con `private set` y un único método de cambio (`update`) que revalida ([ADR-011](../../../docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)). `PUT /plants/{id}` es reemplazo completo (T-26).
* Los enums de dominio llevan `value` explícito, un `invoke()` que falla ante lo desconocido y un `AttributeConverter` ([ADR-007](../../../docs/adr/ADR-007-enums-de-dominio.md)).
* `CareRecord` ya resolvió «fecha que depende del reloj» con una factoría que recibe el `Clock` ([ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md)).
* El frontend tiene los cinco campos esqueletados y deshabilitados, y `MOCK_STATUS` / `MOCK_CONTEXT` en la cabecera.
* El borrador de gestión proponía los campos y una `PLANT_STATE_CHANGE` colgada de una `PLANT_EVENT` que **todavía no existe** (T-20).

## Goals / Non-Goals

**Goals:** que el ejemplar diga qué es, en qué situación está y cuándo y cómo llegó, y que dejar de estar activo no sea borrar.

**Non-Goals:** los de la propuesta —sin cuidados propios, sin cronología unificada, sin automatismos—.

## Decisions

### Los estados y las transiciones viven en el enum, no en el servicio

`PlantStatus` declara sus siete valores, si cada uno es **final**, y `canMoveTo(target)`. Las reglas: en curso ↔ en curso libre; en curso → final libre; final → solo `activa`.

**Por qué**: es una regla de la propia entidad que no consulta nada más —ADR-011 la deja en el dominio—, y que el enum la lleve hace imposible olvidarla en un camino nuevo. El **motivo obligatorio** al volver de un final **no** se decide ahí sino en el método de la planta que cambia de estado, que es quien recibe el motivo.

### Un método de dominio para cambiar de estado, que devuelve el cambio

`Plant.changeStatus(to, reason, clock)` valida la transición, actualiza el estado y **devuelve** un `PlantStatusChange` ya construido; el servicio lo guarda. El estado actual y su historial no se pueden desincronizar porque nacen del mismo método.

**Por qué**: si el servicio actualizara el estado y luego escribiera el cambio, un fallo entre los dos dejaría un estado sin historial. Un solo método lo hace todo-o-nada dentro de la transacción. El reloj entra por parámetro, como en `CareRecord`, porque la fecha del cambio es el reloj del sistema.

### El historial es su propia tabla, sin esperar a la cronología

`plant_status_change` guarda `plant_id`, `from_status`, `to_status`, `reason` y `occurred_at`. **No** se crea ninguna `plant_event`.

**Por qué**: la cronología unificada es T-20 y todavía no está diseñada con sus hermanas (comentarios, intervenciones, floraciones). Crear aquí su tabla madre sería decidirla a medias. La tabla de historial tiene todo lo que un evento de «cambio de estado» necesitaría —planta, momento, antes, después, motivo—, así que T-20 podrá **referenciarla** desde su tabla de eventos sin migrar los datos.

### El estado no se edita por `PUT /plants/{id}`

El estado tiene su propia operación, `PUT /plants/{id}/status`.

**Por qué**: un cambio de estado **deja rastro**, y la edición de la ficha no. Si el estado viajara en el `PUT` de la ficha, habría dos caminos para el mismo cambio, uno con historial y otro sin él. El `PUT` de la ficha **ignora** un estado que le llegue en el cuerpo.

### El inventario esconde lo archivado por defecto, con un filtro explícito

Sin `status`, el listado devuelve los tres estados en curso. `status` es repetible y pide lo que se quiera, finales incluidos.

**Por qué**: es el criterio de aceptación de la historia 1.3, y es lo que hace útil un inventario de 2000 plantas con rotación: lo vendido y lo muerto no estorba a diario. **Efecto en el contrato**: el listado deja de devolver todo por defecto. Los tests existentes dan de alta plantas activas, así que no cambian; lo que cambia es que el total del envelope cuenta solo lo en curso.

**Alternativa descartada**: un parámetro `includeArchived`. Obliga a otro concepto cuando el filtro por estado ya lo expresa, y no permite pedir «solo las vendidas».

### Germinación: año y mes opcionales, el mes exige año

Dos columnas enteras y un `CHECK`: `germination_month IS NULL OR germination_year IS NOT NULL`, más el rango 1–12 y un año entre 1900 y 2100. El dominio lo repite con `require`.

**Por qué**: es la regla escrita que el borrador pedía para los datos parciales (pregunta 7 de gestión): una **sola** regla —«el mes sin año no tiene sentido»— y no una excepción por entidad. Un mes sin año no significa nada; un año sin mes significa «en algún momento de ese año», y la ficha lo dice así. **Alternativa descartada**: una fecha con campo de precisión, más general y sin nadie más que lo use.

### La procedencia es un enum con nota, y `otro` existe

Seis valores y un texto libre. El enum permite filtrar y contar; la nota guarda lo que no cabe (el nombre del vivero, a quién se le compró).

**Por qué `otro`**: una lista cerrada sin salida obliga a mentir en el primer caso que no prevé. **Qué se aparta del borrador**: era texto libre; el formulario ya lo pintaba como select, y esa fue la decisión tomada.

### Una sola migración, con los defaults que no inventan nada

`V8` añade las columnas con `status NOT NULL DEFAULT 'activa'`; el resto nace nulo. Las plantas existentes quedan activas, que es lo que eran.

### Frontend: el estado sale del tipo, no de una constante

Los tipos ganan los campos; `PlantHeader` lee el estado y la germinación del ejemplar; `MOCK_STATUS` y la germinación de `MOCK_CONTEXT` se borran. Las transiciones que se **ofrecen** en la interfaz las calcula una función pura que **espeja** la del dominio.

**Por qué espejarla y no pedirla al API**: es una regla de siete valores, y un endpoint de «transiciones posibles» sería una ronda más por abrir un diálogo. El servidor la vuelve a comprobar y su `409` manda; si alguna vez divergieran, el usuario vería el motivo del API, no un fallo mudo.

### Qué se aparta de la composición del prototipo

Nada de lo que el prototipo compone. El prototipo dibuja el estado como una insignia en la cabecera; aquí se mantiene y, además, un archivado se distingue por **texto y forma**, no solo por color.

## Risks / Trade-offs

* **El listado deja de devolver lo archivado por defecto** → cambio de contrato deliberado y documentado; cualquier cliente que quiera todo debe pedirlo con `status`.
* **El historial y la futura cronología pueden duplicar el cambio de estado** → T-20 los unirá referenciando esta tabla; hasta entonces cada uno vive en su sitio y la ficha solo enseña el historial propio.
* **Las transiciones están duplicadas en el cliente** → dos copias de una regla de siete valores; el servidor es la fuente y el `409` explica cualquier divergencia.
* **Un estado final «recuperable» con motivo** → permite deshacer un error, pero también ocultar que una planta murió y «resucitó». El historial lo conserva todo, y el motivo es obligatorio.
* **Todo ejemplar existente queda activo** aunque alguno ya estuviera muerto en la realidad → no hay dato del que deducirlo; el usuario lo corrige con el cambio de estado.

## Contraste final con el prototipo

Hecho en el navegador sobre la aplicación levantada, con `V8` aplicada a la base local.

* **plant-detail**: la cabecera muestra el estado real («Activa»), la germinación real («Germinada en 2021 · ~5 años», sin mes inventado) y la acción «Cambiar estado»; el contexto botánico (exposición y entorno) y la fotografía siguen marcados como ejemplo (T-17, T-19). La pestaña de datos gana el perfil real y el historial de estado.
* **plants**: se reproduce la composición del inventario y se añade una **columna «Estado»** y el filtro de estado, ya reales. El prototipo no pinta la columna; se añade porque sin ella el filtro por estado no se podría comprobar en las filas. Lo archivado queda fuera por defecto y la opción «Todas, incluidas las archivadas» lo trae.
* **plant-create**: el formulario conserva sus seis secciones; se habilitan el estado inicial, la descripción, la procedencia con su nota, la fecha de entrada y la germinación, con el mes deshabilitado sin año. El interruptor de cuidados propios sigue marcado (`cuidados-por-ejemplar`).

## Riesgos añadidos al implementar

* **El recuento de una localización (`plantCount`) cuenta también los archivados**, mientras que su lista de ejemplares, que usa el listado por defecto, solo enseña los que están en curso. Es coherente con retirar la localización —no se puede mientras albergue ejemplares, aunque estén archivados—, pero puede sorprender. Si molesta, es un asunto de T-18, que rediseña la ficha de localización.
