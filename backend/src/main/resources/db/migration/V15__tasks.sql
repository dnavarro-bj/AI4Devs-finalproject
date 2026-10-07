-- Tareas (T-22): el trabajo planificado. Una tarea es una INTENCION; un cuidado es un hecho. Crear una
-- tarea no escribe nada en el historial de las plantas; completarla si (un evento `tarea` por planta
-- incluida) y, opcionalmente, el hecho concreto —lectura, intervencion— enlazado con `task_id`.
--
-- El periodo son dos fechas de calendario (DATE), no instantes: un dia exacto es due_from = due_to.
-- «Vencida» NO se almacena: es status = 'pendiente' y due_to anterior a la fecha de referencia.
--
-- El destino es una localizacion (location_id) O un conjunto expreso de plantas (task_plant). Que sea
-- una cosa o la otra es una regla de conjunto —un CHECK no mira otra tabla— y vive en el dominio.
CREATE TABLE task (
    id             BIGINT PRIMARY KEY,
    task_type      TEXT        NOT NULL,
    title          TEXT        NOT NULL,
    priority       TEXT        NOT NULL DEFAULT 'normal',
    status         TEXT        NOT NULL DEFAULT 'pendiente',
    due_from       DATE        NOT NULL,
    due_to         DATE        NOT NULL,
    notes          TEXT,
    origin         TEXT        NOT NULL DEFAULT 'manual',
    -- Sin ON DELETE: una localizacion a la que apunta una tarea no se retira (409 en la aplicacion).
    location_id    BIGINT REFERENCES location (id),
    completed_at   TIMESTAMPTZ,
    -- Cuantas plantas recibieron su evento al completar: lo hecho, no lo planificado.
    affected_plants INT,
    closed_reason  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT task_type_valid
        CHECK (task_type IN ('riego', 'proteccion_frio', 'proteccion_sol', 'poda_raices', 'cambio_maceta', 'otra')),
    CONSTRAINT task_priority_valid CHECK (priority IN ('alta', 'normal', 'baja')),
    CONSTRAINT task_status_valid CHECK (status IN ('pendiente', 'completada', 'omitida', 'cancelada')),
    CONSTRAINT task_origin_valid CHECK (origin IN ('manual')),
    CONSTRAINT task_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT task_title_length CHECK (char_length(title) <= 120),
    CONSTRAINT task_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
    CONSTRAINT task_period_valid CHECK (due_to >= due_from),
    CONSTRAINT task_completed_at_iff_completed CHECK ((status = 'completada') = (completed_at IS NOT NULL)),
    CONSTRAINT task_affected_plants_iff_completed CHECK ((status = 'completada') = (affected_plants IS NOT NULL)),
    CONSTRAINT task_affected_plants_positive CHECK (affected_plants IS NULL OR affected_plants >= 1),
    CONSTRAINT task_closed_reason_only_closed CHECK (closed_reason IS NULL OR status IN ('omitida', 'cancelada')),
    CONSTRAINT task_closed_reason_length CHECK (closed_reason IS NULL OR char_length(closed_reason) <= 500)
);

-- La agenda y las cifras piden lo pendiente por fin de periodo; el calendario, un intervalo.
CREATE INDEX task_status_due_idx ON task (status, due_to);
CREATE INDEX task_location_idx ON task (location_id) WHERE location_id IS NOT NULL;

-- Las plantas expresas de una tarea. Clave compuesta, como plant_tag: una planta una sola vez.
CREATE TABLE task_plant (
    task_id  BIGINT NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    plant_id BIGINT NOT NULL REFERENCES plant (id),
    PRIMARY KEY (task_id, plant_id)
);

CREATE INDEX task_plant_plant_idx ON task_plant (plant_id);

-- Un evento de tarea es un satelite mas de la espina de eventos de la ficha (T-20): hereda su
-- instante, su orden y su indice por planta. La cronologia lo recoge por la cuarta rama de su union.
ALTER TABLE plant_event DROP CONSTRAINT plant_event_type_valid;
ALTER TABLE plant_event ADD CONSTRAINT plant_event_type_valid
    CHECK (event_type IN ('comentario', 'intervencion', 'floracion', 'tarea'));

CREATE TABLE plant_task_event (
    id      BIGINT PRIMARY KEY REFERENCES plant_event (id) ON DELETE CASCADE,
    task_id BIGINT NOT NULL REFERENCES task (id)
);

CREATE INDEX plant_task_event_task_idx ON plant_task_event (task_id);

-- El «cuidado asociado»: la lectura o la intervencion que se registro al completar una tarea. Nulo en
-- todo lo registrado directamente. POR PLANTA: una tarea de grupo tiene un registro por planta.
ALTER TABLE care_record ADD COLUMN task_id BIGINT REFERENCES task (id);
ALTER TABLE plant_intervention ADD COLUMN task_id BIGINT REFERENCES task (id);

CREATE INDEX care_record_task_idx ON care_record (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX plant_intervention_task_idx ON plant_intervention (task_id) WHERE task_id IS NOT NULL;
