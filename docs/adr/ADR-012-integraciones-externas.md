# ADR-012 - Integraciones con servicios externos

**Estado:** Aceptado
**Fecha:** 2026-09-02
**Origen:** change `recomendaciones-ia` (T-04)

## Contexto

T-04 trae la primera integración con un servicio externo: la API de OpenAI. Eso plantea tres preguntas que ningún ADR anterior responde y que volverán a aparecer con cualquier integración futura —un proveedor de meteorología, un servicio de notificaciones, un almacenamiento de imágenes—.

**Dónde vive el contrato.** [ADR-006](ADR-006-aislamiento-del-dominio.md) fija el patrón de puertos para los repositorios en `domain/repos`, y descarta explícitamente formalizar puertos en `domain` para cada integración externa. Pero no dice dónde van entonces.

**Qué pasa cuando el servicio falla.** Un proveedor externo se cae, tarda demasiado o devuelve algo raro. Nada de eso es culpa del cliente que hizo la petición, y ninguno de los códigos que el API usaba hasta ahora (400, 404, 409) lo describe.

**Y una trampa concreta**: desde [ADR-011](ADR-011-invariantes-de-negocio-en-el-dominio.md), el manejador global traduce `IllegalArgumentException` a `400`. Los enumerados de dominio de [ADR-007](ADR-007-enums-de-dominio.md) lanzan exactamente esa excepción ante un valor desconocido. Si un adaptador deja escapar el fallo al interpretar la respuesta del proveedor, **una respuesta rara del servicio externo se le reprocha al cliente como si su petición fuera inválida**.

## Decisión

**El contrato es un puerto en `application`, y el adaptador vive en `infrastructure`.** No en `domain`: un servicio externo es un colaborador del caso de uso, no un concepto del modelo — una planta no sabe que existe una IA. Es la diferencia con los repositorios, cuyo puerto sí está en `domain` porque persistir una entidad sí es parte de su historia.

**Por el puerto viajan hechos, no formato.** La capa de aplicación reúne los datos ya resueltos y el adaptador los convierte en lo que el proveedor entienda —un prompt, un cuerpo JSON, unos parámetros de consulta—. Dos cosas se ganan con eso: el caso de uso no se llena de fraseo específico del proveedor, y el doble de test recibe datos, de modo que un test puede afirmar **qué** se mandó sin depender de cómo se redacta.

**El adaptador es la frontera de errores: captura todo y lo envuelve.** Red, tiempo de espera, respuesta vacía, JSON que no encaja, valor desconocido en un enumerado — todo sale del adaptador como una excepción propia de la integración. Nada de lo que ocurra hablando con un tercero debe propagarse en su forma original, y menos aún como una excepción que otro manejador ya interpreta de otra manera.

**Un fallo del proveedor responde `502 Bad Gateway`**, con el cuerpo de error uniforme del API. Es lo que significa: el sistema aguas arriba no dio una respuesta utilizable. No `503`, que diría que somos nosotros los que no podemos atender; no `500`, que oculta de quién es el problema; y no `4xx`, que se lo achacaría al cliente.

**Nada se persiste a medias.** Si la integración falla, el estado queda como estaba y la operación se puede reintentar.

**La llamada externa ocurre fuera de la transacción de base de datos.** Una petición HTTP puede tardar segundos, y tenerla dentro retiene una conexión todo ese rato. Cuando el caso de uso necesita leer, llamar y escribir, los límites transaccionales se abren y cierran explícitamente alrededor de la llamada, no englobándola.

**La sustitución en test es un doble del puerto**, con `@TestConfiguration` y `@Primary`, como el reloj de [ADR-010](ADR-010-fechas-y-auditoria.md). Sin librería de mocking ni servidor HTTP falso: el proyecto no tiene ninguna y no las necesita para esto. Ese doble es lo que permite que la suite —y el E2E— corran sin red.

**El cliente HTTP es el `RestClient` de Spring**, que ya viene con `spring-boot-starter-web`. Una integración de dos llamadas no justifica una dependencia nueva.

**La configuración va por variables de entorno** con el patrón `${VAR:default}`. Sin credencial configurada, la integración falla con su `502` y **el resto del API sigue funcionando**: una integración caída no impide arrancar.

## Alternativas consideradas

* **El puerto en `domain`**, coherente con `domain/repos`: mete en el modelo un concepto que no es suyo, y es justo lo que ADR-006 descartó.
* **Sin puerto, llamando al proveedor desde el servicio**: una clase menos y ningún punto de sustitución, de modo que la suite necesitaría red o un servidor falso.
* **Pasar el formato ya construido por el puerto** (el prompt como cadena): ata los tests al fraseo y mezcla la redacción con el caso de uso.
* **Dejar propagar las excepciones del proveedor**: más corto, y con el efecto de que un `IllegalArgumentException` de un enumerado acabe como `400` culpando al cliente.
* **Responder `503` o `424`**: `503` describe una indisponibilidad nuestra; `424` tiene semántica de WebDAV y se entiende peor.
* **Un servidor HTTP falso en los tests** (WireMock, MockWebServer): ejercitaría además el cliente y el parseo, a cambio de una dependencia de test nueva y de tests más lentos.
* **Un SDK del proveedor o `spring-ai`**: resolverían el cliente y el parseo estructurado, a cambio de una dependencia grande y en movimiento para un único caso de uso.
* **Reintentos, backoff o circuit breaker**: la resiliencia avanzada queda fuera mientras haya una sola integración y un solo usuario. Un tiempo de espera y un error controlado.

## Consecuencias

* Añadir una integración nueva es un patrón repetible: puerto en `application`, adaptador en `infrastructure`, doble en test, `502` al fallar.
* La suite no depende de la red ni de la disponibilidad de terceros, y el E2E de T-07 puede ejercitar el flujo completo.
* El cliente distingue "te has equivocado tú" de "el servicio de terceros ha fallado", que son acciones distintas por su parte.
* **El adaptador es el único punto que impide que un fallo del proveedor se convierta en `400`.** Si alguien deja escapar una excepción de parseo, ADR-011 la traducirá mal. Cada integración debe llevar un test que provoque una respuesta ininterpretable y afirme el `502`.
* Los límites transaccionales explícitos alrededor de la llamada son más verbosos que un `@Transactional` en el método, y esa verbosidad es deliberada: hace visible dónde empieza y acaba cada transacción.
* Sin resiliencia, un hipo del proveedor llega al usuario como un `502`. Se acepta porque no se ha persistido nada y puede reintentar.
