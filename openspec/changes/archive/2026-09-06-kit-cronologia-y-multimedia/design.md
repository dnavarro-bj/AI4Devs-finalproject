# Design: kit-cronologia-y-multimedia

## Context

Ver [proposal.md](proposal.md) para la motivación y [specs/](specs/design-system/spec.md) para el contrato.

De lo que se parte: el kit tiene 22 componentes con las reglas de [ADR-014](../../../docs/adr/ADR-014-sistema-de-diseno-del-frontend.md) —un solo elemento raíz, cero valores literales, muestra en `/ui-kit`, accesibilidad como contrato— y ninguno accede a datos ni depende de una feature ([ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md)), vigilado por `test/architecture.spec.ts`.

`UiDialog` ya resuelve el modal con retención de foco, escape y devolución del foco al abrir.

## Goals / Non-Goals

**Goals:**

* Que la ficha de planta de T-13 y la agenda de T-22 se compongan sin escribir CSS de cronología ni de calendario.
* Que el contrato aguante los datos reales sin rediseñarse: la cronología no sabe qué es una lectura, solo que es un evento.

**Non-Goals:** los de la propuesta. A nivel de diseño: **no se introduce ninguna librería de fechas ni de calendario**. Las cuentas de un mes son aritmética, y una dependencia por eso obligaría a mantenerla para siempre.

## Decisions

### La fecha de hoy entra por parámetro; ningún componente llama al reloj

`UiAgendaList` y `UiCalendarMonth` reciben la fecha de referencia. Ninguno construye una fecha del sistema.

**Por qué**: es la misma disciplina que [ADR-010](../../../docs/adr/ADR-010-fechas-y-auditoria.md) impone en el backend —un único `Clock` inyectado, nadie llama a `Instant.now()`— y por el mismo motivo: un componente que consulta el reloj no se puede testear sin congelar el tiempo, y un test que depende de qué día se ejecuta falla solo algunos días. «Vencido» es una comparación, no un hecho del universo.

**Descartado**: un valor por defecto de hoy cuando no se pasa la prop. Sería la puerta por la que volvería la no determinación.

### La cronología no conoce los tipos de evento del producto

`UiTimeline` recibe entradas con `type`, `title`, `at` y contenido por slot; no sabe qué es una lectura, un riego ni una floración. Un tipo desconocido se pinta con la representación de reserva.

**Por qué**: es lo que mantiene el kit fuera de las features (ADR-015), y lo que permite que T-20 añada tipos sin tocar el componente. La regla de no descartar lo desconocido es la misma que ya aplica el mapper de la referencia: ocultar una fila escondería algo que ocurrió.

### El calendario cuenta días, no usa librería

Las semanas se calculan con aritmética de fechas nativa, empezando en lunes.

**Por qué**: es una función pura de veinte líneas que se testea entera. Traer una librería de fechas por esto la ata al proyecto para siempre, y ninguna de las que valen pesa poco.

**Semana en lunes** porque es la convención en España, que es donde está el vivero. No se hace configurable hasta que exista un segundo caso.

### Un día lleno indica lo que no cabe, no lo recorta

Cuando las entradas de un día superan el máximo visible, el componente muestra cuántas quedan.

**Por qué**: el propio documento de producto avisa de que el calendario mensual deja de ser legible con demasiadas tareas en una celda (§14.5). Recortar en silencio es peor que ser legible: el usuario cree haberlo visto todo.

### `UiUploadArea` no sube

Emite los ficheros elegidos —por selector o soltándolos— y ahí termina.

**Por qué**: subir exige saber a dónde, en qué formato y con qué límites, y eso es T-19, que además necesita un ADR previo sobre almacenamiento. Un componente que hoy inventara una subida habría que rehacerlo entonces.

### La galería reutiliza `UiDialog` para la ampliación

**Por qué**: la retención de foco, el escape y la devolución del foco ya están resueltos y testeados ahí. Rehacerlos dentro de la galería sería dos implementaciones de lo mismo, y una de ellas envejecería.

### `UiMonthRange` trata el año como un ciclo

Un mes está incluido si cae en el arco entre inicio y fin recorriendo el año hacia delante; cuando el fin es anterior al inicio, el arco cruza diciembre.

**Por qué**: es la forma natural de decir «de noviembre a febrero» sin partirlo en dos periodos, y el §9.4 lo pide explícitamente. Partirlo obligaría a la pantalla a saber si el periodo cruza el año, que es justo lo que el componente debe resolver.

## Risks / Trade-offs

* **Ocho componentes en un solo change** es mucho, y a mitad puede parecer que no avanza → las tareas van agrupadas por componente y la suite queda en verde al final de cada bloque, así que se puede parar entre uno y otro sin dejar nada roto.
* **El calendario y la agenda son los que más lógica llevan** y la lógica en un componente de presentación es un olor → se acota a funciones puras —repartir días en semanas, clasificar por vencimiento— que se testean solas y no tocan el DOM.
* **`happy-dom` no simula arrastrar y soltar de forma fiel** → el test cubre el evento de soltar con un `DataTransfer` construido a mano, y el gesto real se revisa a ojo en la galería.
* **La galería depende de `UiDialog`**, así que un cambio ahí la afecta → es dependencia dentro del kit, que es donde ADR-014 la permite; lo que no se permite es depender de una feature.
