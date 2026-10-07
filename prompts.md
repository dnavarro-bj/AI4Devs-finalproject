# Prompts principales utilizados en Cactify

Esta selección recoge un prompt especialmente relevante para cada una de las tres áreas solicitadas
en la entrega: modelo de datos, frontend y backend, y un segundo prompt de octubre, más corto, que
muestra cómo se siguió trabajando sobre cada una. Las conversaciones completas se conservan en
[chats/](chats/) y los textos citados mantienen la redacción original.

## 1. Modelo de datos — definición del alcance funcional

Fuente: [conversación del 3 de septiembre de 2026](chats/2026-09-03.md), 00:00.

### Prompt

> quiero hacer unos wireframes y prototipos, esto tendrá que ir en la caperta docs y esa luego será
> la referencia visual para implementar las distintas pantallas y features del front
>
> pero antes de nada vamos a revisar las user stories. Ahora mismo tenemos un listado de cactus y
> algunas cosas más donde se registran pero solo lo quería como prueba y para ver pintado de datos.
> Ahora quiero ya a ponerme en serio con todas las funcionalidades así que vamos por partes.
>
> Quiero que des una búsqueda por inet y me digas que cosas básicas necesitaría para gestionar unos
> 500-2000 cactus incluyendo lo que ya tenemos del modelo actual, primero a gran escala para poderlas
> poner en el menu lateral
>
> Yo tendría un dashboard que mirara a ver si hay alguna alerta sobre algunas plantas, tendría
> secciones para añadir localizaciones, soil mix, especies, alertas, configuración
>
> Arriba en la barra tendría el buscador
>
> Todas las pantallas deben tener un breadcrumbs

### Relevancia y resultado

Es el origen del modelo de datos conceptual del producto completo. Antes de decidir tablas o
relaciones se investigaron las necesidades de una colección de 500–2000 ejemplares y se definieron
las funcionalidades que el modelo debía soportar.

Las siguientes rondas de conversación añadieron fotografías, descripciones, floraciones,
comentarios, códigos de inventario, historial, tareas y automatizaciones futuras. A partir de ese
alcance se identificaron o diseñaron entidades como `Species`, `Plant`, `SoilMix`, `Location`,
`Tag`, `CareRecord`, fotografías, eventos, intervenciones, tareas y alertas, además de sus relaciones
y ciclos de vida.

El resultado se consolidó en la
[definición funcional y de UX](docs/producto/definicion-funcional-y-ux.md) y se trasladó a tres
vistas del modelo:

- [Modelo de datos actual](docs/diagramas/modelo-datos-actual.md).
- [Borrador de gestión de plantas](docs/diagramas/borrador-modelo-datos-gestion.md).
- [Borrador de tareas y alertas](docs/diagramas/borrador-modelo-datos-tareas.md).

La principal aportación humana fue partir del problema y de la forma de trabajar, no de una lista de
tablas. También se corrigieron propuestas posteriores de la IA, como dividir `CareRecord`: el riego
se mantuvo junto a las mediciones porque será un dato observable cuando se automatice y porque se
quiere correlacionar con el estrés de las plantas.

### Segundo prompt: tareas sobre varias plantas

Fuente: [conversación del 6 de octubre de 2026](chats/2026-10-06.md), 23:07.

> ah vale, son para hacer acciones en bulk, es la opción A, no se guarda ningúna selección en BBDD
> realmente, en el front se seleccionarán y luego se dará a crear tarea que arrastrará la selección a
> la modal de tarea, en el modelo obviamente tiene que permitir un N:M entre tareas y catus con tabla
> intermedia

Respondía a una duda de la IA al preparar T-22 sobre qué significaba «seleccionar plantas». Una
respuesta de dos líneas cerró la decisión: la selección vive solo en el frontend y el modelo guarda
la relación N:M. Dio lugar a la tabla `task_plant`, al destino exclusivo de una tarea (una localización
**o** de 1 a 500 plantas) y a «Crear tarea» desde la selección del inventario. Que una tarea no es un
cuidado ya estaba decidido; aquí se fijó cómo se asocia a los ejemplares.

## 2. Frontend — arquitectura orientada a features

Fuente: [conversación del 6 de septiembre de 2026](chats/2026-09-06.md), 05:48.

### Prompt

> de momento está bien pero vamos a hacer una cosa. Quiero especificar un poco la arquitectura del
> frontend así como hice con el back. Quiero que el front tenga una arquitectura orientada a
> features, puedes ver el diseño en ../../bjaland/hub4fans/studio-monorepo/frontend, si echas un
> vistazo a su claude.md verá´s como lo quiero

### Relevancia y resultado

Este prompt afectó a todo el frontend, no solo a una pantalla. En lugar de describir la arquitectura
desde cero, se proporcionó como referencia otro proyecto real del autor para que la IA extrajera el
patrón y lo adaptara a Cactify.

El resultado fue [ADR-015](docs/adr/ADR-015-arquitectura-del-frontend.md), el ticket
[T-25](docs/tickets/T-25-arquitectura-del-frontend.md) y la migración del código a una organización
por features con el siguiente orden de dependencias:

```text
Component → Composable → Service → HTTP
                ↘ Store, solo para estado compartido
```

También se fijaron estas reglas:

- Los componentes no acceden al API ni al store directamente.
- Los composables contienen el estado y la orquestación de cada caso de uso.
- Los services son la única capa que habla con el backend.
- Los errores viajan como valores mediante `ServiceResponse<T>`.
- Los DTO no llegan a los componentes.
- Los datos de ejemplo se consumen desde los services tras una bandera.

La propuesta de la IA se revisó antes de aplicarla: se conservaron el CSS propio y los diálogos de
Cactify, y no se copiaron elementos del proyecto de referencia que no encajaban, como Tailwind,
multi-tenant o internacionalización por feature.

### Segundo prompt: pantallas fieles al wireframe

Fuente: [conversación del 6 de octubre de 2026](chats/2026-10-06.md), 21:13 y 21:18.

> tenemos los wireframes en [index.html](docs/wireframes/cactify-admin/index.html) y quiero que las
> pantallas que hay actualmente se ajusten a él. Tienes la app arrancada en localhost:3001

> vale pero qquiero revisar el diseño de las pantallas, una a una, para que qeuden más parecidos al
> wireframe, creando los componentes necesarios para que se puedan reutilizar

El primer intento ajustó los datos pero no la composición, y el segundo mensaje cambió el método:
pantalla a pantalla, comparando con el prototipo en el navegador y extrayendo cada patrón repetido a
un componente del kit. Salieron la revisión de Dashboard, plantas, localizaciones, alertas, especies y
sustratos, y la regla que ahora rige el proyecto: una pantalla construida reproduce la composición de
su `data-screen` del wireframe y lo que aún no existe va marcado con su ticket, no omitido.

## 3. Backend — generación de recomendaciones con IA

Fuente: [conversación del 2 de septiembre de 2026](chats/2026-09-02.md), 14:56.

### Prompt

> te voy a mandar esto que es un prompt algo antiguo antes de los cambios que hemos hecho hoy,
> cualqueir contradicción prevalece lo que hayamos hecho hoy: Prepara el change de T-04
> (docs/tickets/T-04-servicio-de-recomendaciones-con-ia.md, historia 0.4): servicio y endpoint de
> recomendacion de IA por lectura. No lo propongas hasta archivar api-crud-plantas y
> api-lecturas-cultivo: openspec/specs/ solo contiene data-model. Numera la migracion por lo que
> quede libre en backend/src/main/resources/db/migration tras T-03 (hoy solo V1 y V2); ADR-001
> prohibe editar una aplicada.
>
> No reinventes: la tabla ai_recommendation, la entidad AIRecommendation (var riskLevel: String;
> risk_level TEXT NOT NULL, sin CHECK ni UNIQUE) y AIRecommendationId. Reutiliza el patron puerto en
> domain/repos (findOneById) mas Jpa*Repository en infrastructure/persistence sin adaptador, amplia
> web/errors/ApiExceptionHandler.kt, pon las excepciones en application/ApplicationExceptions.kt y
> extiende AbstractApiIntegrationTest, cuyo clearPlants() ya borra ai_recommendation. ADRs
> vinculantes que openspec/config.yaml no resume (llega a ADR-005): ADR-006 enmendado (adaptador de
> OpenAI en infrastructure; DTOs montados en application dentro de la transaccion, open-in-view
> false), ADR-007 (da el codigo de RiskLevel y RiskLevelConverter con @Converter(autoApply=true) para
> infrastructure/persistence/converters, hoy vacio: aplicalo, no lo re-decidas) y ADR-008 (ids como
> cadena). Por ADR-002 las restricciones nuevas bajan a la base de datos; declara el impacto sobre la
> capability archivada data-model.
>
> Decide, con la alternativa descartada escrita. Cuantos campos persiste la recomendacion: 0.4,
> README 1.2, flujo-e2e.md y T-05 piden riesgo, explicacion, accion y prioridad; T-04 parsea dos;
> dejar dos columnas, anadir recommended_action y priority (enum con su CHECK), o JSONB; si te quedas
> en dos, apunta el ajuste documental. Verbo del endpoint: el GET generador del ticket frente a POST
> que genera mas GET que solo lee (404 si falta); condiciona a T-06 (hasta 25 llamadas por pantalla)
> y T-07. UNIQUE (care_record_id), inexistente pese al ||--o| del diagrama, y que devuelve la
> carrera: la existente o 409. Vocabulario de RiskLevel: low/medium/high de ADR-007 frente a
> bajo/moderado/alto de README:284 y del criterio 1 del ticket. Punto de sustitucion del proveedor
> para que T-07 corra sin red (ADR-006 no formalizo puertos para la IA): no hay mockk, WireMock ni
> MockWebServer. Cliente, modelo, timeout y reintentos: no hay dependencia de OpenAI ni cliente HTTP
> salvo starter-web en build.gradle.kts, ni propiedades suyas en application.yml; OPENAI_API_KEY ya
> llega por docker-compose. Codigo del fallo del proveedor: 502, 503 o 424. Definicion de ultimo
> riego (water_amount_ml > 0 frente a IS NOT NULL), que va al prompt si no hay ninguno, y si las
> desviaciones van precalculadas contra species.min_*/max_*. Que responde si el careRecordId cuelga
> de otra planta. Y donde se documenta el prompt: prompts.md ya existe con otro proposito.
>
> Dos trampas pagadas: RiskLevel(value) lanza IllegalArgumentException, hoy sin handler ni
> server.error configurado, y saldria como 500 sin campo message; AIRecommendation.createdAt lleva
> insertable=false pero NO @Generated(event=[EventType.INSERT]) como Plant.createdAt, y vuelve null
> tras el insert.
>
> Non-goals: overrides por ejemplar (0.7), API de especies, frontend, regeneracion, resiliencia
> avanzada, OpenAPI y autenticacion; el presupuesto de ~30 h aprieta.
>
> Nombre del change: recomendaciones-ia

### Relevancia y resultado

Este prompt desarrolla la funcionalidad diferencial del backend y conecta API, aplicación, dominio,
persistencia e integración externa. No ordena directamente una solución: enumera las decisiones que
el diseño debe cerrar, exige comparar alternativas y delimita expresamente lo que queda fuera.

El change resultante definió:

- `POST` para generar una recomendación y `GET` para consultar la existente.
- Riesgo, explicación, acción recomendada y prioridad como respuesta persistida.
- Una única recomendación por lectura, con idempotencia también ante peticiones concurrentes.
- Un puerto de aplicación y un adaptador de OpenAI en infraestructura.
- Un doble del proveedor para ejecutar los tests sin acceder a la red.
- Desviaciones calculadas por el backend contra los rangos reales de la especie.
- Traducción de los fallos de red, timeout o parseo a un error controlado `502`.

Durante la revisión se actualizaron las partes antiguas del prompt con las decisiones más recientes:
el `Clock` y el manejo de `IllegalArgumentException` ya estaban resueltos, y la consulta del último
riego debía ignorar registros posteriores a la lectura analizada. El resultado está documentado en
la capability de recomendaciones, el código del backend y
[los prompts que Cactify envía a la IA en ejecución](docs/prompts-ia.md).

### Segundo prompt: cronología paginada

Fuente: [conversación del 7 de octubre de 2026](chats/2026-10-07.md), 10:27.

> genial, una cosa más, quiero paginar el timeline (con page + offset me vale), no sé si está
> paginado o no pero no quiero que se cargue entero. Solo los 10 ultimos y cuando se vaya haciendo
> scroll que siga cargando más

Es una petición breve con una consecuencia de diseño grande, porque la cronología une lecturas,
cambios de estado, movimientos, comentarios, intervenciones y floraciones, que viven en tablas
distintas. El resultado fue `GET /plants/{id}/timeline`: un `UNION ALL` nativo paginado, con el filtro
por tipo aplicado en el servidor **antes** de paginar y una consulta de detalle por tipo, más el
scroll infinito de 10 en 10 en la ficha. Se mantuvo la regla de [ADR-009](docs/adr/ADR-009-paginacion-obligatoria.md):
no existe un listado sin límite.

## Conclusión

Los tres prompts muestran usos distintos de la IA durante el proyecto: descubrir las necesidades
que dan forma al modelo, adaptar una arquitectura frontend ya conocida y diseñar una integración de
backend compleja mediante decisiones contrastadas. En los tres casos, la salida fue revisada y
corregida antes de incorporarse al proyecto. Los segundos prompts de cada área, más cortos, muestran
el otro modo de trabajo: decisiones de una frase que fijan un modelo, un método de revisión o un
requisito de rendimiento que la IA convierte después en cambios completos.
