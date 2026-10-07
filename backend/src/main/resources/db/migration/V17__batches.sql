-- Trabajo por lote (T-24): una operacion aplicada a muchas plantas. Cada planta afectada recibe SU
-- registro —una lectura, una intervencion o un comentario— y todos comparten el `batch_id` de la
-- operacion, que es una fila de `batch`.
--
-- Se persiste solo lo que no se puede deducir: la accion, el tipo de alcance y el numero REAL de
-- plantas afectadas (el que se escribe en la misma transaccion que los registros). NO se guardan los
-- ids de las plantas: estan en los registros, por `batch_id`. El plant_count es lo que se HIZO, no
-- lo que sobrevive si luego se borra un registro.
CREATE TABLE batch (
    id          BIGINT PRIMARY KEY,
    action      TEXT        NOT NULL,
    scope_kind  TEXT        NOT NULL,
    plant_count INT         NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT batch_action_valid CHECK (action IN ('lectura', 'intervencion', 'comentario')),
    CONSTRAINT batch_scope_kind_valid CHECK (scope_kind IN ('plantas', 'localizacion', 'consulta')),
    CONSTRAINT batch_plant_count_positive CHECK (plant_count >= 1)
);

-- `plant_event.batch_id` existe desde V13 (T-20) sin que nadie lo escribiese; ahora tiene dueno. Falla
-- si hubiera alguna fila con lote: no se fabrica ningun lote para lo previo.
ALTER TABLE plant_event
    ADD CONSTRAINT plant_event_batch_fk FOREIGN KEY (batch_id) REFERENCES batch (id);

-- Las lecturas no viven en la espina de eventos: llevan su propio lote. Nulo en todo lo registrado
-- directamente o al completar una tarea.
ALTER TABLE care_record ADD COLUMN batch_id BIGINT REFERENCES batch (id);
CREATE INDEX care_record_batch_idx ON care_record (batch_id) WHERE batch_id IS NOT NULL;
