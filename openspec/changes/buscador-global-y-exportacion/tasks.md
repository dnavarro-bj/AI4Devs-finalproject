# Tasks: buscador-global-y-exportacion

TDD (ADR-005): cada bloque empieza por sus tests, que fallan, y termina en verde. **Requisitos previos:** `filtros-y-orden-del-inventario` y `vistas-guardadas-y-grupos-de-especies` archivados. Sin migración.

## 1. Búsqueda de texto en localizaciones y etiquetas (backend)

- [ ] 1.1 Tests de `LocationSpecs.byText` y `TagSpecs.byText` (nombre y código; solo nombre; literal de `%`/`_`; en blanco no filtra; sin distinguir mayúsculas)
- [ ] 1.2 Tests de API (`LocationSearchApiTest`, `TagSearchApiTest`): los escenarios del spec; paginación y recuento por fila intactos
- [ ] 1.3 `byText` y el parámetro `q` en `LocationController`/`TagController` → sus servicios
- [ ] 1.4 Suite completa del backend en verde

## 2. Exportación a CSV (backend)

- [ ] 2.1 Redactar `docs/adr/ADR-017-exportacion-a-csv.md` (formato RFC 4180, BOM, nombre fechado con el `Clock`, acotación y `422`, neutralización de fórmulas, columnas fijas, límite de la lectura en memoria, el BOM y otras herramientas) y añadirlo al índice
- [ ] 2.2 Tests de `CsvDocument`: entrecomillado y comillas dobladas, CRLF, saltos de línea dentro de celda, BOM, fechas y números sin tocar, apóstrofo en `=`, `+`, `-`, `@`, tabulador y CR **solo en texto**, `Asiento-de-suegra` intacto, lectura de vuelta con las mismas columnas
- [ ] 2.3 `CsvDocument` en `application/export`
- [ ] 2.4 Tests de API de plantas (`PlantExportApiTest`): mismas filas que el listado con los mismos filtros, más filas que el tamaño máximo de página, orden pedido, vacío con solo cabecera, `Content-Type` y `Content-Disposition` con la fecha del reloj inyectado, filtro inválido `400`, `page`/`size` ignorados, estado por defecto igual al del listado, etiquetas separadas por `;`, ruta de localización completa
- [ ] 2.5 Tests de la acotación (`ExportLimitApiTest`): por encima del máximo `422` con filas y máximo en el mensaje y sin CSV, exactamente el máximo devuelve todo, el máximo es configurable
- [ ] 2.6 Tests de API de especies (`SpeciesExportApiTest`): las columnas, un grupo por temperatura, número de ejemplares (0 incluido), `422`, fórmulas neutralizadas
- [ ] 2.7 Tests de CORS: `Access-Control-Expose-Headers` incluye `Content-Disposition` en la respuesta de exportación
- [ ] 2.8 `ExportService` (conteo previo, lectura en bloques de 500 con la `Specification` del listado, etiquetas por bloque en una consulta, rutas de localización en una sola resolución), `ExportTooLargeException` y su `422` en el manejador global, los dos controllers de `/export` y `EXPORT_MAX_ROWS` en `application.yml`
- [ ] 2.9 Exponer `Content-Disposition` en la configuración CORS (ADR-013); anotarlo en el ADR
- [ ] 2.10 Suite completa del backend en verde

## 3. Kit

- [ ] 3.1 Tests de `UiGlobalSearch` con `more` (aparece al final del grupo, entra en el recorrido con las flechas, activarlo emite la selección y cierra, un grupo sin él se pinta como antes, sin resultados no hay enlaces)
- [ ] 3.2 Añadir `more` al contrato de grupo de `UiGlobalSearch` y a su muestra en `/ui-kit`

## 4. Frontend: buscador global

- [ ] 4.1 Tests de `search.api.service` sin maqueta: cuatro peticiones en paralelo con `q` y tamaño acotado, plantas por código/apodo/especie, `more` solo para plantas y especies cuando hay más de los mostrados con la URL `?q=`, cada tipo falla por separado, todos fallan → sin resultados, nada con marca `· ejemplo`
- [ ] 4.2 Reescribir `search.api.service` sobre los cuatro listados; borrar `search.mock.ts` y las marcas de ejemplo; actualizar `SearchGroup` con `more`
- [ ] 4.3 Tests de `useGlobalSearch` (pausa y descarte de respuestas obsoletas siguen funcionando) y del layout (elegir un resultado o «Ver los N resultados» navega y cierra)
- [ ] 4.4 Ajustar el layout y el composable al nuevo contrato

## 5. Frontend: exportar

- [ ] 5.1 Tests del cliente HTTP (`getBlob`): devuelve blob y nombre de `Content-Disposition`, normaliza el JSON de error de un `422` en lugar de entregar un blob ilegible, errores de red como valor
- [ ] 5.2 `getBlob` en `httpClient`; `downloadBlob` en `shared/utils` (con test que doble `URL.createObjectURL`)
- [ ] 5.3 Tests del service y de `useExport`: pide `/plants/export` con la consulta canónica de la URL (sin `page`/`size`), descarga con el nombre del servidor, una sola exportación en vuelo, `422` muestra su mensaje sin descargar, fallo en línea sin perder filtros
- [ ] 5.4 Service y composable `useExport(kind)` (feature `exports`, ADR-015)
- [ ] 5.5 Tests de las pantallas: botón «Exportar N resultados» con el recuento de la tabla, deshabilitado con 0, progreso, aviso al terminar, error en línea, con una vista aplicada la petición lleva sus filtros y orden y no sus columnas
- [ ] 5.6 Botón «Exportar» en `pages/plants/index.vue` y `pages/species/index.vue`
- [ ] 5.7 Suite completa del frontend en verde, incluido `design-tokens`

## 6. Cierre

- [ ] 6.1 Verificar a mano en el navegador: la descarga lleva el nombre fechado (CORS) y abre bien en una hoja de cálculo con acentos
- [ ] 6.2 Marcar T-21 como cerrado (sección «Resolución», como T-17 y T-18), actualizar `CLAUDE.md` (estado, «Siguiente» y la mención del endpoint unificado de `busqueda-por-codigo`) y el README de tickets; **abrir el ticket de importar/exportar y configuración**, que `CLAUDE.md` ya señala como pendiente; archivar en la misma PR
