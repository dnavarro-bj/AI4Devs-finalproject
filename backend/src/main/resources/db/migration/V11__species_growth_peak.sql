-- Crecimiento maximo (T-17): los meses en que una especie mas crece. Es un tipo de periodo mas, que
-- se superpone al crecimiento; que caiga dentro de el es una regla de conjunto y vive en el dominio.
--
-- Migracion aparte y no una edicion de V10: V10 ya esta aplicada en bases en uso, y Flyway rechaza
-- una migracion cuyo contenido cambia.

ALTER TABLE species_period DROP CONSTRAINT species_period_type_valid;
ALTER TABLE species_period
    ADD CONSTRAINT species_period_type_valid
        CHECK (period_type IN ('crecimiento', 'crecimiento_maximo', 'reposo', 'floracion', 'riego'));
