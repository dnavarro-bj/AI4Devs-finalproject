# Design: vistas-guardadas-y-grupos-de-especies

## Contexto

`filtros-y-orden-del-inventario` deja el estado de `/plants` y `/species` **en la URL** (`useUrlState`) y un lenguaje de filtros y orden con claves públicas (ADR-016). Este change guarda ese estado con nombre. La tabla `UiTable` ya sabe ocultar columnas (`visibleColumns`) y el inventario ya tiene su selector de columnas; el prototipo de `species` ya pinta la fila de grupos (`species-groups`) y el de `plants` el botón «Configurar columnas» pero **no** un selector de vistas: es una pieza que el prototipo no compone y el producto pide (§5.1, «Vistas o filtros guardados»), así que se ubica junto a la barra de herramientas, donde está el resto del estado de la tabla, y se anota como apartarse del prototipo por falta de pieza.

**Dependencia:** se aplica **tras archivar** `filtros-y-orden-del-inventario`. La migración es `V14`: `V13` es de `cronologia-del-ejemplar`.

## Contraste con el prototipo, el ticket y el producto

| Fuente | Dice | Este change |
|---|---|---|
| Prototipo `species` | Grupos «Todas», «Pleno sol», «Semisombra», «Sensibles al frío», «Crecimiento invernal», con símbolo propio y recuento | Se reproduce la composición. **Los grupos no se siembran**: son dato del usuario. El símbolo se deriva de la regla. |
| Prototipo `plants` | Solo «Configurar columnas» | Se añade el selector «Vistas» (§5.1) junto a él; el prototipo no lo compone. |
| Historia 1.18 | Grupo sobre exposición, **horas de luz, riego**, temperatura, **humedad**, sustrato, entorno, crecimiento, floración | Solo los filtros que existen; luz, humedad y riego quedan fuera con el change 1. Se declara en el proposal. |
| Historia 1.17 | «Guardar una combinación de filtros, orden y columnas» | Se guarda la consulta (filtros y orden) y las columnas de `plants`. |
| Producto §15.1 | Grupos dinámicos | Idem; sin tabla de pertenencia. |

## Decisiones

**1. Una sola tabla, dos ámbitos.** `saved_view(id, scope, name, query, columns, created_at, updated_at)` sirve a vistas del inventario y a grupos de especies: son lo mismo (una consulta con nombre) y separarlas en dos tablas duplicaría el CRUD, la unicidad y la validación. `scope` lleva `CHECK` (`plants`, `species`) y enum de dominio con `value` explícito (ADR-007). Unicidad con un índice único sobre `(scope, lower(trim(name)))`, igual que `tag_name_normalized_unique` (ADR-002); la carrera entre dos altas la resuelve la base y el servicio traduce la violación a `409`. Un `CHECK` prohíbe `columns` en `species`. **El nombre es único por ámbito, no global**: «Cuarentena» tiene sentido en los dos.

**2. La consulta es una cadena canónica.** Se guarda la *query string* en forma **canónica**: pares ordenados por clave y, dentro de una clave repetible, por valor; sin `page`, `size` ni valores vacíos; codificación URL uniforme. Esa forma la produce **la misma función** en el backend (al guardar) y en el frontend (`canonicalQuery`, para decidir qué vista está «aplicada»): sin ella, `?a=1&b=2` y `?b=2&a=1` serían vistas distintas y el grupo seleccionado nunca coincidiría. Son dos implementaciones de una regla, así que comparten **vectores de prueba** (los mismos casos, en Kotlin y en Vitest). El orden de `sort` **sí** se conserva tal cual: es significativo.

**3. Se valida con el mismo código que el listado.** Hoy `PlantController.list` desempaqueta sus `@RequestParam` en argumentos del servicio. Se extrae un valor `PlantCriteria` / `SpeciesCriteria` (en `application`) que el controller construye de sus parámetros y que **también** se construye desde una *query string* analizada; el servicio de vistas llama a la misma validación (enumerados, ids, meses, claves de `SortKeys`) y a una lista de **parámetros conocidos** por ámbito para rechazar el ruido. Así «una vista no puede ser inservible» se cumple **por construcción** y no por una segunda implementación de las reglas. Es un refactor del listado bajo la suite existente en verde, no un cambio de comportamiento. Una vista guardada cuyo valor desaparece después no se revalida: se evalúa y da vacío (consistente con `species=<inexistente>` del listado).

**4. Los grupos se evalúan, no se almacenan.** `matchCount` es un `count` con las `Specification` de especies —una consulta por grupo; el listado de vistas de `species` ejecuta N consultas para N grupos, y N es pequeño (decenas, a mano)—. No hay tabla de pertenencia, ninguna actualización cuando cambia una especie, y «entra y sale sola» es un efecto de evaluar, no una funcionalidad. La pantalla **no** pide la lista de miembros: elegir un grupo escribe su consulta en la URL y es `GET /species` quien filtra. En `plants` no se calcula el recuento: sería una consulta cara por vista que ninguna pantalla pide.

**5. Las columnas son claves públicas del inventario.** Se guardan como una lista de claves (`species`, `location`, `status`, `lastWatering`, `attention`) en una columna `TEXT` con `AttributeConverter` —el patrón de `infrastructure/persistence/converters/`— y se validan en el dominio contra la lista conocida, igual que el orden. Las columnas de maqueta (`lastWatering`, `attention`) **se admiten**: la vista debe sobrevivir a que dejen de serlo. La columna identificativa no es configurable y no se guarda.

**6. Feature nueva: `src/features/views/`.** Service (`saved-views.api.service`), composable `useSavedViews(scope)` y los componentes `SavedViewMenu` y `SavedViewNameDialog` (ADR-015). El composable es quien relaciona la URL con las vistas: «aplicar» = `replace` de `route.query` con la consulta y las columnas de la vista; «aplicada» = `canonicalQuery(route.query)` igual a la de alguna vista. Ningún componente lee el store ni llama al API; no hay store: las vistas son estado de una pantalla, no cross-feature.

**7. `UiGroupNav` al kit.** La fila de grupos es un patrón con nombre propio en el prototipo y aparecerá en más pantallas (zonas de una localización, por ejemplo); no recibe nada del dominio. Va al kit con su test y su muestra (ADR-014); sube de 36 a 37 componentes y hay que actualizar la cifra de `CLAUDE.md`.

**8. Estado del selector respecto a la URL.** «Aplicada» es una **derivación** de la URL, no un estado que la pantalla recuerde: si se cambia un criterio la marca desaparece sola y se ofrece «Reemplazar». Guardar el «estado actual» es leer la URL. Así no hay forma de que la vista y la tabla se desincronicen.

## Riesgos / compromisos

* **Dos implementaciones de la forma canónica.** Si divergen, un grupo deja de seleccionarse aunque coincida. Los vectores de prueba compartidos son la defensa; el síntoma es visible (ningún grupo marcado).
* **Una clave pública que desaparece rompe vistas guardadas.** Se evalúan con la clave nueva ausente → `400` al aplicar. La pantalla debe mostrar el error en línea del listado y ofrecer borrar o reemplazar la vista; un test lo cubre.
* **Globales a la colección.** Sin usuarios, todas las vistas son de todos. Cuando haya autenticación se añade un propietario y un ámbito de visibilidad; la tabla no lo impide.
* **N consultas por grupo.** Aceptable con decenas de grupos; con cientos habría que paginar el recuento o calcularlo bajo demanda. Se anota, no se anticipa.
