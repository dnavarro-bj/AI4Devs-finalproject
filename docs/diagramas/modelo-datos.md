# Diagrama del modelo de datos

Modelo mínimo previsto para el MVP de Cactify. Ver descripción detallada de campos en el [README](../../README.md#3-modelo-de-datos).

```mermaid
erDiagram
    SOIL_MIX ||--o{ SPECIES : "recomienda"
    SPECIES ||--o{ PLANT : "es de"
    LOCATION ||--o{ PLANT : "ubica"
    PLANT ||--o{ CARE_RECORD : "tiene"
    CARE_RECORD ||--o| AI_RECOMMENDATION : "genera"
    PLANT ||--o{ PLANT_TAG : "tiene"
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
        string scientificName
        string commonName
        int minHumidity
        int maxHumidity
        int minTemperature
        int maxTemperature
        int minLightHours
        int maxLightHours
        string wateringGuideline
        TSID soilMixId FK
    }

    LOCATION {
        TSID id PK
        string name
    }

    PLANT {
        TSID id PK
        string nickname
        TSID locationId FK
        TSID speciesId FK
        timestamp createdAt
    }

    TAG {
        TSID id PK
        string name
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
        TSID careRecordId FK UK
        enum riskLevel
        string recommendationText
        string recommendedAction
        enum priority
        timestamp createdAt
    }
```

## Pendiente de decidir

Personalización de cuidados por ejemplar individual ([0.7](../user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md)): añadir campos de override en `PLANT` (p. ej. `wateringOverride`, `lightOverride`, `temperatureOverride`) o crear una entidad `PLANT_CARE_OVERRIDE` separada. Se actualizará este diagrama cuando se tome la decisión.
