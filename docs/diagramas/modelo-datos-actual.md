# Modelo de datos actual

Lo que hay **hoy en las migraciones** (`backend/src/main/resources/db/migration/`, hasta `V11`). Este archivo describe lo construido, no lo previsto: se actualiza al archivar cada change que toque el esquema.

Para la evolución prevista ver [borrador-modelo-datos-gestion.md](borrador-modelo-datos-gestion.md) y, después de ese, [borrador-modelo-datos-tareas.md](borrador-modelo-datos-tareas.md).

Descripción detallada de campos en el [README](../../README.md#3-modelo-de-datos).

```mermaid
erDiagram
    SOIL_MIX ||--o{ SPECIES : "recomienda"
    SPECIES ||--o{ PLANT : "es de"
    SPECIES ||--o{ SPECIES_PERIOD : "se calendariza en"
    LOCATION ||--o{ LOCATION : "contiene"
    LOCATION ||--o{ PLANT : "ubica"
    PLANT ||--o{ PLANT_MOVEMENT : "se mueve en"
    LOCATION ||--o{ PLANT_MOVEMENT : "origen y destino de"
    PLANT ||--o{ CARE_RECORD : "tiene"
    CARE_RECORD ||--o| AI_RECOMMENDATION : "genera"
    PLANT ||--o{ PLANT_TAG : "tiene"
    PLANT ||--o{ PLANT_STATUS_CHANGE : "cambia de estado en"
    PLANT ||--o{ PLANT_EVENT : "protagoniza"
    PLANT_EVENT ||--o| PLANT_COMMENT : "detalla"
    PLANT_EVENT ||--o| PLANT_INTERVENTION : "detalla"
    PLANT_EVENT ||--o| PLANT_BLOOM : "detalla"
    PLANT_EVENT ||--o| PLANT_TASK_EVENT : "detalla"
    LOCATION ||--o{ TASK : "es destino de"
    TASK ||--o{ TASK_PLANT : "apunta a"
    PLANT ||--o{ TASK_PLANT : "es destino de"
    TASK ||--o{ PLANT_TASK_EVENT : "deja"
    TASK ||--o{ CARE_RECORD : "origina"
    TASK ||--o{ PLANT_INTERVENTION : "origina"
    SOIL_MIX ||--o{ PLANT_INTERVENTION : "cambio de sustrato"
    TAG ||--o{ PLANT_TAG : "se asigna en"

    SOIL_MIX {
        TSID id PK
        string name
        int organicPercentage
        int mineralPercentage
        decimal phMin
        decimal phMax
        string description
    }

    SPECIES {
        TSID id PK
        string code UK "CAT-GRUSS, escrito a mano, corregible sin ejemplares"
        int nextSequence "siguiente numero de ejemplar, solo crece"
        string scientificName UK
        string commonName
        int minHumidity
        int maxHumidity
        int minTemperature
        int maxTemperature
        int minLightHours
        int maxLightHours
        string wateringGuideline
        TSID soilMixId FK
        string description "opcional"
        enum sunExposure "sombra|semisombra|soleado|pleno_sol, opcional"
        enum environment "interior|exterior|ambos, opcional"
        string bloomDescription "opcional"
        string bloomColor "opcional"
        string bloomMaturity "opcional"
        string bloomTypicalDuration "opcional"
    }

    SPECIES_PERIOD {
        TSID id PK
        TSID speciesId FK "ON DELETE CASCADE"
        enum periodType "crecimiento|crecimiento_maximo|reposo|floracion|riego"
        int startMonth "1-12"
        int endMonth "1-12; inicio > fin = cruza el anio"
        enum intensity "solo riego: escaso|moderado|abundante"
        string notes
    }

    LOCATION {
        TSID id PK
        TSID parentId FK "nulo en la raiz; ruta y recuentos se calculan, no se guardan"
        string code UK "LOC-I1-BN, manual, unico sin distinguir mayusculas"
        string name
        string description
        enum locationType "bancada|bandeja|invernadero|zona_exterior|estanteria|otro"
        int capacity "orientativa, > 0"
        string operationalNotes
        enum environment "interior|cubierto|exterior"
        enum sunExposure "sombra|semisombra|soleado|pleno_sol"
    }

    PLANT_MOVEMENT {
        TSID id PK
        TSID plantId FK
        TSID fromLocationId FK
        TSID toLocationId FK "distinto de fromLocationId"
        timestamp movedAt
    }

    PLANT {
        TSID id PK
        string code UK "CAT-GRUSS-01, inmutable"
        string nickname
        string description "opcional"
        enum status "activa|cuarentena|enferma|cedida|vendida|muerta|perdida"
        int germinationYear "opcional, 1900-2100"
        int germinationMonth "opcional, 1-12, solo con año"
        date acquiredOn "opcional"
        enum origin "vivero|intercambio|germinacion_propia|compra|regalo|otro"
        string originNote "opcional"
        int careMinHumidity "propio; nulo = hereda de la especie"
        int careMaxHumidity "propio; nulo = hereda"
        int careMinTemperature "propio; nulo = hereda"
        int careMaxTemperature "propio; nulo = hereda"
        int careMinLightHours "propio; nulo = hereda"
        int careMaxLightHours "propio; nulo = hereda"
        string careWateringGuideline "propio; nulo = hereda"
        TSID careSoilMixId FK "propio; nulo = hereda"
        TSID locationId FK
        TSID speciesId FK
    }

    PLANT_STATUS_CHANGE {
        TSID id PK
        TSID plantId FK
        enum fromStatus
        enum toStatus "distinto de fromStatus"
        string reason "opcional"
        timestamp occurredAt
    }

    TASK {
        TSID id PK
        string type "riego, proteccion_frio, proteccion_sol, poda_raices, cambio_maceta, otra"
        string title
        string priority "alta, normal, baja"
        string status "pendiente, completada, omitida, cancelada"
        date due_from
        date due_to
        string notes
        string origin "manual"
        TSID location_id FK "destino: localizacion o plantas expresas, nunca las dos"
        timestamptz completed_at
        int affected_plants
        string closed_reason
    }

    TASK_PLANT {
        TSID task_id PK, FK
        TSID plant_id PK, FK
    }

    PLANT_TASK_EVENT {
        TSID id PK, FK "plant_event, tipo tarea"
        TSID task_id FK
    }

    PLANT ||--o{ ALERT : "acumula"
    LOCATION ||--o{ ALERT : "acumula"
    CARE_RECORD ||--o{ ALERT : "dispara"
    ALERT ||--o{ ALERT_TRANSITION : "recorre"
    ALERT ||--o{ TASK : "origina"

    ALERT {
        TSID id PK
        TSID plantId FK "exactamente uno de plantId y locationId"
        TSID locationId FK
        enum source "medicion|sin_revisar|cuidado_vencido|manual|recomendacion_ia"
        enum category "temperatura|humedad|luz|riego|seguimiento|otra"
        enum severity "baja|media|critica"
        enum status "nueva|revisada|resuelta|descartada"
        string reason
        string recommendedAction
        TSID careRecordId FK "la ultima lectura que la confirma"
        timestamp detectedAt "la primera deteccion"
        timestamp lastDetectedAt
        int occurrences ">= 1"
        timestamp resolvedAt "solo resuelta"
        string resolutionComment
    }

    ALERT_TRANSITION {
        TSID id PK
        TSID alertId FK
        enum fromStatus "nulo solo en la apertura"
        enum toStatus
        string comment
        timestamp occurredAt
    }

    PLANT_EVENT {
        TSID id PK
        TSID plantId FK
        enum eventType "comentario|intervencion|floracion|tarea"
        timestamp occurredAt
        TSID batchId "opcional; nadie lo escribe aun (T-24)"
    }

    PLANT_COMMENT {
        TSID id PK,FK "evento"
        string text "no en blanco"
        timestamp editedAt "opcional"
    }

    PLANT_INTERVENTION {
        TSID id PK,FK "evento"
        enum interventionType "trasplante|sustrato|tratamiento|fertilizacion|poda|revision"
        string product "tratamiento y fertilizacion"
        string potSize "trasplante"
        TSID soilMixId FK "sustrato"
        string notes
    }

    PLANT_BLOOM {
        TSID id PK,FK "evento"
        date startedOn
        date endedOn "solo si finalizada"
        enum bloomStatus "boton|en_flor|finalizada"
        int flowerCount
        string notes
    }

    TAG {
        TSID id PK
        string name UK "unico normalizado: lower(trim(name))"
    }

    PLANT_TAG {
        TSID plantId FK
        TSID tagId FK
    }

    CARE_RECORD {
        TSID id PK
        TSID plantId FK
        int humidity
        int temperature
        int lightHours
        int waterAmountMl
        decimal soilPh
        timestamp recordedAt
    }

    AI_RECOMMENDATION {
        TSID id PK
        TSID careRecordId FK
        enum riskLevel
        string recommendationText
        string recommendedAction
        enum priority
        timestamp createdAt
    }
```

## Reglas que el diagrama no muestra

* **Auditoría ([ADR-010](../adr/ADR-010-fechas-y-auditoria.md)).** Toda tabla —`plant_tag` incluida— tiene `created_at` y `updated_at` de tipo `timestamptz`. No se pintan en el diagrama porque son universales. Las sella `AuditingListener` desde la aplicación; el `DEFAULT now()` es la red de seguridad que exige [ADR-002](../adr/ADR-002-restricciones-en-base-de-datos.md).
* **Toda fecha es un `Instant` sobre `timestamptz`**, con la sesión JDBC en UTC.
* **Las claves primarias son TSID** (`bigint` ordenado por tiempo, generado en la aplicación — [ADR-003](../adr/ADR-003-tsid-como-clave-primaria.md)) y viajan al API como cadena decimal ([ADR-008](../adr/ADR-008-identificadores-tipados.md)).
* **Las invariantes están además en el esquema** como `CHECK` y `UNIQUE` ([ADR-002](../adr/ADR-002-restricciones-en-base-de-datos.md)): porcentajes de `soil_mix` que suman 100, rangos `min <= max`, humedad 0–100, horas de luz 0–24, temperatura plausible, riego no negativo, unicidad del nombre científico y una sola recomendación por lectura.
* **Códigos de inventario (`V7`).** `species.code` y `plant.code` son únicos, obligatorios y con formato comprobado (`^[A-Z0-9]+(-[A-Z0-9]+)*$`, hasta 20 y 30 caracteres); `species.next_sequence` es el contador de ejemplares y nunca baja de 1. El código de una planta es `código de especie + número` y se asigna con la fila de la especie **bloqueada**, no con `MAX()+1`. La migración rellenó las filas existentes en el propio `V7`: las especies por su género (la semilla de grusonii, `CAT-GRUSS`) y las plantas por orden de alta.
* **Ficha y estado del ejemplar (`V8`).** `plant` gana descripción, estado, germinación, adquisición y procedencia. El estado es obligatorio y uno de siete (tres **en curso**: `activa`, `cuarentena`, `enferma`; cuatro **finales**: `cedida`, `vendida`, `muerta`, `perdida`); el mes de germinación está entre 1 y 12 y **solo existe con año**; la procedencia es de una lista cerrada. Los ejemplares existentes quedaron `activa` y sin datos inventados. Cada cambio de estado se guarda en `plant_status_change` con su estado anterior, el nuevo, un motivo opcional y cuándo ocurrió; el estado actual y su historial nacen del mismo método de dominio (`Plant.changeStatus`). Las transiciones válidas viven en el dominio, no en el esquema.
* **Ficha de cultivo y calendario de la especie (`V10`).** `species` gana descripción, exposición solar, entorno y cuatro datos de la floración esperada, **todos opcionales**: las especies existentes no tienen valor que inventar y «sin definir» es una respuesta. La exposición y las horas de luz son independientes. El entorno tiene tres valores. Nueva tabla `species_period` con un único calendario por tipo (`crecimiento`, `reposo`, `floracion`, `riego`): meses 1–12 con `CHECK`, **inicio > fin = periodo que cruza el año**, e intensidad obligatoria solo en el riego. Que dos periodos de un tipo no se solapen es una regla de conjunto y vive en el dominio. Se borra en cascada con la especie. `V11` añade el tipo **`crecimiento_maximo`** (los meses en que más crece): se superpone al crecimiento y su regla —caer dentro de él— vive en el dominio.
* **Cuidados propios del ejemplar (`V9`).** Un ejemplar hereda la pauta de su especie y puede sobrescribir parte de ella: los rangos de humedad, temperatura y luz, la pauta de riego y la mezcla de sustrato. Son **columnas opcionales de `plant`** (prefijo `care_`) y **nulo significa «hereda»**; el borrador proponía una tabla 1-1, pero la asociación inversa no se carga perezosamente en Hibernate. El esquema solo defiende la escala (humedad 0–100, luz 0–24) y que la mezcla exista; **la coherencia de los extremos depende de la especie** y la comprueba el dominio. El detalle devuelve el perfil **efectivo** ya resuelto. Cambiar la especie conserva los valores propios.
* **Alertas (`V16`).** `alert` es una incidencia con ciclo de vida (`nueva → revisada → resuelta | descartada`) sobre **una planta o una localización** (`CHECK` de exactamente una). Una alerta **abierta** por planta o localización, origen y categoría la defienden **dos índices únicos parciales** (las manuales quedan fuera): una nueva detección no abre otra, suma una ocurrencia, actualiza `last_detected_at` y puede subir la severidad, nunca bajarla. `alert_transition` es el historial, con **la apertura como primera fila** (`from_status` nulo); la cronología del ejemplar la lee ahí, sin copiarla a `plant_event`. `task.origin_alert_id` enlaza una tarea con la alerta que la originó: una alerta puede tener varias. Las lecturas anteriores a la migración no se reevalúan.
* **Cronología del ejemplar (`V13`).** La espina `plant_event` solo recibe los tres tipos nuevos —comentario, intervención y floración— con un satélite por tipo, clave compartida y borrado en cascada. **Se desvía del borrador**: las lecturas, los cambios de estado y los movimientos **no** se copian a la espina; `GET /plants/{id}/timeline` los une al leer con una consulta `UNION ALL` paginada, de modo que cada tabla sigue siendo la fuente de su verdad y no hay doble escritura. Cada intervención admite solo sus datos (maceta en el trasplante, mezcla en el cambio de sustrato, producto en tratamiento y **fertilización**, que es una intervención y no un insumo de `care_record`) y lo repiten `CHECK`s. Una floración es un intervalo que puede seguir abierta: `finalizada` si y solo si tiene fin, y su instante en la cronología es su inicio a las 00:00 UTC. `batch_id` existe sin nadie que lo escriba, para que T-24 no migre la espina. La migración no fabrica eventos.
* **Tareas (`V15`).** `task` es una **intención**, no un cuidado: crearla no escribe nada en el historial. El destino es **una localización o un conjunto de 1 a 500 plantas expresas** (`task_plant`, clave compuesta), nunca los dos —regla de conjunto en el dominio—; una tarea de localización **no guarda plantas**: su alcance se calcula al completar con las del momento. El periodo son dos fechas de calendario (`due_from`, `due_to`; un día es inicio = fin), sin hora, y «vencida» **no se almacena**: es una tarea pendiente cuyo fin ya pasó respecto a la fecha que declara el cliente. Completar escribe, en una transacción, **un evento `tarea` por planta incluida** (`plant_task_event`, satélite de `plant_event`) y, si se pide, el hecho concreto —lectura o intervención— con `task_id` enlazado; omitir y cancelar no escriben nada y conservan la tarea. `affected_plants` solo existe en las completadas. No hay `DELETE`: lo planificado se conserva. `plant_event.batch_id` sigue sin escribirse (T-24).
* **`care_record` exige al menos una de sus cinco medidas.** Una lectura completamente vacía se rechaza con `400`; es una regla deliberada y su revisión está atada a la ingesta automática, no antes.
* **Los enums (`riskLevel`, `priority`) se persisten por su `value` explícito** con un `AttributeConverter`, nunca con `@Enumerated` ([ADR-007](../adr/ADR-007-enums-de-dominio.md)).

## Lo que este modelo todavía no soporta

El [documento de producto](../producto/definicion-funcional-y-ux.md) da por supuestas varias cosas que aquí no existen: fotografías y alertas. Están repartidas entre los dos borradores enlazados arriba.

La personalización de cuidados por ejemplar ([0.7](../user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md)) sigue sin implementar; el borrador de gestión propone cómo.
