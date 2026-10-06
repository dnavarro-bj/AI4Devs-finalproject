-- Ficha ampliada y estado del ejemplar (T-16, primera mitad).
--
-- El ejemplar gana lo que la ficha del prototipo da por supuesto: que es (descripcion), en que
-- situacion esta (estado), cuando nacio (germinacion), cuando y como llego (adquisicion y
-- procedencia). Y un historial de los cambios de estado: una coleccion de cientos de plantas pierde
-- ejemplares, y dejar de estar activo no es dejar de existir.
--
-- Las plantas existentes quedan ACTIVAS —que es lo que eran— y sin datos de germinacion, adquisicion
-- ni procedencia: no hay de donde deducirlos y no se inventa nada.

ALTER TABLE plant
    ADD COLUMN description       TEXT,
    ADD COLUMN status            TEXT NOT NULL DEFAULT 'activa',
    ADD COLUMN germination_year  INT,
    ADD COLUMN germination_month INT,
    ADD COLUMN acquired_on       DATE,
    ADD COLUMN origin            TEXT,
    ADD COLUMN origin_note       TEXT;

ALTER TABLE plant
    ADD CONSTRAINT plant_status_valid
        CHECK (status IN ('activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida')),
    ADD CONSTRAINT plant_germination_year_plausible
        CHECK (germination_year IS NULL OR germination_year BETWEEN 1900 AND 2100),
    ADD CONSTRAINT plant_germination_month_valid
        CHECK (germination_month IS NULL OR germination_month BETWEEN 1 AND 12),
    -- El mes sin año no significa nada; el año sin mes significa «en algun momento de ese año».
    ADD CONSTRAINT plant_germination_month_needs_year
        CHECK (germination_month IS NULL OR germination_year IS NOT NULL),
    ADD CONSTRAINT plant_origin_valid
        CHECK (origin IS NULL OR origin IN ('vivero', 'intercambio', 'germinacion_propia', 'compra', 'regalo', 'otro'));

-- El estado se filtra en cada listado del inventario.
CREATE INDEX plant_status_idx ON plant (status);

-- Cada cambio de estado, con su estado anterior, el nuevo, un motivo opcional y cuando ocurrio.
-- Lleva las marcas de auditoria como el resto de tablas (ADR-010).
CREATE TABLE plant_status_change (
    id           BIGINT PRIMARY KEY,
    plant_id     BIGINT      NOT NULL REFERENCES plant (id),
    from_status  TEXT        NOT NULL,
    to_status    TEXT        NOT NULL,
    reason       TEXT,
    occurred_at  TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plant_status_change_from_valid
        CHECK (from_status IN ('activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida')),
    CONSTRAINT plant_status_change_to_valid
        CHECK (to_status IN ('activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida')),
    CONSTRAINT plant_status_change_is_a_change CHECK (from_status <> to_status)
);

CREATE INDEX plant_status_change_plant_idx ON plant_status_change (plant_id, occurred_at DESC);
