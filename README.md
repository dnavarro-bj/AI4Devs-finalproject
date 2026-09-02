## Índice

0. [Ficha del proyecto](0-ficha-del-proyecto.md)
1. [Descripción general del producto](1-descripcion-general-del-producto.md)
2. [Arquitectura del sistema](2-arquitectura-del-sistema.md)
3. [Modelo de datos](3-modelo-de-datos.md)
4. [Especificación de la API](4-especificaciones-de-la-api.md)
5. [Historias de usuario](5-historias-de-usuario.md)
6. [Tickets de trabajo](6-tickets-de-trabajo.md)
7. [Pull requests](7-pull-requests.md)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

David Navarro Arias

### **0.2. Nombre del proyecto:**

Cactify

### **0.3. Descripción breve del proyecto:**

Plataforma web para la gestión de colecciones de cactus y pequeños viveros. Permite registrar plantas asociadas a una especie, introducir manualmente condiciones ambientales (humedad, temperatura, horas de luz, acidez del sustrato) y riego, y recibir recomendaciones de cuidado generadas por IA a partir de los rangos recomendados de cada especie y el historial de la planta. Nace del problema real de gestionar una colección de ~500 cactus, donde el conocimiento y el seguimiento manual (memoria, hojas de cálculo) dejan de ser viables a partir de cierto tamaño.

### **0.4. URL del proyecto:**

> Pendiente.

### 0.5. URL o archivo comprimido del repositorio

> Pendiente.

---

## 1. Descripción general del producto

> Describe en detalle los siguientes aspectos del producto:

### **1.1. Objetivo:**

Ayudar a coleccionistas y pequeños viveros a registrar sus plantas, introducir condiciones de cultivo (de momento de forma manual) y recibir recomendaciones de cuidado personalizadas basadas en la especie y en los datos registrados, para no depender de la memoria o la intuición del propietario a medida que la colección crece.

**Problema:** los coleccionistas y pequeños viveros gestionan cientos de plantas de forma manual, lo que dificulta saber qué plantas necesitan riego, detectar condiciones de estrés, mantener un historial de cuidados y tomar decisiones basadas en datos.

**Usuario principal:** propietario de una colección de cactus o de un pequeño vivero (uso individual en el MVP, con el modelo pensado para poder extenderse a varios usuarios/organizaciones en el futuro).

**Solución:** una plataforma web que registra plantas, permite introducir manualmente lecturas ambientales y de riego, y utiliza IA para generar recomendaciones de cuidado y alertas de riesgo, apoyándose en una base de conocimiento por especie (rangos de humedad, temperatura, luz y riego).

### **1.2. Características y funcionalidades principales:**

Flujo principal (E2E) del MVP:

```text
Registrar especie y sus rangos de cuidado recomendados
        ↓
Registrar un cactus seleccionando su especie y ubicación
        ↓
Introducir manualmente lecturas (humedad, temperatura, horas de luz, acidez del sustrato, riego)
        ↓
El sistema compara las lecturas con los rangos recomendados de la especie
        ↓
La IA genera una recomendación personalizada (nivel de riesgo, explicación, acción, prioridad)
        ↓
La recomendación queda guardada en el historial de la planta
```

Funcionalidades principales:

* **Catálogo de especies**: cada especie tiene una ficha con sus rangos de cuidado recomendados (humedad, temperatura, horas de luz, frecuencia orientativa de riego) y una mezcla de tierra (soil mix) recomendada. Esta base de conocimiento es determinista, no generada por IA.
* **Catálogo de mezclas de tierra (soil mix)**: mezclas reutilizables definidas por su proporción de componente orgánico y mineral (deben sumar 100%), para poder asociarlas a una o varias especies.
* **Catálogo de localizaciones**: listado plano y reutilizable de ubicaciones (p. ej. "Invernadero 1", "Bandeja A3"), para asociarlas a las plantas sin depender de texto libre. No es jerárquico en el MVP (ver evolución futura en [F.1](docs/user-stories/F.1-organizar-cactus-por-ubicacion-jerarquica.md)).
* **Catálogo de tags**: etiquetas reutilizables (p. ej. "globular", "pequeño", "sin espinas", "híbrido") asignables a varias plantas, para poder filtrar y buscar la colección de forma sencilla.
* **Inventario de plantas**: alta de cactus asociados a una especie y a una localización, con herencia de los cuidados recomendados de su especie.
* **Personalización por ejemplar**: aunque dos plantas compartan especie, un ejemplar concreto puede necesitar más o menos agua, sol, etc. El sistema debe permitir ajustar los cuidados de una planta individual sin perder la herencia de los valores no modificados de la especie (si la ficha de la especie se actualiza después, la planta que no haya sobrescrito ese campo recibe el cambio).
* **Registro de lecturas/cuidados**: introducción manual de humedad, temperatura, horas de luz, acidez del sustrato y cantidad de riego, asociadas a una planta y con fecha/hora automática.
* **Recomendaciones con IA**: la IA recibe la especie, la última lectura, el último riego y las desviaciones respecto a los rangos recomendados, y genera un nivel de riesgo, una explicación breve, una acción recomendada y una prioridad de actuación. La IA no decide de forma autónoma ni se "inventa" los rangos de cuidado: estos provienen siempre de la ficha de la especie (o de sus overrides), y la IA solo interpreta esos datos.
* **Alertas de riesgo**: se generan cuando una lectura está fuera del rango recomendado, indicando la planta afectada y visibles en un dashboard.
* **Historial**: consulta de lecturas, riegos y recomendaciones de IA ordenadas por fecha, accesible desde la ficha de cada planta.

**Explícitamente fuera del alcance del MVP** (quedan documentadas como evolución futura del producto, no como parte de esta entrega):

* Automatización física de riego (bombas, válvulas).
* Integración en tiempo real con sensores/hardware IoT (p. ej. ESP32) — la carga de lecturas será manual en el MVP.
* App móvil con sincronización de sensores por Bluetooth (ver [F.5](docs/user-stories/F.5-app-movil-sincronizacion-sensores-bluetooth.md)) — máxima prioridad del roadmap tras el MVP.
* Alertas push en tiempo real.
* Detección de enfermedades o estimación de estrés hídrico por fotografía.
* Predicción de riego mediante series temporales / modelos entrenados con datos propios.
* Gestión comercial del vivero (stock, ventas, pedidos, facturación).
* Multiempresa y suscripciones tipo SaaS.

### **1.3. Diseño y experiencia de usuario:**

> Pendiente: capturas de pantalla y/o vídeo mostrando el flujo desde el alta de una especie hasta la recomendación de IA.

### **1.4. Instrucciones de instalación:**

Requisitos: Docker y Docker Compose. Todo lo demás (JDK, Node, PostgreSQL) va dentro de los contenedores.

```bash
cd iac/local
cp .env.example .env   # ajusta las variables si hace falta
docker compose up --build
```

Levanta PostgreSQL, el backend en `:8080` y el frontend en `:3000`. Al arrancar, el backend aplica las migraciones de Flyway y carga los datos semilla (mezclas de tierra, especies, localizaciones y tags), así que la API queda usable sin ningún paso manual. Detalle y variables disponibles en [iac/local/README.md](iac/local/README.md).

Para ejecutar la suite de tests del backend hace falta Docker en marcha (los tests de integración levantan un PostgreSQL real con Testcontainers):

```bash
cd backend
./gradlew test
```

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

> Pendiente de formalizar en Mermaid. Propuesta de alto nivel:

```text
[Frontend: Nuxt 4 / Vue 3 / Pinia]
            │  HTTP (API REST)
            ▼
[Backend: Kotlin + Spring Boot 3 (Spring Web, Spring Data JPA)]
            │                     │
            ▼                     ▼
   [PostgreSQL]        [Proveedor de IA (OpenAI API)]
```

Arquitectura en capas típica de Spring Boot (controller → service → repository), elegida por ser el stack con el que el autor tiene más experiencia previa (Kotlin/Spring en backend, Vue/Nuxt en frontend), lo que reduce el riesgo de la entrega dentro de las ~30 horas disponibles para el MVP.

### **2.2. Descripción de componentes principales:**

* **Frontend**: Nuxt 4 + Vue 3 + Pinia (gestión de estado). Tailwind como opción para estilos.
* **Backend**: Kotlin + Spring Boot 3, con Spring Web para la API REST y Spring Data JPA para la persistencia.
* **Base de datos**: PostgreSQL.
* **IA**: integración con la API de OpenAI mediante un servicio dedicado que construye un prompt estructurado (especie + lecturas + historial corto) y devuelve una recomendación.

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

Monorepo con el backend, el frontend, la infraestructura local y la documentación viva del proyecto:

```text
backend/     Kotlin + Spring Boot 3 (API REST, JPA, Flyway)
frontend/    Nuxt 4 + Vue 3 + Pinia
iac/local/   Docker Compose para levantar el entorno completo
docs/        ADRs, tickets, historias de usuario y diagramas
openspec/    Specs de lo construido y changes en curso (spec-driven development)
```

El backend sigue la disciplina de capas de [ADR-006](docs/adr/ADR-006-aislamiento-del-dominio.md) — `web` → `application` → `domain`, con `infrastructure` implementando los puertos:

```text
com.cactify
├── domain           Entidades JPA e identificadores tipados, más:
│   ├── repos          Puertos de repositorio (interfaces propias, sin Spring)
│   └── specs          Specifications de consulta (filtros del inventario)
├── application      Servicios de caso de uso, y:
│   └── dto            DTOs de respuesta y el envelope PageResponse
├── infrastructure
│   └── persistence    Interfaces Spring Data que implementan los puertos, y converters/
└── web
    ├── controllers    Controllers REST y sus cuerpos de petición
    └── errors         Manejador global de errores y el cuerpo ErrorResponse
```

Las dos reglas que sostienen la estructura: los controllers solo conocen `application` (nunca repositorios ni entidades), y los servicios devuelven DTOs ya montados dentro de la transacción, con `spring.jpa.open-in-view` apagado.

### **2.4. Infraestructura y despliegue**

Propuesta:

* Backend: Railway / Render / Fly.io.
* Frontend: Vercel.
* Base de datos: PostgreSQL gestionado (según el proveedor elegido).

### **2.5. Seguridad**

Implementado:

* **Validación de entradas en dos niveles**: sintáctica en los cuerpos de petición con Bean Validation (campos obligatorios, no en blanco), y semántica en la capa de aplicación (que la especie, la localización y los tags referenciados existan). La base de datos sigue siendo la última red con sus `FK`, `CHECK` y `UNIQUE` ([ADR-002](docs/adr/ADR-002-restricciones-en-base-de-datos.md)).
* **Errores controlados**: un manejador global traduce todo fallo de validación o referencia inexistente a `400`/`404`/`409` con un cuerpo uniforme; nada de esto se propaga como `500` ni filtra trazas.
* **Secretos por variable de entorno**: la clave de la API de IA y las credenciales de base de datos no viven en el repositorio (`iac/local/.env.example` documenta las variables, `.env` está ignorado).

Pendiente: autenticación y autorización. El MVP es monousuario por decisión de alcance.

### **2.6. Tests**

Desarrollo dirigido por tests ([ADR-005](docs/adr/ADR-005-tdd.md)): los escenarios WHEN/THEN de cada spec se escriben como test antes que el código. Los tests de integración corren contra **PostgreSQL real con Testcontainers**, nunca H2 ([ADR-004](docs/adr/ADR-004-testcontainers-para-tests-de-integracion.md)).

Suite actual del backend (`./gradlew test`), **164 tests en verde**:

* **Esquema y datos**: que las migraciones apliquen sobre base limpia y sean idempotentes, que las restricciones de dominio rechacen lo que deben y que las semillas no se dupliquen al reiniciar.
* **Mapeo**: que cada entidad viaje de ida y vuelta por su identificador tipado, y que la asociación `Plant` ↔ `Tag` asigne, reemplace y vacíe correctamente.
* **API**: el ciclo HTTP completo con MockMvc —serialización, validación, manejador de errores y SQL— para el alta y el detalle de plantas, la asignación de tags, los filtros combinables del inventario, los catálogos y la paginación.
* **Consultas**: cada `Specification` por separado, que la consulta de recuento de la paginación no se rompa con el `fetch`, y que el listado no dispare un N+1 al mapear el DTO.
* **Invariantes de dominio**: que cada entidad rechace crearse o modificarse en un estado inválido. Son los únicos tests del backend que **no arrancan un contenedor**: una regla del modelo no necesita base de datos para probarse, porque el rechazo ocurre antes de intentar persistir.
* **Lecturas de cultivo**: alta con y sin fecha del cliente, rechazo de fechas futuras y de valores fuera de rango, orden descendente con desempate estable, y que pintar el historial no dispare una consulta por lectura ni genere ninguna recomendación.
* **Fechas y auditoría**: que un instante sobreviva a la ida y vuelta con la precisión que guarda la columna, que la salida del API no dependa de la zona horaria de la máquina, y que las marcas de creación y modificación se sellen con el reloj inyectado —congelable en los tests— y avancen solo cuando deben.

Pendiente: el test E2E del flujo completo (crear planta → registrar lectura → generar recomendación de IA), que llega con T-03 y T-04.

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

> Ver diagrama Mermaid en [docs/diagramas/modelo-datos.md](docs/diagramas/modelo-datos.md). Entidades previstas para el MVP:

```text
SoilMix (1) ────< (N) Species (1) ────< (N) Plant (1) ────< (N) CareRecord (1) ──── (1) AIRecommendation
                                    Location (1) ────< (N) ┘
                                       Plant (N) ──── (N) Tag   (tabla de unión plant_tag)
```

### **3.2. Descripción de entidades principales:**

> Cada entidad es dueña de su consistencia interna: sus reglas se comprueban al construirla y al modificarla, y una entidad no puede existir en un estado que las viole ([ADR-011](docs/adr/ADR-011-invariantes-de-negocio-en-el-dominio.md)). Las invariantes de cada una se anotan abajo junto a sus campos.
>
> Todos los `id` son TSID ([ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)), almacenados como `bigint`. En el código cada entidad tiene su **tipo de identificador propio** (`PlantId`, `SpeciesId`, `LocationId`…) para que el compilador impida cruzarlos, y en el API viajan como **cadena decimal** para no perder precisión en el cliente JavaScript ([ADR-008](docs/adr/ADR-008-identificadores-tipados.md)).
>
> Todas las entidades llevan además `createdAt` y `updatedAt` —instantes en `timestamptz`, sellados por la aplicación y respaldados por un `DEFAULT` en la base de datos— que se omiten en las listas de abajo por no repetirlos ocho veces ([ADR-010](docs/adr/ADR-010-fechas-y-auditoria.md)). Toda fecha del sistema es un instante y se expone en el API en tiempo universal.

**SoilMix** (catálogo de mezclas de tierra reutilizables)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `name`: String. Nombre identificativo de la mezcla (p. ej. "Sustrato mineral de drenaje rápido").
* `organicPercentage`: Int. Porcentaje de componente orgánico (0-100).
* `mineralPercentage`: Int. Porcentaje de componente mineral (0-100). **Invariantes**: cada porcentaje entre 0 y 100, y su suma exactamente 100.
* `phMin` / `phMax`: Decimal. Rango de pH (acidez) recomendado para esta mezcla (p. ej. 5.5-6.5). **Invariantes**: ambos entre 0 y 14, y `phMin <= phMax`.
* `description`: String. Notas u componentes orientativos (p. ej. "akadama, pómez, turba").

**Species** (ficha de especie — base de conocimiento determinista de cuidados recomendados)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `scientificName`: String. Nombre científico (género + epíteto).
* `commonName`: String. Nombre común.
* `minHumidity` / `maxHumidity`: Int. Rango de humedad recomendado (%).
* `minTemperature` / `maxTemperature`: Int. Rango de temperatura recomendado (°C).
* `minLightHours` / `maxLightHours`: Int. Horas de luz recomendadas al día.
* **Invariantes**: en los tres rangos, el mínimo no puede superar al máximo; los nombres y la pauta de riego no pueden quedar en blanco.
* `wateringGuideline`: String. Frecuencia orientativa de riego (p. ej. "cada 10-20 días").
* `soilMixId`: TSID. Clave foránea → `SoilMix.id`. Mezcla de tierra recomendada para la especie.

**Location** (catálogo de localizaciones)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `name`: String. Nombre identificativo de la localización (p. ej. "Invernadero 1", "Bandeja A3"). Catálogo plano, sin jerarquía en el MVP.

**Plant** (ejemplar de la colección)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `nickname`: String. Nombre o código identificativo del ejemplar. **Invariante**: no puede quedar en blanco.
* `locationId`: TSID. Clave foránea → `Location.id`.
* `speciesId`: TSID. Clave foránea → `Species.id`.
* *(Pendiente de decidir)*: campos de override individual (p. ej. `wateringOverride`, `lightOverride`, `temperatureOverride`) para permitir que un ejemplar concreto se aparte de los rangos de su especie sin perder la herencia de los campos no modificados, según lo hablado en la sección de personalización de cuidados.

**Tag** (catálogo de etiquetas de búsqueda)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `name`: String. Nombre de la etiqueta (p. ej. "globular", "pequeño", "sin espinas", "híbrido"). Único.

**plant_tag** (tabla de unión de la relación N:M entre `Plant` y `Tag`)

* `plantId`: TSID. Clave foránea → `Plant.id`.
* `tagId`: TSID. Clave foránea → `Tag.id`.
* Clave primaria compuesta (`plantId`, `tagId`).
* No tiene entidad propia en el código: al no llevar columnas más allá de su clave, se mapea como la asociación `@ManyToMany` de `Plant`, y el reemplazo del conjunto de tags es una operación de dominio (`plant.updateTags(...)`) en lugar de un borrado e inserción de filas orquestado desde el servicio.

**CareRecord** (lectura/cuidado registrado manualmente)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `plantId`: TSID. Clave foránea → `Plant.id`.
* `humidity`: Int.
* `temperature`: Int.
* `lightHours`: Int.
* `waterAmountMl`: Int. Cantidad de riego.
* `soilPh`: Decimal. Acidez del sustrato medida en el momento de la lectura.
* **Invariantes**: cada medida, si viene informada, dentro de su escala (humedad 0-100, horas de luz 0-24, temperatura -50 a 80, riego no negativo, acidez 0-14); **al menos una** informada; y la fecha no puede ser futura más allá del margen configurado. Se registra por `CareRecord.record(...)`, la única puerta.
* `recordedAt`: Instante en que se tomó la lectura. Lo aporta el cliente si lo conoce —la app móvil de F.5 registrará sin conexión y sincronizará más tarde— y, si no, lo sella el servidor al recibirla.

**AIRecommendation** (salida de la IA asociada a una lectura)

* `id`: TSID. Clave primaria (entero de 64 bits ordenado por tiempo, generado en aplicación — ver [ADR-003](docs/adr/ADR-003-tsid-como-clave-primaria.md)).
* `careRecordId`: TSID. Clave foránea → `CareRecord.id`.
* `riskLevel`: String/Enum. Nivel de riesgo (bajo, moderado, alto).
* `recommendationText`: String. Explicación y acción recomendada.

---

## 4. Especificación de la API

### Convenciones transversales

Tres reglas aplican a **todos** los endpoints:

* **Identificadores como cadena**: en las respuestas y en los cuerpos de petición, los `id` son cadenas decimales (`"882687672222443468"`), nunca números JSON — un TSID supera `2^53` y un cliente JavaScript lo redondearía en silencio ([ADR-008](docs/adr/ADR-008-identificadores-tipados.md)).
* **Listados siempre paginados** ([ADR-009](docs/adr/ADR-009-paginacion-obligatoria.md)). Admiten `?page=` y `?size=`, y devuelven el mismo envelope. El tamaño por defecto (25) y el máximo (500) se configuran por variable de entorno (`PAGE_SIZE_DEFAULT`, `PAGE_SIZE_MAX`); un `size` por encima del máximo se recorta y la respuesta declara el aplicado:

  ```json
  { "content": [ … ], "totalElements": 42, "totalPages": 2, "pageNumber": 0, "pageSize": 25 }
  ```

* **Errores con cuerpo uniforme**. Ninguna validación fallida ni referencia inexistente se propaga como `5xx`:

  ```json
  { "status": 400, "error": "Bad Request", "message": "La especie '999999999' no existe", "path": "/plants" }
  ```

  `400` para lo inválido en el cuerpo o los parámetros, `404` para lo que falta en la ruta, `409` para un nombre de tag ya existente.

### Endpoints implementados (T-02)

| Método y ruta | Qué hace |
|---|---|
| `POST /plants` | Crea una planta (`nickname`, `locationId`, `speciesId`). Especie y localización deben existir. |
| `GET /plants` | Lista el inventario paginado. Filtros opcionales y combinables: `location` y `tag` (repetible, semántica **AND**: la planta debe tener todos los indicados). |
| `GET /plants/{id}` | Detalle de una planta, con sus tags y los datos de cuidado heredados de su especie. |
| `PUT /plants/{id}/tags` | Reemplaza el conjunto completo de tags (`{"tagIds": [...]}`). Idempotente; una lista vacía deja la planta sin tags. |
| `POST /locations` · `GET /locations` | Crea y lista el catálogo de localizaciones. |
| `POST /tags` · `GET /tags` | Crea y lista el catálogo de tags. El nombre se normaliza y es único sin distinguir mayúsculas ni espacios. |
| `POST /plants/{id}/care-records` | Registra una lectura de cultivo (humedad, temperatura, horas de luz, riego y acidez). La fecha la aporta el cliente o, si falta, la sella el servidor; una fecha futura se rechaza. |
| `GET /plants/{id}/care-records` | Historial paginado de una planta, de la lectura más reciente a la más antigua, con la recomendación de IA de cada una cuando exista. |

Ejemplo de filtrado combinado:

```
GET /plants?tag=400001&tag=400002&location=300002&page=0&size=25
```

### Endpoints previstos

| Método y ruta | Ticket |
|---|---|
| `GET /plants/{id}/care-records/{careRecordId}/recommendation` — obtiene/genera la recomendación de IA de una lectura | T-04 |
| `POST /soil-mixes` · `GET /soil-mixes` — catálogo de mezclas de tierra | Sin ticket; el MVP las consume de las semillas |
| `POST /species` · `PUT /species/{id}` — alta y edición de especies | Sin ticket; ídem |

---

## 5. Historias de Usuario

> El listado completo de historias de usuario (incluidas las que no entran en el alcance del MVP) se documenta, una por archivo, en [docs/user-stories](docs/user-stories/README.md). Aquí se recogen las 3 más representativas del flujo E2E, según pide la plantilla.

**Historias Must-Have (5)** — cubren el flujo E2E completo: *Inventario → Seguimiento → Conocimiento → IA → Historial*.

**US-01 — Registrar un cactus**

**Como** propietario de un vivero **quiero** registrar un cactus seleccionando su especie y localización **para** mantener un inventario organizado.

Criterios de aceptación:
* Se puede seleccionar una especie desde un catálogo.
* Se puede indicar nombre y localización (seleccionada de un catálogo).
* La planta queda registrada en la base de datos.

**US-02 — Registrar condiciones de cultivo**

**Como** propietario de un vivero **quiero** introducir manualmente humedad, temperatura, horas de luz, acidez del sustrato y cantidad de riego **para** llevar un seguimiento del estado de cada planta.

Criterios de aceptación:
* Se pueden introducir los cinco valores.
* La lectura queda asociada a una planta.
* Se registra fecha y hora automáticamente.

**US-03 — Consultar recomendaciones por especie**

**Como** propietario de un vivero **quiero** ver los rangos recomendados para la especie seleccionada **para** saber cuáles son las condiciones ideales de cultivo.

Criterios de aceptación:
* La ficha muestra humedad, temperatura, luz y frecuencia de riego recomendadas.
* Los datos provienen del catálogo de especies.

**US-04 — Obtener análisis de IA**

**Como** propietario de un vivero **quiero** recibir un análisis generado por IA a partir de las lecturas registradas **para** entender si la planta presenta riesgo de estrés hídrico o ambiental.

Criterios de aceptación:
* El sistema envía especie + lecturas + riego a la IA.
* La respuesta incluye nivel de riesgo y acciones recomendadas.
* El análisis se puede guardar.

**US-05 — Consultar historial de cuidados**

**Como** propietario de un vivero **quiero** consultar el historial de lecturas, riegos y recomendaciones **para** analizar la evolución de cada planta.

Criterios de aceptación:
* Se muestran las entradas ordenadas por fecha.
* Se incluyen los análisis de IA asociados.

**Historias Should-Have (opcionales, no obligatorias para el MVP)**

* **US-06 — Carga desde sensor IoT**: recibir automáticamente lecturas desde un dispositivo ESP32. Queda como roadmap futuro, fuera del MVP.
* **US-07 — Detección por fotografía**: subir una imagen y obtener una estimación de estrés hídrico. Queda como roadmap futuro, fuera del MVP.

---

## 6. Tickets de Trabajo

> El detalle completo de cada ticket se documenta, uno por archivo, en [docs/tickets](docs/tickets/README.md). Documenta 3 de los tickets de trabajo principales del desarrollo, uno de backend, uno de frontend, y uno de bases de datos. Da todo el detalle requerido para desarrollar la tarea de inicio a fin teniendo en cuenta las buenas prácticas al respecto.

Lista completa prevista para el MVP (detallada individualmente en [docs/tickets](docs/tickets/README.md)):

* **T-01**: Modelo de datos de plantas y lecturas (base de datos).
* **T-02**: API CRUD de plantas (backend).
* **T-03**: API de lecturas ambientales (backend).
* **T-04**: Servicio de recomendaciones con IA (backend).
* **T-05**: Dashboard (frontend).
* **T-06**: Historial y alertas (frontend).
* **T-07**: Test E2E del flujo principal.

**Ticket 1**: [T-01 — Modelo de datos de plantas y lecturas](docs/tickets/T-01-modelo-de-datos-de-plantas-y-lecturas.md) (base de datos)

**Ticket 2**: [T-02 — API CRUD de plantas](docs/tickets/T-02-api-crud-de-plantas.md) (backend)

**Ticket 3**: [T-05 — Dashboard frontend](docs/tickets/T-05-dashboard-frontend.md) (frontend)

---

## 7. Pull Requests

> Documenta 3 de las Pull Requests realizadas durante la ejecución del proyecto

**Pull Request 1**

**Pull Request 2**

**Pull Request 3**
