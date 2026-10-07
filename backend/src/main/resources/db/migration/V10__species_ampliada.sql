-- Especie ampliada (T-17): como se cultiva, no solo cuanto aguanta.
--
-- La especie gana descripcion, exposicion solar, entorno y los datos de su floracion esperada, y un
-- calendario anual de periodos. TODO nulable: las especies existentes no tienen exposicion ni
-- entorno que inventar, y «sin definir» es una respuesta honesta (no un valor por defecto que se
-- confundiria con un dato).
--
-- La exposicion describe como llega la luz, no cuanta: es independiente de las horas de luz. El
-- entorno tiene tres valores; la estacionalidad la dice el calendario, no un cuarto valor.

ALTER TABLE species
    ADD COLUMN description            TEXT,
    ADD COLUMN sun_exposure           TEXT,
    ADD COLUMN environment            TEXT,
    ADD COLUMN bloom_description      TEXT,
    ADD COLUMN bloom_color            TEXT,
    ADD COLUMN bloom_maturity         TEXT,
    ADD COLUMN bloom_typical_duration TEXT;

ALTER TABLE species
    ADD CONSTRAINT species_sun_exposure_valid
        CHECK (sun_exposure IS NULL OR sun_exposure IN ('sombra', 'semisombra', 'soleado', 'pleno_sol')),
    ADD CONSTRAINT species_environment_valid
        CHECK (environment IS NULL OR environment IN ('interior', 'exterior', 'ambos'));

-- Un periodo del año. Un inicio POSTERIOR al fin es valido y significa que el periodo cruza el fin
-- de año (noviembre a febrero: inicio 11, fin 2); un solo mes es inicio = fin. Que dos periodos de
-- un mismo tipo no se solapen es una regla de conjunto y vive en el dominio, no aqui.
CREATE TABLE species_period (
    id          BIGINT PRIMARY KEY,
    species_id  BIGINT      NOT NULL REFERENCES species (id) ON DELETE CASCADE,
    period_type TEXT        NOT NULL,
    start_month INT         NOT NULL,
    end_month   INT         NOT NULL,
    intensity   TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT species_period_type_valid
        CHECK (period_type IN ('crecimiento', 'reposo', 'floracion', 'riego')),
    CONSTRAINT species_period_start_month_valid CHECK (start_month BETWEEN 1 AND 12),
    CONSTRAINT species_period_end_month_valid CHECK (end_month BETWEEN 1 AND 12),
    CONSTRAINT species_period_intensity_valid
        CHECK (intensity IS NULL OR intensity IN ('escaso', 'moderado', 'abundante')),
    -- La intensidad es del riego: obligatoria en el, prohibida en los demas.
    CONSTRAINT species_period_intensity_only_for_watering
        CHECK ((period_type = 'riego') = (intensity IS NOT NULL))
);

CREATE INDEX species_period_species_idx ON species_period (species_id);
