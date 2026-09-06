# Tasks: esqueleto-plantas

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). La ficha se construye por bloques y la suite queda en verde al final de cada uno.

## 1. El historial, que nunca se ha consumido

- [x] 1.1 Comprobado contra el backend levantado. **Lo que se encontró:** responde el envelope `PageResponse` como cualquier listado; **omite** los valores no informados en lugar de mandarlos a `null`, igual que el alta; **no trae la recomendación embebida** —el campo `recommendation` del tipo nunca lo puebla este endpoint—, así que el análisis hay que pedirlo aparte, que es justo lo que asumía el design; y el orden descendente **lo garantiza el API** con `@SortDefault(sort = ["recordedAt", "id.id"], DESC)`, con desempate estable
- [x] 1.2 Escribir el test del composable que lista lecturas de una planta y las traduce a eventos de cronología, con el service doblado: orden descendente, valores no informados omitidos, y lista vacía. En rojo
- [x] 1.3 Implementar el composable en `src/features/care-records/composables/`, hasta que 1.2 pase

## 2. Cabecera y datos de ejemplo

- [x] 2.1 Crear `src/features/plants/mocks/` con los datos que el API no sirve —código, estado, contexto botánico, fotografía, aviso, próximo trabajo y los eventos de cronología que no son lecturas—, cada fichero con la cabecera que nombre el ticket que lo borra; verificar que solo los importa el service
- [x] 2.2 Escribir `test/plant-header.nuxt.spec.ts`: muestra nombre, especie y localización reales; presenta las tres acciones; y **marca como ejemplo** lo que no es real. En rojo
- [x] 2.3 Implementar `PlantHeader` en `src/features/plants/components/`, hasta que 2.2 pase

## 3. La ficha: estructura y resumen

- [x] 3.1 Ampliar `test/plant-detail.nuxt.spec.ts` con los escenarios «Secciones de la ficha» y «Resumen del estado actual»: se cambia de sección sin salir de la planta, las no construidas lo explican, y el resumen sale de las lecturas reales. En rojo
- [x] 3.2 Reescribir `app/pages/plants/[id].vue` con la cabecera, las pestañas y «De un vistazo» sobre `UiStatTile`, hasta que 3.1 pase
- [x] 3.3 Comprobar que los escenarios de T-05 que sobreviven —planta existente, planta sin tags, planta inexistente— siguen pasando **sin relajar ninguna aserción**

## 4. La ficha: cronología

- [x] 4.1 Escribir los escenarios de «Historial de lecturas de una planta»: lecturas anteriores a la sesión, lectura recién registrada que aparece en su lugar, valores no informados omitidos, planta sin lecturas, y análisis pedido desde una entrada sin afectar a las demás. En rojo
- [x] 4.2 Montar la cronología con `UiTimeline`, mezclando las lecturas reales con los eventos de ejemplo, hasta que 4.1 pase
- [x] 4.3 Pedir el análisis **bajo demanda** por entrada, tratando el `404` como «todavía no hay» y no como error de la pantalla

## 5. La ficha: paneles y diálogo de lectura

- [x] 5.1 Escribir el test del panel de cuidados efectivos con su nota de herencia, y el de los escenarios «El formulario no ocupa la ficha» y «Salir del formulario sin registrar». En rojo
- [x] 5.2 Mover `CareRecordForm` dentro de `UiDialog` y ajustar **solo los pasos que lo abren** en los tests de T-05 que lo ejercitan; verificar con `git diff` que no se relaja ninguna aserción
- [x] 5.3 Implementar los paneles laterales —recomendación, cuidados efectivos y próximo trabajo—, hasta que 5.1 pase

## 6. Inventario

- [x] 6.1 Escribir los escenarios «Ordenar el inventario» y «Criterios de filtrado aplicados»: ordenar vuelve a pedir al API con ese criterio y no reordena solo la página visible. En rojo
- [x] 6.2 Reescribir `app/pages/plants/index.vue` sobre `UiTable` con ordenación y `UiFilterBar`, con la celda identificativa del wireframe, hasta que 6.1 pase
- [x] 6.3 Comprobar que los escenarios de T-05 del listado siguen pasando sin relajarse

## 7. Alta y edición

- [x] 7.1 Escribir los escenarios «Alta desde el formulario», «Edición prellenada» y «Campo que el API no admite guardar». En rojo
- [x] 7.2 Extraer el formulario compartido a un componente de la feature, en secciones con `UiFormSection`
- [x] 7.3 Añadir la ruta de edición prellenada, que persiste los tags y **advierte de lo que no se guarda**, hasta que 7.1 pase

## 8. Cierre

- [x] 8.1 `yarn test` con toda la suite en verde, incluido `test/architecture.spec.ts`
- [x] 8.2 Comprobado. Lo eliminado en los tests de T-05 son **solo localizadores y el doble genérico**: `data-test="last-reading"` pasa a `reading-<id>` porque la lectura vive ahora en la cronología, y `api.get.mockResolvedValue` pasa a un doble que distingue endpoints, porque la ficha pide dos. Ninguna aserción se debilita. **Una se invierte a propósito**: `care-record-form` existe → no existe al abrir la ficha, que es la requirement modificada en este change
- [x] 8.3 **Parcial.** La ficha responde `200` contra el backend real y el servidor no registra ni un aviso; en SSR pinta el estado de carga, que es lo correcto (ADR-013). La forma real de `GET /plants/{id}/care-records` se verificó con `curl` en la tarea 1.1. **No se pudo recorrer a ojo**: el Chrome conectado a la sesión no alcanza el `localhost` de esta máquina. Queda pendiente de revisión humana el recorrido completo cargar → registrar → ver en cronología → pedir análisis
- [x] 8.4 `openspec validate esqueleto-plantas --strict` en verde, `CLAUDE.md` al día, y abrir el ticket del endpoint de edición de planta que este change ha destapado

## 9. Corrección: «De un vistazo»

Revisando la ficha contra el wireframe, el resumen estaba montado con `UiStatTile` —la cifra grande y navegable del Dashboard— cuando el wireframe pide otra cosa: **una sola superficie dividida en cuatro**, con el valor como línea compacta («16 ago · 450 ml», «24 °C · 31 %»), que no es un número. Confundirlos convierte un resumen en un panel de indicadores, que es justo lo que §4 pide no hacer.

- [x] 9.1 `UiSummaryGrid` al kit, con su test de los siete escenarios y su muestra en `/ui-kit` junto a `UiStatTile`, para que la diferencia entre los dos se vea
- [x] 9.2 `plantGlance` como función pura con `now` por parámetro —misma disciplina que la agenda y que el `Clock` de ADR-010—, que compone las cuatro magnitudes: riego y medición reales, tarea y floración marcadas como ejemplo
- [x] 9.3 La ficha usa el resumen en lugar de las cuatro tarjetas; `CLAUDE.md` anota la diferencia entre ambos componentes para que no se repita

## 10. Corrección: la cronología

La estructura estaba bien pero le faltaba la personalidad del wireframe, que no es decoración: es lo que la hace legible de un vistazo.

- [x] 10.1 `UiTimeline`: **línea continua** detrás de las marcas en lugar de un segmento por evento, y **marca de color por tipo** —el tono entra en el descriptor del tipo—, con el borde grueso del color del fondo para que la marca perfore la línea en vez de superponerse
- [x] 10.2 Los valores de una lectura pasan de lista plana a **rejilla comparable**, reutilizando `UiSummaryGrid` en densidad `compact`: es el mismo patrón que «de un vistazo» a otro tamaño, no un componente nuevo
- [x] 10.3 El análisis de IA pasa de panel aparte a **tira dentro de la entrada**: el análisis pertenece a su lectura, y separarlo rompía esa relación. Se conservan sus cuatro tests, y el control **no desaparece mientras genera**: se deshabilita
- [x] 10.4 Muestra actualizada en `/ui-kit`; suite en verde

## 11. Correcciones: ausencias y modal de lectura

- [x] 11.1 La cronología muestra **las cinco magnitudes**, con la ausente marcada como `—` en vez de omitirla: con columnas variables, dos lecturas de la misma planta no se pueden comparar de un vistazo. Un **cero informado sigue siendo un dato**, y hay test que lo distingue de la ausencia. Modifica el escenario «Valores no informados» de la spec
- [x] 11.2 **La fecha de la lectura se pide**, propuesta como ahora y no futura. El API ya aceptaba `recordedAt` desde T-03 y nadie lo enviaba; §13.4 del documento de producto lo pide explícitamente. Modifica la requirement «Registro de una lectura de cultivo»
- [x] 11.3 **El rango efectivo de la planta junto a cada magnitud**, desde la especie: dato real, y evita salir del diálogo a comprobarlo
- [x] 11.4 `UiField` gana `layout="row"` —etiqueta y ayuda a la izquierda, control a la derecha— con su test: lo pide la rejilla de mediciones y es capacidad del kit, no CSS de pantalla
- [x] 11.5 La modal dice **cuántos valores va a guardar y que nada se guarda hasta confirmar**, y ofrece generar el análisis al guardar —que el API ya permitía—. La observación queda **deshabilitada y marcada**: no hay columna donde guardarla hasta T-20

## 12. Corrección: el editor de planta

El formulario compartido estaba construido sin mirar el wireframe, que define un **editor de seis secciones con navegación lateral** y no un panel de tres campos.

- [x] 12.1 `UiEditorNav` al kit, con su test y su requirement: marca dónde estás y qué secciones están completas, y **no se expone como pestañas** —las pestañas cambian de vista; esto recorre un mismo formulario—
- [x] 12.2 El editor pasa a seis secciones: especie y código, identificación, localización, origen y edad, fotografías, y cuidados efectivos
- [x] 12.3 La especie se elige de una **lista buscable de tarjetas**, no de un `select`; la elegida se distingue por borde y fondo, no solo por la marca de comprobación
- [x] 12.4 Al fallar la validación, el editor **lleva a la sección del campo que falta**: en seis secciones, decir «falta un campo» sin decir dónde no sirve
- [x] 12.5 Lo que el API no acepta —código, estado, descripción, etiquetas al crear, origen, edad, fotografías y cuidados personalizados— se muestra **deshabilitado y con su ticket**, no editable. `POST /plants` acepta exactamente `nickname`, `locationId` y `speciesId`, y el pie del editor lo dice

## 13. Corrección: el inventario

Tenía tres columnas y un filtro; el wireframe define seis columnas con selección y cinco filtros.

- [x] 13.1 Las **seis columnas** de la pantalla: planta —con miniatura, código y nombre—, especie, localización, último riego, atención y acciones. Las tres últimas son maqueta y van marcadas
- [x] 13.2 **Selección de filas y acciones masivas**, que `UiTable` ya soportaba y la pantalla no usaba. Las acciones —crear tarea, mover, etiquetar— quedan deshabilitadas hasta T-22 y T-18
- [x] 13.3 Los cinco filtros del wireframe. **Localización y etiqueta filtran de verdad** —el API los admite desde T-02—; búsqueda por texto (T-21), especie y estado (T-16) van **deshabilitados y con su ticket**, no ausentes: la pantalla enseña la forma completa y dice qué parte es dato
- [x] 13.4 Selector de **columnas visibles**, que `UiTable` también soportaba, con la identificativa fuera de las ocultables

## 14. Corrección: alineación de la barra de filtros

Un campo con texto de ayuda desplazaba su control respecto a los que no la tenían, y el botón de columnas quedaba descolgado.

- [x] 14.1 **La causa no era el `small`**, sino `align-items: center` en la fila: con cajas de alturas distintas cada una se centraba. Pasa a alinear **por arriba**, así los rótulos coinciden y con ellos los controles, y la ayuda cuelga debajo ocupando lo que necesite
- [x] 14.2 **Descartado reservar la altura de la ayuda**: sería un hueco fijo y la ayuda puede ocupar una línea o dos, así que volvería a descuadrar al envolver; y añadiría aire bajo todos los campos del proyecto para resolver un problema de una fila
- [x] 14.3 `UiFieldAction` para el control sin rótulo. El hueco es **un rótulo vacío con el estilo de los rótulos de campo**, no un margen a medida: lo calcula la propia tipografía, así que no se rompe al retocar el sistema
- [x] 14.4 `UiFilterBar` pasa a `fieldset` + `legend` oculta: agrupa controles de formulario, igual que `UiFormSection`, y queda nombrada nativamente en vez de por un `aria-label`
