## 1. Esquema, dominio y configuración

- [ ] 1.1 Tests de esquema (`ImportRunSchemaTest`): `kind` y `outcome` fuera de sus listas rechazados, cifras negativas rechazadas, `rechazada` con filas creadas rechazada, nombre de archivo en blanco rechazado, datos previos intactos
- [ ] 1.2 Migración `V19__import_run.sql`
- [ ] 1.3 Tests de los enums `ImportKind` (`plantas`, `especies`) e `ImportOutcome` (`aplicada`, `rechazada`): `value`, `invoke()`, desconocido, convertidor (ADR-007)
- [ ] 1.4 Enums, convertidores y `ImportRun` con su identificador (ADR-008, ADR-011: recorta y valida el nombre del archivo, sin separadores de ruta) y su puerto de repositorio
- [ ] 1.5 `cactify.import.max-rows` en `application.yml` y su comprobación de coherencia (mayor que cero); test de configuración incoherente

## 2. Lectura de CSV y cabeceras

- [ ] 2.1 Tests de `CsvReader`: UTF-8 con y sin BOM, `,` y `;` por la cabecera, comillas dobladas, saltos de línea dentro de comillas, CRLF y LF, celdas vacías, fila más corta o más larga que la cabecera, comilla sin cerrar, bytes UTF-8 inválidos, archivo vacío, **ninguna evaluación de celdas**, y un archivo de Excel y otro de LibreOffice como fixtures
- [ ] 2.2 `CsvReader` en `application/export` junto a `CsvDocument`
- [ ] 2.3 Tests de la normalización de cabeceras (mayúsculas, acentos, espacios, orden libre, columnas desconocidas y duplicadas, columna obligatoria ausente con su nombre en el mensaje)
- [ ] 2.4 `PLANT_HEADER` y `SPECIES_HEADER` pasan a constantes compartidas por exportar, plantilla e importar, y la resolución por nombre; la exportación sigue en verde

## 3. Planificadores

- [ ] 3.1 Tests de `SpeciesImportPlanner`: fila correcta, código y nombre científico existentes, repetidos en el archivo (señala la fila previa), mezcla inexistente, rangos incoherentes, escalas, enteros mal formados, exposición y entorno desconocidos, longitudes máximas, texto recortado, columna «Ejemplares» ignorada sin aviso, varios motivos en una fila
- [ ] 3.2 `SpeciesImportPlanner` con las referencias cargadas una vez, reutilizando las reglas del alta (decisión 4)
- [ ] 3.3 Tests de `PlantImportPlanner`: fila correcta; especie por código y por nombre y su discordancia; localización por código `LOC-…` y por ruta, inexistente y ambigua; etiquetas existentes e inexistentes; estados en curso y final; fechas y meses fuera de rango; «Código» existente (error) e inexistente (aviso); «Fecha de alta» ignorada; varios motivos; **una consulta por catálogo y no por fila** (contador de consultas)
- [ ] 3.4 `PlantImportPlanner`
- [ ] 3.5 Tests de equivalencia con el alta: para cada tipo, lo que el planificador acepta es aceptado por `POST /species` / `POST /plants` y viceversa en una batería de casos límite

## 4. Servicio y API

- [ ] 4.1 Tests de la revisión (`ImportReviewApiTest`): recuentos con los tres estados, números de fila contando la cabecera, muestra de las correctas con el recuento total, columnas reconocidas e ignoradas, **no escribe nada ni consume códigos ni registra importación**, archivo vacío o solo cabecera `400`, columna obligatoria ausente `400`, más filas que el máximo `422` con el número y el máximo, no UTF-8 `400`, tipo desconocido `404`, más de 10 MB `413`
- [ ] 4.2 Tests de la aplicación (`ImportApplyApiTest`): archivo correcto crea todo con los códigos del alta en el orden del archivo, una fila con error `422` sin crear nada, avisos que se aplican, **aplicar dos veces** da errores por ya existir, fallo a mitad de la escritura (doble que falla en la fila N) deja la base y las secuencias intactas, carrera por una unicidad se traduce en `422` con el motivo, lo creado es indistinguible del alta (códigos, estado, eventos)
- [ ] 4.3 Tests de errores y plantilla (`ImportErrorsApiTest`): filas con error y aviso con sus columnas originales más `Fila`, `Resultado` y `Motivo`, BOM y nombre fechado con el `Clock`, **fórmulas neutralizadas**, `204` sin nada, la plantilla trae solo la cabecera en el orden de la exportación, la plantilla sin filas se rechaza al revisarla, tipo desconocido `404`, el archivo de errores corregido se vuelve a revisar sin errores
- [ ] 4.4 Tests del historial (`ImportHistoryApiTest`): aplicada y rechazada registradas con sus cifras, la revisión y el archivo inservible no registran, nombre malicioso recortado, paginación y orden por reciente, instante del `Clock`; el fallo al registrar no deshace una importación confirmada
- [ ] 4.5 `ImportService` (revisar, aplicar con una transacción, errores, plantilla, historial con `REQUIRES_NEW`), DTOs y `ImportController`; `Content-Disposition` de las descargas ya expuesto por CORS
- [ ] 4.6 Prueba de volumen: 2.000 plantas y 300 especies importadas con tiempos medidos y anotados en el change (revisar y aplicar)
- [ ] 4.7 La suite completa del backend sigue en verde

## 5. Frontend

- [ ] 5.1 Tests de `validateImportFile` (`.csv`, tamaño, vacío, mensaje por motivo con la misma tabla de límites del servidor) en `shared/utils`; implementarla
- [ ] 5.2 Tests del service (`transfer.api.service.test.ts`): `review`, `apply` (`422` como valor con el recuento), `errorsCsv` y `template` (descarga con el nombre de `Content-Disposition`), `history` paginado, errores de red como `ServiceResponse`; tipos y mapper de la revisión y de las líneas del historial
- [ ] 5.3 Tests de `useTransfer` (importación): pasos archivo → revisión → resultado, **`canApply` falso con errores** y mientras carga, cambiar de archivo vuelve al primer paso sin conservar la revisión, error del servidor con su mensaje y reintento sin perder el archivo, aplicar muestra el recuento creado, descargar errores y plantilla, el historial se recarga tras aplicar; implementarlo y borrar los pasos simulados de la importación
- [ ] 5.4 Tests de la pantalla (`import-export.nuxt.spec.ts`): selector con plantas y especies activos y los otros tres deshabilitados y marcados, zona de archivo con rechazo previo, resumen de tres cifras, columnas ignoradas, tabla de revisión paginada con motivos, bloqueo con su texto y `errores.csv`, aplicar y paso final con «ningún registro existente se modificó» y enlaces, actividad real con estado vacío y sin autor, **el panel de exportación sigue marcado como maqueta**; reescribir el panel de importación y la actividad en `app/pages/import-export/index.vue`
- [ ] 5.5 Suite completa del frontend en verde (`design-tokens` y `architecture` incluidos); ninguna referencia a `import-demo` ni «archivo de ejemplo» en lo que toca a importar (`grep`)

## 6. Documentación y cierre

- [ ] 6.1 [ADR-019](../../../docs/adr/) de importación a CSV (todo o nada, sin estado entre revisar y aplicar, planificador único, lectura propia, historial con `REQUIRES_NEW`) y su fila en `docs/adr/README.md`
- [ ] 6.2 `docs/diagramas/modelo-datos-actual.md` (`V19`), `README.md` con los endpoints, límites, formato de columnas y el límite de reimportar plantas sin código
- [ ] 6.3 Ticket T-29 repartido (importación hecha; configuración pasa a **T-29b** con su ticket), historia 1.19 (importación y actividad hechas; exportación desde la pantalla pendiente) y `CLAUDE.md` con el estado
- [ ] 6.4 Contraste final con `transfer` del prototipo, bloque a bloque, con lo que se aparta (actividad sin autor, tipos no disponibles, sin archivo de ejemplo) y lo que sigue marcado (exportación)
- [ ] 6.5 Comprobar contra el backend real en Docker: importar un archivo de 2.000 plantas generado, ver la revisión con errores sembrados, descargar `errores.csv`, corregir, aplicar y comprobar inventario, códigos e historial; después en el navegador
- [ ] 6.6 `openspec validate importacion-csv`
