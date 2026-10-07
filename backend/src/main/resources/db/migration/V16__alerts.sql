-- Alertas (T-23): una incidencia operativa con ciclo de vida propio —nueva, revisada, resuelta o
-- descartada—, no un color sobre una recomendacion historica. Una alerta señala un riesgo; no es una
-- tarea ni un cuidado.
--
-- Afecta a UNA planta o a UNA localizacion (un CHECK lo exige). La condicion que la origina vive en la
-- propia fila: origen, categoria y severidad; y una MISMA condicion abierta no se duplica: lo defienden
-- dos indices unicos parciales (ver mas abajo), de modo que dos detecciones simultaneas no abren dos.
CREATE TABLE alert (
    id                   BIGINT PRIMARY KEY,
    plant_id             BIGINT REFERENCES plant (id),
    location_id          BIGINT REFERENCES location (id),
    source               TEXT        NOT NULL,
    category             TEXT        NOT NULL,
    severity             TEXT        NOT NULL,
    -- El orden de la severidad no es el alfabetico («baja, critica, media»): se materializa para
    -- ordenar y para tomar «la mayor» sin un CASE en cada consulta.
    severity_rank        INTEGER GENERATED ALWAYS AS (
                             CASE severity WHEN 'baja' THEN 1 WHEN 'media' THEN 2 WHEN 'critica' THEN 3 END
                         ) STORED,
    status               TEXT        NOT NULL DEFAULT 'nueva',
    reason               TEXT        NOT NULL,
    recommended_action   TEXT,
    -- La ULTIMA lectura que confirma la condicion (la primera es la de la apertura, en su historial).
    care_record_id       BIGINT REFERENCES care_record (id),
    detected_at          TIMESTAMPTZ NOT NULL,
    last_detected_at     TIMESTAMPTZ NOT NULL,
    occurrences          INT         NOT NULL DEFAULT 1,
    -- Al cerrarse, cuando y con que comentario. Resolver y descartar lo guardan igual; que fue de cada
    -- una lo dice `status` y su transicion.
    closed_at            TIMESTAMPTZ,
    closure_comment      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT alert_target_exactly_one CHECK (num_nonnulls(plant_id, location_id) = 1),
    CONSTRAINT alert_source_valid
        CHECK (source IN ('medicion', 'sin_revisar', 'cuidado_vencido', 'manual', 'recomendacion_ia')),
    CONSTRAINT alert_category_valid
        CHECK (category IN ('temperatura', 'humedad', 'luz', 'riego', 'seguimiento', 'otra')),
    CONSTRAINT alert_severity_valid CHECK (severity IN ('baja', 'media', 'critica')),
    CONSTRAINT alert_status_valid CHECK (status IN ('nueva', 'revisada', 'resuelta', 'descartada')),
    CONSTRAINT alert_reason_not_blank CHECK (btrim(reason) <> ''),
    CONSTRAINT alert_occurrences_positive CHECK (occurrences >= 1),
    CONSTRAINT alert_last_detected_not_before CHECK (last_detected_at >= detected_at),
    CONSTRAINT alert_closed_iff_final CHECK ((status IN ('resuelta', 'descartada')) = (closed_at IS NOT NULL)),
    CONSTRAINT alert_closure_comment_only_closed CHECK (closure_comment IS NULL OR closed_at IS NOT NULL)
);

-- «Una alerta abierta por condicion»: la misma planta (o localizacion), el mismo origen y la misma
-- categoria. Las manuales quedan fuera: dos incidencias distintas anotadas a mano conviven.
CREATE UNIQUE INDEX alert_open_plant_uq ON alert (plant_id, source, category)
    WHERE plant_id IS NOT NULL AND status IN ('nueva', 'revisada') AND source <> 'manual';
CREATE UNIQUE INDEX alert_open_location_uq ON alert (location_id, source, category)
    WHERE location_id IS NOT NULL AND status IN ('nueva', 'revisada') AND source <> 'manual';

-- La bandeja: abiertas primero, las mas graves y las mas recientes arriba.
CREATE INDEX alert_tray_idx ON alert (status, severity_rank DESC, last_detected_at DESC);
CREATE INDEX alert_plant_idx ON alert (plant_id) WHERE plant_id IS NOT NULL;
CREATE INDEX alert_location_idx ON alert (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX alert_care_record_idx ON alert (care_record_id) WHERE care_record_id IS NOT NULL;

-- El historial de la alerta. La APERTURA es la primera fila, sin estado anterior. La cronologia del
-- ejemplar lo lee donde vive, sin copiarlo a plant_event.
CREATE TABLE alert_transition (
    id          BIGINT PRIMARY KEY,
    alert_id    BIGINT      NOT NULL REFERENCES alert (id),
    from_status TEXT,
    to_status   TEXT        NOT NULL,
    comment     TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT alert_transition_from_valid
        CHECK (from_status IS NULL OR from_status IN ('nueva', 'revisada', 'resuelta', 'descartada')),
    CONSTRAINT alert_transition_to_valid CHECK (to_status IN ('nueva', 'revisada', 'resuelta', 'descartada')),
    -- Sin estado anterior si y solo si es la apertura.
    CONSTRAINT alert_transition_opening_iff_new CHECK ((from_status IS NULL) = (to_status = 'nueva')),
    CONSTRAINT alert_transition_is_a_change CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE INDEX alert_transition_alert_idx ON alert_transition (alert_id, occurred_at);

-- Una tarea puede nacer de una alerta. La FK va en la tarea: una alerta puede tener varias.
ALTER TABLE task ADD COLUMN origin_alert_id BIGINT REFERENCES alert (id);
ALTER TABLE task DROP CONSTRAINT task_origin_valid;
ALTER TABLE task ADD CONSTRAINT task_origin_valid CHECK (origin IN ('manual', 'alerta'));
ALTER TABLE task ADD CONSTRAINT task_origin_alert_iff_alert CHECK ((origin = 'alerta') = (origin_alert_id IS NOT NULL));
CREATE INDEX task_origin_alert_idx ON task (origin_alert_id) WHERE origin_alert_id IS NOT NULL;
