# Design: especie-ampliada

## Contexto

`Species` es hoy una ficha plana: nombres, código, tres rangos, pauta de riego y mezcla. `PUT /species/{id}` es reemplazo completo, `GET /species/{id}` devuelve la ficha con `plantCount` y la ficha del frontend marca con T-17 exposición, entorno, año de cultivo y floración. El [borrador de gestión](../../../docs/diagramas/borrador-modelo-datos-gestion.md) ya fija el modelo (6 oct 2026); este change lo materializa.

## Contraste con el borrador, el wireframe y el ticket

| Fuente | Dice | Este change |
|---|---|---|
| Borrador | `SPECIES_PERIOD` única con `crecimiento\|reposo\|floracion\|riego`, `intensity` solo para riego, cruce de año = inicio > fin | **Tal cual.** |
| Borrador | `sunExposure`, `environment`, `bloomDescription/Color/Maturity/TypicalDuration` en `SPECIES` | **Tal cual**, más `description`. Valores del enum en español (`sombra`, `pleno_sol`), como el estado de la planta (V8). |
| Ticket | tipo `transicion` y floración «separada» | `transicion` **no existe** (el borrador lo retiró); la floración esperada va en la especie y la observada en el ejemplar (T-18…), sin tocarse. El ticket se corrige al cerrar. |
| Wireframe `species-editor` | entorno con cuatro opciones, «Estacional» incluida; «Notas de cultivo» | **Desviación consciente**: tres opciones por decisión del usuario; sin notas de cultivo (nadie les da campo). |
| Wireframe `species-detail` | tres filas de año (crecimiento, floración, riego con tres intensidades) y perfil de floración de cuatro datos | **Se reproduce.** `reposo` se guarda pero la rejilla del prototipo no tiene fila para él; ver decisión 5. |

## Decisiones

**1. Campos nuevos nulables.** Una especie existente no tiene exposición ni entorno que inventar. `NULL` es «sin definir» y la ficha lo dice. Obligarlos habría forzado un valor por defecto que parecería dato. Los enums siguen ADR-007: `value` explícito, `invoke()` que normaliza y falla ante lo desconocido, convertidor `autoApply`. Un desconocido es `400`.

**2. Una sola tabla de periodos, no cuatro.** Los cuatro tipos comparten forma —rango de meses y nota— y solo el riego añade intensidad. Una tabla por tipo habría multiplicado entidades, repositorios y DTOs para lo mismo. El coste es una regla condicional (intensidad solo en riego), que va como `CHECK` y como invariante de dominio (ADR-002/011).

**3. Cruce del año = inicio > fin.** No se parte en dos filas: «noviembre–febrero» es un periodo y así se guarda, se devuelve y se pinta (`UiMonthRange` ya lo resuelve). Inicio = fin es un solo mes. `CHECK` de 1 a 12.

**4. Solape: dentro del tipo, cíclico.** Cada periodo se expande a su conjunto de meses (con el cruce) y dos periodos del mismo tipo no pueden compartir ninguno. Es la forma más sencilla de que nov–feb y ene–mar choquen sin casos especiales. Entre tipos distintos coinciden libremente: crecer y florecer a la vez es normal. No se valida en la base: es regla de conjunto, y va en el dominio con el resto de invariantes.

**5. El reposo se guarda aunque la rejilla del prototipo no lo pinte.** El prototipo dibuja tres filas. El borrador y el ticket piden reposo. Se **añade una cuarta fila «Reposo»** a la rejilla, con tono neutro: omitir un tipo que el modelo guarda sería esconder un dato, y `UiYearGrid` admite las filas que haga falta. La leyenda la incluye. Es la única adición al prototipo, anotada en la propia pantalla del change.

**6. Reemplazo completo del calendario.** `periods` va en el cuerpo de `POST` y `PUT`; en el `PUT` sustituye al guardado en la misma transacción, con `orphanRemoval`. Es coherente con el `PUT` actual y evita endpoints de periodo. Si la lista es inválida **no se toca nada**: el agregado valida antes de mutar (ADR-011). Omitir `periods` equivale a lista vacía; el frontend siempre la manda.

**7. `Species` es el agregado; `SpeciesPeriod` no tiene repositorio.** Vive dentro de la especie (`@OneToMany(cascade = ALL, orphanRemoval = true)`), con ids TSID tipados como el resto (ADR-008). Los controllers no ven entidades; `SpeciesService` devuelve DTOs mapeados dentro de la transacción (`open-in-view` apagado), cargando el calendario con la especie para no tener un N+1 en el detalle. El listado no toca la colección.

**8. Qué viaja dónde.** `GET /species/{id}` gana todo. `GET /species` no. El `species` embebido en `GET /plants/{id}` **no cambia**: la ficha de planta no lo necesita y ensancharlo ahora acopla pantallas.

**9. Exposición sin umbral.** Cuatro valores y su definición funcional, escrita **una vez** en el frontend (`SUN_EXPOSURE`) y mostrada bajo cada tarjeta. Mismo mapa para la ficha. No se relaciona con las horas de luz ni se valida contra ellas: sombra con 12 h es un dato legítimo (una planta en sombra clara todo el día).

**11. La rejilla es el editor.** El calendario se edita pulsando los meses, como el prototipo muestra y el usuario pidió. El estado del formulario son **doce niveles por pauta**, no una lista de periodos: un mes tiene un solo nivel por pauta, así que el solape dentro de un tipo es **imposible por construcción** y el aviso de solape desaparece. Al enviar, `levelsToPeriods` agrupa los meses consecutivos en periodos, tratando el año como ciclo (diciembre + enero = un periodo que cruza). Es la misma regla que el servidor sigue exigiendo, por si llega otro cliente.

**12. Crecimiento máximo = tipo `crecimiento_maximo`, no una intensidad.** Se barajaron dos: una intensidad en el crecimiento (reutilizando la columna del riego) o un tipo propio. Se eligió el tipo: la intensidad hoy es del riego, con un `CHECK` que la liga a él, y generalizarla para un solo caso obligaba a reescribir esa regla; un tipo que **se superpone** al crecimiento es lo que el usuario describió («dos tipos de crecimiento superpuestos») y reutiliza lo que el modelo ya permite —tipos distintos que coinciden—. Su única regla nueva es de conjunto: **sus meses deben caer dentro del crecimiento**, cruce de año incluido. Va en el dominio; en el formulario es automático (el segundo nivel está dentro del primero). Migración `V11` aparte, porque `V10` ya está aplicada en bases en uso y Flyway rechaza que cambie.

**13. `UiYearGrid` gana `editable`, no se crea otro componente.** Mismo aspecto que la ficha, con cada mes como botón que cicla el nivel y emite `cycle`; no guarda estado. Cada fila declara `max` y la rejilla reparte sus niveles por toda la escala del color, para que una pauta de presencia no se vea apagada. Muestra en `/ui-kit` con su test. Sigue siendo un solo componente del kit.

**10. Frontend por capas (ADR-015).** `species.types.ts` gana los tipos; el service ya devuelve `ServiceResponse`; un **mapper** `speciesCalendar` convierte periodos → filas de `UiYearGrid` (12 niveles por tipo, riego 1–3 según intensidad) y formularios ↔ DTO, porque ahí la forma cambia de verdad. La validación de solape y de meses es una función pura de `shared/utils`, reutilizable y testeable sin montar nada, como `validateRange`. El formulario es un componente; ningún componente llama al API.

## Riesgos

* **El `PUT` de un cliente antiguo borra el calendario** por ser reemplazo completo. Hoy el único cliente es este frontend, que ya manda la lista; se asume y se documenta en el README.
* **Las notas de un periodo se pierden al guardar desde el formulario**, porque la rejilla no las edita. El API las conserva; ningún cliente las usaba antes de este change.
* **El formulario crece mucho.** Se organiza por secciones con `UiFormNav`, como el prototipo; la sección «Crecimiento y floración» es nueva.
* **Meses y hemisferio.** El calendario es una referencia para clima mediterráneo; no hay hemisferio. Si un día lo hay, es un dato de la colección, no de cada periodo.

## Siguiente

La IA y las alertas de riego podrán leer el periodo vigente de la especie (¿riego «abundante» en junio?). Es un change propio.
