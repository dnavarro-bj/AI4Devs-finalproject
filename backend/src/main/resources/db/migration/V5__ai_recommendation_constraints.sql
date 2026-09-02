-- Las dos salidas que faltaban de la recomendacion, y las restricciones de ADR-002 bajo los
-- enumerados de dominio y bajo la cardinalidad que declara el diagrama del modelo.
--
-- Las columnas se anaden sin DEFAULT: la tabla esta vacia en todos los entornos porque hasta este
-- change nada la escribia. Si en alguno tuviera filas, la migracion fallaria al arrancar, que es
-- preferible a inventar una accion recomendada y una prioridad para filas de las que no sabemos
-- nada.

ALTER TABLE ai_recommendation
    ADD COLUMN recommended_action TEXT NOT NULL,
    ADD COLUMN priority           TEXT NOT NULL;

ALTER TABLE ai_recommendation
    ADD CONSTRAINT ai_recommendation_risk_level_valid CHECK (risk_level IN ('low', 'medium', 'high')),
    ADD CONSTRAINT ai_recommendation_priority_valid CHECK (priority IN ('immediate', 'soon', 'routine'));

-- CARE_RECORD ||--o| AI_RECOMMENDATION: como mucho una recomendacion por lectura.
ALTER TABLE ai_recommendation
    ADD CONSTRAINT ai_recommendation_care_record_unique UNIQUE (care_record_id);
