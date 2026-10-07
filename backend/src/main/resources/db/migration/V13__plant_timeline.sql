-- Cronologia del ejemplar (T-20). La espina `plant_event` solo recibe los tipos nuevos —comentario,
-- intervencion y floracion—; las lecturas, los cambios de estado y los movimientos se quedan donde
-- ya viven y la cronologia los une al leer. No se rellena nada: no hay eventos que fabricar.
CREATE TABLE plant_event (
    id          BIGINT PRIMARY KEY,
    plant_id    BIGINT      NOT NULL REFERENCES plant (id),
    event_type  TEXT        NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    -- La operacion unica que origino el evento cuando se aplico a varias plantas (T-24 la escribira).
    batch_id    BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plant_event_type_valid CHECK (event_type IN ('comentario', 'intervencion', 'floracion'))
);

CREATE INDEX plant_event_plant_idx ON plant_event (plant_id, occurred_at DESC);
CREATE INDEX plant_event_batch_idx ON plant_event (batch_id) WHERE batch_id IS NOT NULL;

CREATE TABLE plant_comment (
    id        BIGINT PRIMARY KEY REFERENCES plant_event (id) ON DELETE CASCADE,
    text      TEXT NOT NULL,
    edited_at TIMESTAMPTZ,
    CONSTRAINT plant_comment_text_not_blank CHECK (btrim(text) <> '')
);

CREATE TABLE plant_intervention (
    id               BIGINT PRIMARY KEY REFERENCES plant_event (id) ON DELETE CASCADE,
    intervention_type TEXT NOT NULL,
    product          TEXT,
    pot_size         TEXT,
    soil_mix_id      BIGINT REFERENCES soil_mix (id),
    notes            TEXT,
    CONSTRAINT plant_intervention_type_valid
        CHECK (intervention_type IN ('trasplante', 'sustrato', 'tratamiento', 'fertilizacion', 'poda', 'revision')),
    -- Cada tipo admite solo sus datos: la maceta, en el trasplante; la mezcla, en el cambio de
    -- sustrato; el producto, en el tratamiento y la fertilizacion.
    CONSTRAINT plant_intervention_pot_size_only_transplant
        CHECK (pot_size IS NULL OR intervention_type = 'trasplante'),
    CONSTRAINT plant_intervention_soil_mix_only_substrate
        CHECK (soil_mix_id IS NULL OR intervention_type = 'sustrato'),
    CONSTRAINT plant_intervention_product_only_treatment
        CHECK (product IS NULL OR intervention_type IN ('tratamiento', 'fertilizacion'))
);

CREATE INDEX plant_intervention_soil_mix_idx ON plant_intervention (soil_mix_id) WHERE soil_mix_id IS NOT NULL;

CREATE TABLE plant_bloom (
    id           BIGINT PRIMARY KEY REFERENCES plant_event (id) ON DELETE CASCADE,
    started_on   DATE NOT NULL,
    ended_on     DATE,
    bloom_status TEXT NOT NULL,
    flower_count INT,
    notes        TEXT,
    CONSTRAINT plant_bloom_status_valid CHECK (bloom_status IN ('boton', 'en_flor', 'finalizada')),
    CONSTRAINT plant_bloom_interval_valid CHECK (ended_on IS NULL OR ended_on >= started_on),
    -- Finalizada si y solo si tiene fin.
    CONSTRAINT plant_bloom_finished_iff_ended CHECK ((bloom_status = 'finalizada') = (ended_on IS NOT NULL)),
    CONSTRAINT plant_bloom_flower_count_valid CHECK (flower_count IS NULL OR flower_count >= 0)
);
