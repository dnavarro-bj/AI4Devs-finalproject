> Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)): cada bloque funcional empieza por los tests de sus escenarios (rojo) y sigue con la implementación mínima que los pone en verde.
>
> **Precondición cumplida**: el catálogo de especies lo publicó `api-especies` (T-08), ya implementado y archivado. El bloque 6 consume `GET /species` para poblar el selector y `GET /species/{id}` para los rangos de la especie elegida — el listado no los trae (decisión 1 del design).

## 1. Runner de tests y andamiaje del frontend

- [x] 1.1 Añadir `vitest`, `@nuxt/test-utils`, `@vue/test-utils` y `happy-dom` como `devDependencies` de `frontend/package.json`, más los scripts `test` y `test:watch`; regenerar `yarn.lock` en el mismo commit (decisión 3 del design). Verificar: `yarn install --frozen-lockfile` termina sin error.
- [x] 1.2 Crear la configuración de Vitest con entorno Nuxt y un test trivial de humo. Verificar: `yarn test` ejecuta la suite y pasa.
- [x] 1.3 Sustituir `app/app.vue` (hoy `<NuxtWelcome />`) por un layout mínimo con `<NuxtPage />` y las variables de estilo del layout único (decisión 8). Verificar: `yarn dev` sirve la aplicación sin la pantalla de bienvenida de Nuxt.
- [x] 1.4 Enmendar `docs/adr/ADR-005-tdd.md` con la elección de runner para el frontend. Verificar: el ADR menciona Vitest y `@nuxt/test-utils` y el resumen de ADR-005 en `openspec/config.yaml` sigue siendo coherente.

## 2. CORS en el backend

- [x] 2.1 Escribir el test de integración de los escenarios de la requirement *Acceso al API desde un origen distinto* (lectura desde otro origen, comprobación previa de un `POST` con cuerpo, comprobación previa sobre una ruta inexistente sin `5xx`). Verificar: los tres fallan en rojo.
- [x] 2.2 Implementar el `WebMvcConfigurer` de CORS abierto en `infrastructure` —todas las rutas, métodos y cabeceras que el API usa, sin credenciales (decisión 2)—. Verificar: los tests de 2.1 pasan y `./gradlew test` sigue en verde.
- [x] 2.3 Escribir `docs/adr/ADR-013-acceso-del-navegador-al-api.md` con la plantilla de `docs/adr/template.md`, recogiendo las alternativas descartadas y la evolución hacia orígenes por variable; añadir su resumen a `openspec/config.yaml` y la entrada a `docs/adr/README.md`. Verificar: el ADR existe, está enlazado desde el README de ADRs y `config.yaml` lo resume.

## 3. Contrato del API tipado y capa de acceso

- [x] 3.1 Escribir los tests del escenario *Identificador conservado íntegro*: un identificador por encima de `2^53` que entra y sale del cliente sin alterarse. Verificar: falla en rojo.
- [x] 3.2 Escribir los tests de los escenarios *Error del API con cuerpo uniforme* y *Error sin cuerpo interpretable* sobre el envoltorio de errores. Verificar: fallan en rojo.
- [x] 3.3 Crear `app/types/api.ts` con los tipos del contrato publicado —`PageResponse<T>`, `PlantSummary`, `PlantDetail`, `SpeciesCare`, `Location`, `Tag`, `CareRecord`, `Recommendation`, `ApiError`—, con **todo identificador como `string`** y `riskLevel`/`priority` como uniones de literales (decisiones 5 y 7). Verificar: `yarn build` compila sin errores de tipos.
- [x] 3.4 Implementar `useApi()` sobre `$fetch` con `runtimeConfig.public.apiBaseUrl`, traduciendo el fallo al `message` del cuerpo uniforme cuando lo haya y a un mensaje genérico cuando no. Verificar: los tests de 3.1 y 3.2 pasan.

## 4. Listado del inventario

- [x] 4.1 Escribir los tests de los escenarios *Inventario con plantas*, *Inventario vacío*, *Inventario con más plantas de las que caben en una página* y *Navegación al detalle*, con el cliente HTTP doblado devolviendo un `PageResponse`. Verificar: fallan en rojo.
- [x] 4.2 Implementar el store `plants` de Pinia con la página actual del inventario y la planta abierta (decisión 6), y el composable `usePlants` sobre `GET /plants` consumiendo el envelope y enviando `page` sin fijar `size`. Verificar: los tests de listado y paginación de 4.1 pasan.
- [x] 4.3 Implementar la página `/plants` con la tabla del inventario, el mensaje de inventario vacío, los controles de página y el enlace al detalle; redirigir `/` a `/plants`. Verificar: los cuatro tests de 4.1 pasan.

## 5. Ficha de la planta

- [x] 5.1 Escribir los tests de los escenarios *Ficha de una planta existente*, *Ficha de una planta sin tags* y *Ficha de una planta inexistente*. Verificar: fallan en rojo.
- [x] 5.2 Escribir el test del escenario *Rangos en la ficha antes de registrar la lectura*. Verificar: falla en rojo.
- [x] 5.3 Implementar la página `/plants/[id]` sobre `GET /plants/{id}`: cabecera con nickname, localización y tags, y bloque de rangos de la especie con la pauta de riego (decisión 4). Verificar: los tests de 5.1 y 5.2 pasan.

## 6. Alta de una planta

- [x] 6.1 Escribir los tests de los escenarios *Alta completada*, *Alta sin nickname*, *Alta sin especie o sin localización* y *El alta es rechazada por el API*. Verificar: fallan en rojo.
- [x] 6.2 Escribir los tests de los escenarios *Rangos al elegir especie en el alta* y *Cambio de especie seleccionada*. Verificar: fallan en rojo.
- [x] 6.3 Implementar el composable `useCatalogs` sobre `GET /locations` y `GET /species`, consumiendo ambos como `PageResponse`, más una función que pida la ficha de una especie a `GET /species/{id}` y **cachee por `id`** las ya pedidas, para que volver a una especie ya vista no repita la llamada (decisión 1 del design). Verificar: los selectores se pueblan en los tests de 6.1 y 6.2, y una segunda selección de la misma especie no lanza una segunda petición.
- [x] 6.4 Implementar el formulario de alta —nickname, selector de localización, y selector de especie que al elegir una pide su ficha y muestra los seis rangos y la pauta de riego— enviando `POST /plants` con `nickname`, `locationId` y `speciesId`, y navegando a la ficha creada sin recarga. Verificar: los seis tests de 6.1 y 6.2 pasan.

## 7. Registro de una lectura de cultivo

- [x] 7.1 Escribir los tests de los escenarios *Lectura registrada*, *Lectura sin ningún valor* y *Valor fuera del rango admitido*. Verificar: fallan en rojo.
- [x] 7.2 Implementar el composable `useCareRecords` sobre `POST /plants/{id}/care-records`, sin enviar `recordedAt` (lo asigna el sistema) y omitiendo los valores no informados en lugar de mandarlos a cero. Verificar: los tests de 7.1 relativos al envío pasan.
- [x] 7.3 Implementar el formulario de lectura en la ficha con los cinco valores independientes, la comprobación de que hay al menos uno y el pintado del error del API conservando lo introducido. Verificar: los tres tests de 7.1 pasan.

## 8. Análisis de IA

- [x] 8.1 Escribir los tests de los escenarios *Análisis generado*, *Lectura que ya tiene análisis*, *Análisis en curso* y *El proveedor de IA falla*. Verificar: fallan en rojo.
- [x] 8.2 Implementar el composable `useRecommendation` sobre `POST` y `GET /plants/{plantId}/care-records/{careRecordId}/recommendation`, con estado de carga, error y resultado, y sin permitir una segunda petición mientras hay una en curso. Verificar: los tests de generación y de petición en curso de 8.1 pasan.
- [x] 8.3 Implementar el bloque de recomendación en la ficha: nivel de riesgo, explicación, acción recomendada y prioridad, con la clase `risk--{low,medium,high}` que T-06 convertirá en badge (decisión 8), el indicador de carga y el reintento tras fallo del proveedor. Verificar: los cuatro tests de 8.1 pasan.

## 9. Cierre

- [x] 9.1 Escribir y poner en verde el test del escenario *Flujo completo sin recarga manual*: alta → ficha → lectura → análisis en una sola sesión. Verificar: el test pasa.
- [x] 9.2 Ejecutar la suite completa del frontend y la del backend. Verificar: `yarn test` y `./gradlew test` en verde.
- [x] 9.3 Levantar la pila con `docker compose up --build` desde `iac/local/` y recorrer el flujo en el navegador. Verificar: la imagen del frontend construye con `--frozen-lockfile`, el navegador alcanza el API y el flujo completo funciona de punta a punta.
- [x] 9.4 Actualizar `CLAUDE.md` y `README.md` con el estado del frontend y con T-05 implementado. Verificar: ninguno sigue diciendo que el frontend es el esqueleto de Nuxt sin código de aplicación.
