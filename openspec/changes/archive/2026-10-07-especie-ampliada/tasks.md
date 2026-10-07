# Tasks: especie-ampliada

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde.

## 1. Esquema y dominio (backend)

- [x] 1.1 Tests de esquema (`SpeciesFichaSchemaTest`): V10 deja las especies existentes intactas y sin definir; `CHECK` de exposición, entorno, tipo de periodo, meses 1–12, intensidad condicionada al riego; cruce de año aceptado; borrado en cascada
- [x] 1.2 Migración `V10__species_ampliada.sql`: columnas nulables en `species`, tabla `species_period`, `CHECK`s e índice por especie
- [x] 1.3 Tests de dominio de los enums (`SunExposure`, `Environment`, `PeriodType`, `WateringIntensity`): `value` explícito, `invoke()` y desconocido
- [x] 1.4 Enums y convertidores (ADR-007)
- [x] 1.5 Tests de dominio de `SpeciesPeriod` y del calendario: meses, cruce de año, un solo mes, intensidad solo en riego, solape dentro del tipo (con cruce), tipos distintos coinciden, estado intacto ante un rechazo
- [x] 1.6 `SpeciesPeriod`, `SpeciesCalendar`/validación y `Species` con los campos nuevos y `update` que valida antes de asignar

## 2. API de especies (backend)

- [x] 2.1 Tests de API (`SpeciesFichaApiTest`): alta con ficha y calendario; alta sin ellos; `PUT` sustituye el calendario; `PUT` inválido no toca nada; `400` por exposición, entorno, tipo, mes, intensidad y solape; `GET /{id}` devuelve todo con `periods` ordenados; el listado no los trae; los ejemplares no cambian
- [x] 2.2 DTOs, `SpeciesService` (mapeo dentro de la transacción, sin N+1 en el detalle) y controller con los campos y `periods`
- [x] 2.3 Los tests existentes de especies y de plantas siguen en verde

## 3. Frontend

- [x] 3.1 Tests de `validateCalendar` (meses, solape cíclico, un periodo por fila) y del mapper `speciesCalendar` (periodos → filas de `UiYearGrid`, cruce de año, intensidad de riego, formulario ↔ DTO)
- [x] 3.2 Tipos, `SUN_EXPOSURE`/`ENVIRONMENT` (etiquetas y definiciones), utilidades y mapper
- [x] 3.3 Tests del formulario (`species-editor`): tarjetas de exposición con definición, tres entornos sin «estacional», añadir y quitar periodos, cruce de año, aviso de solape, precarga en edición, error del API sin perder lo escrito
- [x] 3.4 `SpeciesForm`: descripción, exposición, entorno, sección «Crecimiento y floración»
- [x] 3.5 Tests de la ficha (`species-detail`): exposición y entorno reales, rejilla con cruce de año, cuatro filas, «Sin definir», perfil de floración, número real de ejemplares; lo aún marcado sigue marcado
- [x] 3.6 Ficha de especie: retirar las marcas de T-17 y alimentar la rejilla, la floración y la descripción; añadir fila de reposo y leyenda
- [x] 3.7 Fixtures de test con los campos nuevos; suite completa en verde, incluido `design-tokens`

## 4. Calendario editable en la rejilla (ajuste a petición del usuario)

- [x] 4.1 Backend: tests (esquema, dominio, API) del tipo `crecimiento_maximo` y de su regla de caer dentro del crecimiento; migración `V11`, `PeriodType.GrowthPeak` y la regla en `SpeciesCalendar`
- [x] 4.2 Kit: tests de `UiYearGrid` `editable` (botones accesibles, emite el siguiente nivel, no guarda, fila de presencia con toda la fuerza); implementarlo y mostrarlo en `/ui-kit`
- [x] 4.3 Mapper: `periodsToLevels` / `levelsToPeriods` (años como ciclo, crecimiento máximo, intensidades, ida y vuelta); se retiran los borradores y el aviso de solape
- [x] 4.4 Formulario: la sección «Crecimiento y floración» edita sobre la rejilla; tests de pulsar, segundo nivel, riego, cruce de año y precarga
- [x] 4.5 Ficha: el crecimiento máximo se pinta sobre el crecimiento

## 5. Documentación y cierre

- [x] 5.1 `docs/diagramas/modelo-datos-actual.md` (V10) y el borrador de gestión: lo materializado y la desviación del entorno de tres valores
- [x] 5.2 `README.md`: campos y contrato del API de especies, con el aviso de reemplazo completo
- [x] 5.3 Ticket T-17 cerrado, con la corrección de `transicion` y las dos decisiones; §24.6 y §9.3 resueltas en el documento de producto
- [x] 5.4 Comprobar contra el backend real en Docker (V10 y V11 aplicadas) y en el navegador
- [x] 5.5 `openspec validate especie-ampliada`
