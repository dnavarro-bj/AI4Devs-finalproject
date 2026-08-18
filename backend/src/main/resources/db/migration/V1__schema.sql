CREATE TABLE soil_mix (
    id                  BIGINT PRIMARY KEY,
    name                TEXT NOT NULL,
    organic_percentage  INT NOT NULL,
    mineral_percentage  INT NOT NULL,
    ph_min              NUMERIC(3, 1) NOT NULL,
    ph_max              NUMERIC(3, 1) NOT NULL,
    description         TEXT,
    CONSTRAINT soil_mix_percentages_sum_100 CHECK (organic_percentage + mineral_percentage = 100),
    CONSTRAINT soil_mix_ph_range_valid CHECK (ph_min <= ph_max)
);

CREATE TABLE species (
    id                  BIGINT PRIMARY KEY,
    scientific_name     TEXT NOT NULL,
    common_name         TEXT NOT NULL,
    min_humidity        INT NOT NULL,
    max_humidity        INT NOT NULL,
    min_temperature     INT NOT NULL,
    max_temperature     INT NOT NULL,
    min_light_hours     INT NOT NULL,
    max_light_hours     INT NOT NULL,
    watering_guideline  TEXT NOT NULL,
    soil_mix_id         BIGINT NOT NULL REFERENCES soil_mix (id)
);

CREATE TABLE location (
    id      BIGINT PRIMARY KEY,
    name    TEXT NOT NULL
);

CREATE TABLE plant (
    id           BIGINT PRIMARY KEY,
    nickname     TEXT NOT NULL,
    location_id  BIGINT NOT NULL REFERENCES location (id),
    species_id   BIGINT NOT NULL REFERENCES species (id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tag (
    id      BIGINT PRIMARY KEY,
    name    TEXT NOT NULL
);

CREATE UNIQUE INDEX tag_name_normalized_unique ON tag (lower(trim(name)));

CREATE TABLE plant_tag (
    plant_id  BIGINT NOT NULL REFERENCES plant (id),
    tag_id    BIGINT NOT NULL REFERENCES tag (id),
    PRIMARY KEY (plant_id, tag_id)
);

CREATE TABLE care_record (
    id                BIGINT PRIMARY KEY,
    plant_id          BIGINT NOT NULL REFERENCES plant (id),
    humidity          INT,
    temperature       INT,
    light_hours       INT,
    water_amount_ml   INT,
    soil_ph           NUMERIC(3, 1),
    recorded_at       TIMESTAMPTZ NOT NULL
);

CREATE TABLE ai_recommendation (
    id                     BIGINT PRIMARY KEY,
    care_record_id         BIGINT NOT NULL REFERENCES care_record (id),
    risk_level             TEXT NOT NULL,
    recommendation_text    TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
