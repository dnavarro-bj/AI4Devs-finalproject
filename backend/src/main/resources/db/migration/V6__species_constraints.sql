-- Restricciones del catalogo de especies (ADR-002).
--
-- `Species` ya defiende estas invariantes con `require(...)` en su bloque `init` (ADR-011), pero
-- la entidad protege el camino de la aplicacion y la restriccion protege la fila: ninguna
-- sustituye a la otra. `soil_mix` las tiene desde V1__; `species` se quedo sin ellas.
--
-- El UNIQUE sostiene ademas el `findByScientificName` de la comprobacion de duplicado y el orden
-- por defecto del listado, que es `scientific_name`. Las tres especies semilla las cumplen.

ALTER TABLE species
    ADD CONSTRAINT species_scientific_name_unique UNIQUE (scientific_name),
    ADD CONSTRAINT species_humidity_range_valid CHECK (min_humidity <= max_humidity),
    ADD CONSTRAINT species_temperature_range_valid CHECK (min_temperature <= max_temperature),
    ADD CONSTRAINT species_light_hours_range_valid CHECK (min_light_hours <= max_light_hours);
