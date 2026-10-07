# Design: cronologia-del-ejemplar

## Contexto

La ficha del ejemplar tiene una cronología híbrida: lecturas reales (`GET /plants/{id}/care-records`, que ya devuelve su recomendación si existe), cambios de estado en otra pantalla (`plant_status_change`, T-16), movimientos que T-18 está creando (`plant_movement`, `V12`) y todo lo demás de maqueta (`MOCK_EVENTS`). El [borrador de gestión](../../../docs/diagramas/borrador-modelo-datos-gestion.md) propone una espina `PLANT_EVENT` con un satélite por clase de evento.

**Dependencia:** este change se aplica **después de archivar `localizaciones-jerarquicas`**: la cronología lee `plant_movement`, y `V13` va tras su `V12`.

## Contraste con el borrador, el ticket y el wireframe

| Fuente | Dice | Este change |
|---|---|---|
| Borrador | `PLANT_EVENT` con **todos** los tipos —incluidos `movimiento` y `cambio de estado`— y un satélite por cada uno | **Solo los tres tipos nuevos** (comentario, intervención, floración) en la espina. Las lecturas, los cambios de estado y los movimientos **se quedan donde están** y la cronología los lee ahí. Ver decisión 1. |
| Borrador | `BLOOM_EVENT`, `INTERVENTION`, `PLANT_COMMENT` | `plant_bloom`, `plant_intervention`, `plant_comment`, con los nombres de tabla del resto del esquema. |
| Borrador | `interventionType`: `trasplante\|sustrato\|tratamiento\|poda\|revision` | **Más `fertilizacion`**, por la decisión del usuario. |
| Borrador | `PLANT_COMMENT.text` | Más `edited_at`, por «editar y borrar marcando editado». |
| Ticket | «Una acción aplicada a varias plantas aparece en el historial de cada una» | Solo `batch_id` y mostrarlo; el registro por lote es de T-24 (decisión del usuario). |
| Wireframe `plant-detail` | Cronología con lectura (y su IA en línea), riego, foto+comentario, floración, movimiento; filtro «Todos los registros»; «Cargar registros anteriores»; pestaña «Floración» con recuento | Se reproduce. **El riego no es un tipo**: es una medida de la lectura, como se decidió. La foto cuelga de T-19. |

## Decisiones

**1. La cronología es una lectura que une tablas; la espina es solo para lo nuevo.** El borrador ponía todos los eventos en la espina. Hacerlo así obliga a **rellenar** `plant_event` con las lecturas, los cambios de estado y los movimientos existentes, y a que los tres servicios que ya los escriben **escriban dos veces** —su tabla y la espina—, con el riesgo de que se desincronicen. La alternativa es una consulta `UNION ALL` de las cuatro fuentes con una proyección común `(tipo, id, instante)`, que no copia nada, hace que una lectura aparezca **en cuanto existe** y deja cada tabla siendo la fuente de su verdad. El coste es una consulta nativa de unión y la paginación sobre ella; con índices por planta e instante en cada fuente, y 2.000 plantas con cientos de eventos cada una, sale barato. Las tablas de estado y movimiento se diseñaron ya con `occurred_at` y los campos de un evento, justamente para esto.

**2. Una consulta para el orden y la página; el detalle, por tipo.** El puerto `PlantTimelineRepository` (en `domain/repos`, ADR-006) devuelve una **página de referencias** `(tipo, id, instante)`, ya filtrada y ordenada por instante descendente con el id como desempate, más el total. El servicio agrupa los ids de la página por tipo, carga cada grupo con **una consulta por tipo** (no una por fila) y arma las entradas **dentro de la transacción** (`open-in-view` apagado) en el orden de la página. El filtro por tipo se aplica **dentro** de la unión, antes de paginar, así que el total y las páginas son los del filtro. La implementación va en `infrastructure` con SQL nativo, y es el único sitio que lo usa.

**3. Herencia `JOINED` para los eventos nuevos.** `PlantEvent` es una clase abstracta con `@Inheritance(JOINED)` y columna discriminadora `event_type`; `PlantComment`, `PlantIntervention` y `PlantBloom` son sus subclases, cada una sobre su tabla satélite con la clave del evento como clave primaria y foránea. Es la espina y los satélites del borrador casi literalmente, sin una entidad espina que no hace nada. El **identificador del evento es el de la entrada** de la cronología: `PUT`/`DELETE` actúan por él, y `DELETE` borra la espina y, en cascada, su satélite.

**4. Qué se valida y dónde (ADR-002, ADR-011).** Cada regla está dos veces, en el dominio —que rechaza con `IllegalArgumentException` → `400`— y en la base con `CHECK`, por si llega algo que no pasó por el dominio.

* *Comentario*: texto no en blanco; `edited_at` solo al editarlo.
* *Intervención*: cada tipo admite **solo** sus datos —`pot_size` en `trasplante`, `soil_mix_id` en `sustrato`, `product` en `tratamiento` y `fertilizacion`—; un dato ajeno es `400` y en la base un `CHECK` por tipo. La mezcla inexistente es `400` como en la edición de planta (una referencia del cuerpo, no un recurso de la URL).
* *Floración*: `ended_on ≥ started_on`; `finalizada ⇔ hay fin`; flores ≥ 0.
* *Fecha*: ninguna es futura, comparada con el **único `Clock`** inyectado (ADR-010), igual que en las lecturas. Quedan a microsegundos.

**5. El instante de una floración es su inicio.** La cronología ordena por instante y una floración es un intervalo. Su instante de evento es **el inicio a las 00:00 UTC**, que el dominio fija al crear y al corregir, de modo que `occurred_at` y `started_on` no pueden divergir. El intervalo se pinta en la tarjeta. Una floración abierta se queda en su sitio y no «sube» a lo más reciente.

**6. Los tres tipos se editan por reemplazo completo.** `PUT` sustituye la intervención o la floración entera (incluido el tipo de la intervención) y valida **antes de asignar**, así que un rechazo no deja nada a medias (ADR-011). El comentario solo cambia su texto, conserva su instante y fija `edited_at` con el reloj. Una floración abierta se cierra editándola; no hay una operación aparte.

**7. Las respuestas son la entrada ya montada.** `POST` y `PUT` devuelven el mismo objeto que la cronología, de modo que el cliente lo coloca sin otra petición. Un id que no pertenece a la planta de la URL es `404`, no un acceso cruzado.

**8. Una forma de entrada, un detalle por tipo.** `TimelineEntryResponse` lleva `id`, `type`, `occurredAt`, `batchId?` y **un** objeto de detalle con el nombre del tipo, los demás ausentes. Se prefirió a un `data` genérico porque cada cliente tipa su rama, y a una jerarquía polimórfica de Jackson porque añade configuración para ganar poco. `lectura` reutiliza el DTO de lectura existente, recomendación incluida.

**9. `batch_id` sin dueño.** Una columna `BIGINT` nulable con índice, expuesta en la entrada. Nadie la escribe en este change; los tests la fijan con SQL. Existe para que T-24 no migre la espina.

**10. Frontend: una feature nueva, `src/features/timeline/`.** Service (`ServiceResponse`, nunca lanza) → composable → componentes (ADR-015). **El service** habla con la cronología y con los tres recursos; **el composable** `usePlantTimeline(plantId)` guarda las entradas, el filtro, la página y si hay más, y expone cargar, filtrar, cargar más y las operaciones de crear, corregir y retirar; **el mapper** convierte entradas a eventos del kit y define los tipos con su marca y tono; los componentes pintan el cuerpo de cada tipo y los diálogos recogen el formulario. Ningún componente toca el API.

**11. Cómo entran los eventos sin recargar.** Lo que se crea desde la ficha (comentario, intervención, floración) vuelve ya montado y **se coloca en su sitio** por instante, solo si encaja en el filtro activo; corregir lo **reemplaza** y retirar lo **quita**, ajustando el recuento. Lo que lo escriben otras pantallas —una lectura, un cambio de estado— **recarga la primera página** con el filtro vigente, porque su respuesta no es una entrada de cronología y reconstruirla en el cliente duplicaría lo que el servidor ya sabe.

**12. `UiTimeline` gana filtro controlado.** Con paginación en el servidor, el filtro local solo vería lo cargado y diría «no hay floraciones» donde las hay en la página siguiente. Se añade una prop `activeType` (`undefined` = filtra ella como hasta ahora, `null` o un tipo = controlado) y el evento `update:activeType`. No es un componente nuevo y los usos existentes no cambian.

**13. El «de un vistazo» usa la última floración real.** Se pide con `type=floracion&size=1`: es la más reciente por inicio y sale del mismo endpoint. `plantGlance` recibe esa floración en lugar de leer `MOCK_LAST_BLOOM`, que se borra junto con `MOCK_EVENTS`.

## Riesgos

* **La unión escala con el número de fuentes.** Cuatro fuentes hoy, más cuando T-19/T-22/T-23 añadan fotos, tareas y alertas. Se acepta: cada una es una rama más de la unión, y si un día pesara, la espina completa del borrador sigue siendo posible, con el relleno que hoy se evita.
* **Paginación por desplazamiento.** Si entra un evento mientras se pagina, uno puede repetirse o saltarse en la frontera entre páginas. Es el mismo contrato que todos los listados (ADR-009) y el cliente no pagina sobre el filtro ya cambiante; no se introduce otra paginación.
* **La integridad entre tablas ajenas no la defiende la base.** Que un evento esté en `plant_event` solo una vez por satélite sí; que una lectura pertenezca a la planta que se dice, ya la defiende su FK.
* **Orden de aplicación.** Si se aplicara antes que T-18, no habría `plant_movement` que unir. Va declarado arriba y en las tareas.

## Siguiente

T-19 cuelga `plant_media.event_id` de esta espina; T-22 y T-23 añaden tareas completadas y alertas como ramas de la unión; T-24 estrena `batch_id`.
