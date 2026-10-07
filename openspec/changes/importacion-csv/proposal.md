# Proposal: importacion-csv

**Ticket:** [T-29](../../../docs/tickets/T-29-importar-exportar-y-configuracion.md) — primera parte (la configuración queda para un change posterior)
**Historia:** [1.19](../../../docs/user-stories/1.19-importar-y-exportar-datos.md) — la mitad de importar y la actividad
**Pantalla del prototipo** (`docs/wireframes/cactify-admin/index.html`): `transfer` — panel «Importar datos» (asistente de tres pasos) y «Actividad reciente»
**Producto:** §19 de [definicion-funcional-y-ux.md](../../../docs/producto/definicion-funcional-y-ux.md). Ninguna de las preguntas abiertas de §24 bloquea este change.

## Why

El producto está pensado para **500–2000 ejemplares** y hoy cada uno se da de alta a mano, uno a uno. Quien ya tiene su colección en una hoja de cálculo —y casi todo coleccionista la tiene— no puede empezar a usar Cactify sin teclear dos mil plantas. La exportación del listado existe desde T-21; la importación, que es su inverso, solo existe como **simulación marcada** en la pantalla `transfer`.

## Decisiones de partida

Resueltas por el usuario antes de abrir el change:

* **Importan especies y plantas.** Localizaciones, mezclas de sustrato y etiquetas se referencian pero **no se importan**: son catálogos pequeños que se crean a mano y que la importación de plantas exige que existan.
* **Solo crea.** Una fila que ya existe es un error de esa fila; **nunca se actualiza** nada. Importar dos veces el mismo archivo no puede duplicar ni sobrescribir.
* **Revisar antes de aplicar, sin escribir nada.** Filas listas, con avisos y con errores, el resultado de cada fila y un `errores.csv` descargable.
* **Queda constancia** de lo importado: una tabla de importaciones y el bloque «Actividad reciente» de la pantalla.
* La **exportación desde la pantalla** (elegir contenido, estimación) y la **configuración** quedan fuera.

## What Changes

**Backend**

* `POST /imports/{kind}/review` (`kind` = `plantas` | `especies`; `multipart/form-data` con un `file` CSV): lee y valida **sin escribir nada** y responde con los recuentos y el resultado de cada fila.
* `POST /imports/{kind}`: el mismo archivo, **aplicado**. Vuelve a validar con el mismo código y, si no hay ninguna fila con error, crea todo **en una transacción**; con un solo error no crea nada (`422`).
* `POST /imports/{kind}/errors`: el `errores.csv` del mismo archivo (las filas con error o aviso más una columna con el motivo), con la convención de ADR-017.
* `GET /imports/templates/{kind}`: la plantilla CSV del tipo.
* `GET /imports`: el historial, paginado.
* Migración `V19` con `import_run` (tipo, nombre del archivo, resultado, filas totales/creadas/con avisos/con error e instante).
* Plantas: referencian la **especie** por código o nombre científico y la **localización** por código `LOC-…` o por su ruta completa; las **etiquetas** deben existir. El código del ejemplar **lo asigna el servidor**, como en el alta.
* Especies: el código es obligatorio y viene en el archivo, como en el alta; la mezcla de sustrato se referencia por nombre.

**Frontend**

* La pantalla `/import-export` deja de simular **la importación**: sube el archivo, muestra la revisión real, descarga la plantilla y el `errores.csv`, aplica y enseña el resultado. «Actividad reciente» lee el historial real.
* El panel de **exportación** sigue siendo la maqueta marcada de hoy; los tipos de importación que no existen (localizaciones, mezclas, etiquetas) se ven **deshabilitados y marcados**.

## Capabilities

### New Capabilities

- `csv-import`: el formato de los CSV de plantas y especies, la revisión sin efectos, la aplicación todo-o-nada, los errores por fila, la plantilla y el historial.

### Modified Capabilities

- `plant-dashboard`: «Importar y exportar» — la importación y la actividad reciente son reales; la exportación sigue siendo una maqueta declarada.

## Non-goals

* Importar **localizaciones, mezclas de sustrato, etiquetas** ni las lecturas, tareas o fotografías de un ejemplar.
* **Actualizar** registros existentes (el modo «crea y actualiza»).
* **Atribuir** la importación a una persona: no hay usuarios (F.14); el historial dice cuándo y qué, no quién.
* **Deshacer** una importación aplicada.
* XLSX y otros formatos de entrada; **solo CSV**.
* La pantalla de **exportación** y la **configuración** (T-29b).

## Impact

* `backend/src/main/resources/db/migration/V19__import_run.sql`; `domain/` (`ImportRun`, enums), `application/` (lector CSV, planificador por tipo, `ImportService`, DTOs), `web/controllers/ImportController`, configuración `cactify.import.*`.
* `frontend/src/features/transfer/` (service real con multipart, composable, tipos, mapper), `app/pages/import-export/index.vue`; se borra `transfer.mock.ts` en lo que toca a la importación.
* `docs/`: ticket T-29, historia 1.19, modelo de datos, `README.md` y `CLAUDE.md`.
