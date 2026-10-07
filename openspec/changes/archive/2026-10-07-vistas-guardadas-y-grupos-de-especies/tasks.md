# Tasks: vistas-guardadas-y-grupos-de-especies

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisito previo:** `filtros-y-orden-del-inventario` archivado.

## 1. Esquema y dominio (backend)

- [x] 1.1 Tests de esquema (`SavedViewSchemaTest`): `scope` válido, nombre no en blanco, único por ámbito sin distinguir mayúsculas ni espacios, mismo nombre en otro ámbito, `columns` prohibido en `species`, datos previos intactos
- [x] 1.2 Migración `V14__saved_view.sql` con sus restricciones e índice único normalizado
- [x] 1.3 Tests de dominio: enum `ViewScope` (`value`, `invoke`, desconocido), `SavedView` (nombre recortado y acotado, columnas conocidas, reemplazo completo conservando identidad, rechazo sin tocar nada)
- [x] 1.4 `ViewScope`, `SavedView`, `SavedViewId` (ADR-008), convertidor de columnas y `SavedViewRepository` + `JpaSavedViewRepository` (ADR-006, paginado, ADR-009)

## 2. Consulta canónica y criterios compartidos (backend)

- [x] 2.1 Vectores de prueba de la forma canónica (`contracts/canonical-query.vectors.json`, en la raíz del repo, consumido por `CanonicalQueryTest` y por Vitest): orden de pares, repetibles ordenados por valor, `page`/`size` fuera, vacíos fuera, codificación, `sort` conservado
- [x] 2.2 Tests de `PlantCriteria` y `SpeciesCriteria`: construidos desde parámetros y desde una *query string* dan lo mismo; parámetro desconocido, enumerado desconocido, id inválido, mes fuera de rango y clave de orden ajena rechazados
- [x] 2.3 Extraer `PlantCriteria`/`SpeciesCriteria` y la canonicalización a `application`; `PlantController`/`SpeciesController` y sus servicios los usan **sin cambiar comportamiento** (la suite de los listados sigue en verde)

## 3. API de vistas (backend)

- [x] 3.1 Tests de API (`SavedViewApiTest`): alta de cada ámbito, reemplazo completo, retirada, `404`, nombre en blanco `400`, repetido `409` (y carrera), mismo nombre en otro ámbito, renombrarse a sí misma
- [x] 3.2 Tests de validación (`SavedViewValidationApiTest`): `growthMonth=13`, `sort=lastReview`, parámetro desconocido, `page`/`size` descartados, columnas en `species`, columna desconocida
- [x] 3.3 Tests del listado y de los grupos (`SavedViewListApiTest`, `SpeciesGroupMatchCountTest`): filtro por ámbito, ámbito desconocido `400`, vacío, `matchCount` en `species` y ausente en `plants`, una especie sale y otra entra sola, valor retirado da 0, **una consulta por grupo** (recuento de sentencias)
- [x] 3.4 `SavedViewService` (validación con los criterios, mapeo dentro de la transacción, traducción de la violación de unicidad a `409`) y `SavedViewController`
- [x] 3.5 Suite completa del backend en verde

## 4. Kit

- [x] 4.1 Tests de `UiGroupNav` (un seleccionado, emite sin cambiar por sí mismo, ninguno, teclado, atributos al raíz, un solo elemento raíz)
- [x] 4.2 `UiGroupNav` y su muestra en `/ui-kit`; actualizar el recuento del kit en `CLAUDE.md` (36 → 37)

## 5. Frontend

- [x] 5.1 Tests de `canonicalQuery` con los vectores compartidos y del service de vistas (errores como valor)
- [x] 5.2 `canonicalQuery` en `shared/utils` y `src/features/views/` (tipos, service)
- [x] 5.3 Tests de `useSavedViews`: listar por ámbito, guardar el estado actual, aplicar escribe la URL con consulta y columnas, «aplicada» derivada de la URL y que se pierde al cambiar un criterio, reemplazar, renombrar, borrar, errores en línea, vista con clave retirada
- [x] 5.4 `useSavedViews`
- [x] 5.5 Tests de `SavedViewMenu` y `SavedViewNameDialog` (selector, marca, guardar, nombre repetido conserva lo escrito, borrar con confirmación, sin vistas, fallo en línea)
- [x] 5.6 Selector «Vistas» en `pages/plants/index.vue`; el inventario sigue funcionando si el API de vistas falla
- [x] 5.7 Tests de la fila de grupos en `/species`: «Todas», un grupo por vista con su recuento, seleccionado por coincidencia con la URL, elegir escribe la URL, cambiar un filtro sale del grupo, guardar como grupo, sin grupos, grupo con valor retirado
- [x] 5.8 Fila de grupos en `pages/species/index.vue` con `UiGroupNav`, símbolo derivado de la regla, «Guardar los filtros como grupo…»; retirar la marca de la fila que dejó el change 1
- [x] 5.9 Suite completa del frontend en verde, incluido `design-tokens`

## 6. Cierre

- [x] 6.1 Actualizar T-21 (segunda parte), `CLAUDE.md` y el README de tickets; archivar en la misma PR
