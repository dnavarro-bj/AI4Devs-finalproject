-- Restricciones de rango de las lecturas de cultivo (ADR-002).
--
-- Tolerantes a nulos a proposito: las cinco medidas siguen siendo opcionales por separado, y el
-- CHECK acota el valor cuando lo hay en vez de obligar a informarlo. La regla "al menos un valor"
-- es de la peticion, no de la fila: una lectura puede quedar con un solo campo relleno.

ALTER TABLE care_record
    ADD CONSTRAINT care_record_humidity_range CHECK (humidity IS NULL OR humidity BETWEEN 0 AND 100),
    ADD CONSTRAINT care_record_light_hours_range CHECK (light_hours IS NULL OR light_hours BETWEEN 0 AND 24),
    ADD CONSTRAINT care_record_temperature_range CHECK (temperature IS NULL OR temperature BETWEEN -50 AND 80),
    ADD CONSTRAINT care_record_water_amount_non_negative CHECK (water_amount_ml IS NULL OR water_amount_ml >= 0),
    ADD CONSTRAINT care_record_soil_ph_range CHECK (soil_ph IS NULL OR soil_ph BETWEEN 0 AND 14);

-- El listado del API filtra por planta y ordena por fecha descendente en cada pagina.
CREATE INDEX care_record_plant_id_recorded_at_idx ON care_record (plant_id, recorded_at DESC);
