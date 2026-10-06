-- Cuidados propios del ejemplar (T-16, segunda mitad; historia 0.7).
--
-- Un ejemplar hereda la pauta de su especie y puede apartarse de ella. NULO SIGNIFICA «hereda de la
-- especie»; un valor, «lo sobrescribe». Son columnas de la propia fila del ejemplar y no una tabla
-- 1-1 aparte (como proponia el borrador): la asociacion 1-1 inversa no se carga de forma perezosa en
-- Hibernate y cada planta de un listado dispararia una consulta mas. La semantica es la misma.
--
-- Los ejemplares existentes no tienen ningun valor propio: siguen heredando exactamente lo de siempre.
-- La coherencia entre los extremos y la especie la defiende el dominio (ADR-011): depende de la
-- especie del ejemplar y la base no puede juzgarla. Aqui solo lo que si puede: la escala.

ALTER TABLE plant
    ADD COLUMN care_min_humidity      INT,
    ADD COLUMN care_max_humidity      INT,
    ADD COLUMN care_min_temperature   INT,
    ADD COLUMN care_max_temperature   INT,
    ADD COLUMN care_min_light_hours   INT,
    ADD COLUMN care_max_light_hours   INT,
    ADD COLUMN care_watering_guideline TEXT,
    ADD COLUMN care_soil_mix_id       BIGINT REFERENCES soil_mix (id);

ALTER TABLE plant
    ADD CONSTRAINT plant_care_humidity_scale
        CHECK ((care_min_humidity IS NULL OR care_min_humidity BETWEEN 0 AND 100)
           AND (care_max_humidity IS NULL OR care_max_humidity BETWEEN 0 AND 100)),
    ADD CONSTRAINT plant_care_light_scale
        CHECK ((care_min_light_hours IS NULL OR care_min_light_hours BETWEEN 0 AND 24)
           AND (care_max_light_hours IS NULL OR care_max_light_hours BETWEEN 0 AND 24));
