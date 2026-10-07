# Tasks: filtros-y-orden-del-inventario

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. Sin migración (decisión 7 del design): si la medición del bloque 1 lo exige, se añade entonces.

## 1. Convención (ADR-016) y orden

- [ ] 1.1 Redactar `docs/adr/ADR-016-filtros-y-orden-en-los-listados.md` desde `template.md` (parámetros planos, `OR` repetible salvo `tag`, claves públicas por recurso, `400` ante lo desconocido, desempate por id) y añadirlo al índice del README de ADRs; referenciarlo en `openspec/config.yaml`
- [ ] 1.2 Tests de `SortKeys` (plantas y especies): clave pública traducida a su ruta, desempate por id al final, clave ajena y dirección inválida rechazadas, orden por defecto intacto sin `sort`
- [ ] 1.3 `SortKeys` en `domain/specs` y traducción del `Pageable` en `PlantService.search` y `SpeciesService.list`
- [ ] 1.4 Tests de API del orden de plantas (`PlantSortApiTest`): por especie y por localización alfabéticos y no por id, orden estable entre páginas con muchas plantas de la misma especie, `lastReview`/`tagSet` → `400`, dirección inválida → `400`
- [ ] 1.5 Comprobar que el `sort` por ruta anidada reutiliza el *fetch join* (decisión 2); si no, ordenar con expresión explícita en la `Specification`

## 2. Filtros del inventario (backend)

- [ ] 2.1 Tests de `PlantSpecs.byText`, `bySpecies` y `bySpeciesTraits` (exposición y entorno): literal de `%`/`_`, en blanco no filtra, `OR` entre los cuatro campos, varias especies, especie sin definir no encaja
- [ ] 2.2 Tests de API (`PlantSearchApiTest`): los escenarios de `q`, `species`, `exposure`, `environment` y su composición con `location`, `tag` y `status`; `species` inexistente → página vacía, `species=abc` → `400`, `environment=playa` → `400`, `status=resucitada` → `400`, consulta de recuento correcta (los totales son los del filtro)
- [ ] 2.3 Implementar las tres `Specification` (el join propio de `byText`, no el *fetch*) y los parámetros de `PlantController.list` → `PlantService.search`
- [ ] 2.4 Suite completa del backend en verde

## 3. Filtros del catálogo de especies (backend)

- [ ] 3.1 Tests de `SpeciesSpecs`: `byText`, rasgos, `byMinTemperature` con extremos opcionales e incluidos, `byMonthsCovered` con periodo normal, periodo que cruza fin de año, hueco, un solo mes y especie sin calendario
- [ ] 3.2 Tests de API (`SpeciesSearchApiTest`): los escenarios del spec, `growthMonth=13` y `exposure=playa` y `minTemperatureFrom=frio` → `400`, orden por clave pública y clave ajena → `400`
- [ ] 3.3 Implementar `SpeciesSpecs` (un `EXISTS` por mes, solo `crecimiento` y `floracion`) y los parámetros de `SpeciesController.list` → `SpeciesService.list`
- [ ] 3.4 Sembrar 2.000 ejemplares y 500 especies en un test de integración, medir `q` y `sort=species` y anotar el resultado en el design (decisión 7); añadir migración de índices **solo** si lo exige
- [ ] 3.5 Suite completa del backend en verde

## 4. Frontend: estado en la URL y services

- [ ] 4.1 Tests de `useUrlState`: lee y escribe tipos, `replace` y no `push`, descarta parámetros desconocidos o inválidos, repetibles, vuelve al valor por defecto al quitar
- [ ] 4.2 `useUrlState` en `shared/composables`
- [ ] 4.3 Tests de los services de plantas y especies: los parámetros nuevos viajan repetidos, los ausentes no viajan (un `sort` vacío tapa el orden por defecto), errores como valor
- [ ] 4.4 Ampliar `plants.api.service` y `species.api.service` y sus tipos de consulta (`q`, `species`, `exposure`, `environment`, `soilMix`, `minTemperature*`, `growthMonth`, `bloomMonth`)

## 5. Frontend: pantallas

- [ ] 5.1 Tests de la pantalla `/plants`: buscar por apodo con pausa, filtrar por especie, «Más filtros» (exposición, entorno, etiqueta), quitar un criterio conservando los demás, «nada coincide» frente a «inventario vacío», ordenar por especie y localización con `sort` del API sin reordenar en el cliente, orden «Última revisión» y «Atención» no disponibles con su ticket
- [ ] 5.2 Tests de la URL de `/plants`: recarga conserva filtros, orden y columnas; enlace compartido; `?status=resucitada` se ignora; el `?location=` de la ficha de localización sigue funcionando
- [ ] 5.3 Reescribir `pages/plants/index.vue` con `useUrlState`: caja «Código, apodo o especie» por `q`, desplegable de especie real (decisión 6, con el aviso de truncado), «Más filtros» y criterios retirables
- [ ] 5.4 Tests de `/species`: búsqueda, exposición, temperatura y crecimiento (meses repetidos), criterios retirables, nota «Mostrando N de M especies», orden por columna, URL, «Riego» y la fila de grupos marcados
- [ ] 5.5 Reescribir la barra de herramientas de `pages/species/index.vue` con la composición del prototipo, la fila de grupos y «Riego» marcados con su change/ticket
- [ ] 5.6 Si un patrón aparece en las dos pantallas (selector de rango de meses, criterios aplicados), extraerlo al kit con su test y su muestra en `/ui-kit` (ADR-014); `design-tokens` sigue en verde
- [ ] 5.7 Suite completa del frontend en verde

## 6. Cierre

- [ ] 6.1 Actualizar el ticket T-21 (primera parte hecha), el estado en `CLAUDE.md` y el README de tickets; archivar el change en la misma PR
