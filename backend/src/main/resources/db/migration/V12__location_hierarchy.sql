-- Localizaciones jerarquicas y movimientos (T-18).
--
-- La jerarquia es solo parent_id: la ruta y los recuentos de descendientes se calculan con consultas
-- recursivas, asi que no hay copia materializada que mantener coherente al mover un nodo.
--
-- `code` nace NULABLE y se rellena **dentro de esta misma migracion**; solo despues se vuelve NOT NULL
-- con su UNIQUE (ADR-002). Las localizaciones que ya existen pasan a ser raices.

ALTER TABLE location
    ADD COLUMN parent_id         BIGINT REFERENCES location (id),
    ADD COLUMN code              TEXT,
    ADD COLUMN description       TEXT,
    ADD COLUMN location_type     TEXT,
    ADD COLUMN capacity          INT,
    ADD COLUMN operational_notes TEXT,
    ADD COLUMN environment       TEXT,
    ADD COLUMN sun_exposure      TEXT;

-- Codigo de las existentes: LOC- mas las iniciales del nombre sin acentos. Si dos dan el mismo, el
-- segundo y los siguientes llevan un sufijo numerico (las iniciales no contienen guiones, asi que el
-- sufijo no puede chocar con otra candidata).
WITH base AS (
    SELECT id,
           'LOC-' || COALESCE(NULLIF(
               regexp_replace(
                   upper(regexp_replace(
                       translate(name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'),
                       '[^A-Za-z0-9 ]', '', 'g')),
                   '(\S)\S*\s*', '\1', 'g'),
               ''), 'X') AS candidate
      FROM location
), ranked AS (
    SELECT id, candidate, row_number() OVER (PARTITION BY candidate ORDER BY id) AS rn
      FROM base
)
UPDATE location l
   SET code = CASE WHEN r.rn = 1 THEN r.candidate ELSE r.candidate || '-' || r.rn::text END
  FROM ranked r
 WHERE l.id = r.id;

ALTER TABLE location
    ALTER COLUMN code SET NOT NULL,
    ADD CONSTRAINT location_code_not_blank CHECK (length(btrim(code)) > 0),
    ADD CONSTRAINT location_type_valid
        CHECK (location_type IN ('bancada', 'bandeja', 'invernadero', 'zona_exterior', 'estanteria', 'otro')),
    ADD CONSTRAINT location_environment_valid
        CHECK (environment IN ('interior', 'cubierto', 'exterior')),
    ADD CONSTRAINT location_sun_exposure_valid
        CHECK (sun_exposure IN ('sombra', 'semisombra', 'soleado', 'pleno_sol')),
    ADD CONSTRAINT location_capacity_positive CHECK (capacity > 0),
    ADD CONSTRAINT location_not_its_own_parent CHECK (parent_id <> id);

CREATE UNIQUE INDEX location_code_unique ON location (lower(btrim(code)));
CREATE INDEX location_parent_idx ON location (parent_id);

-- Movimientos: dónde estaba un ejemplar, dónde está y cuándo cambió. Lleva las marcas de auditoria
-- como el resto de tablas (ADR-010). No se fabrica historia para lo ya existente.
CREATE TABLE plant_movement (
    id               BIGINT PRIMARY KEY,
    plant_id         BIGINT      NOT NULL REFERENCES plant (id),
    from_location_id BIGINT      NOT NULL REFERENCES location (id),
    to_location_id   BIGINT      NOT NULL REFERENCES location (id),
    moved_at         TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plant_movement_is_a_move CHECK (from_location_id <> to_location_id)
);

CREATE INDEX plant_movement_plant_idx ON plant_movement (plant_id, moved_at DESC);
CREATE INDEX plant_movement_from_idx ON plant_movement (from_location_id, moved_at DESC);
CREATE INDEX plant_movement_to_idx ON plant_movement (to_location_id, moved_at DESC);
