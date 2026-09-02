-- Marcas de auditoria en todas las tablas (ADR-010).
--
-- Las gestiona la aplicacion desde AuditingListener; el DEFAULT es la red de seguridad que
-- exige ADR-002 para las filas insertadas por SQL crudo y para plant_tag, que al ser tabla de
-- union pura no tiene entidad que dispare el ciclo de vida de JPA.
--
-- plant y ai_recommendation ya traian created_at con el tipo y el DEFAULT correctos desde V1:
-- solo les falta updated_at, y su columna existente no se toca.

ALTER TABLE soil_mix
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE species
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE location
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE tag
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE plant_tag
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE care_record
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE plant
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE ai_recommendation
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
