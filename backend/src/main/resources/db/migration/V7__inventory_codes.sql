-- Codigos de inventario (T-15): identidad legible, estable e imprimible.
--
--   especie:  CAT-GRUSS       (unico, lo escribe una persona)
--   ejemplar: CAT-GRUSS-01    (codigo de la especie + numero correlativo propio, inmutable)
--
-- Las columnas nacen NULABLES y se rellenan **dentro de esta misma migracion**; solo despues se
-- vuelven NOT NULL con sus UNIQUE y CHECK (ADR-002). Asi no existe jamas una fila sin codigo ni un
-- estado en que el esquema permita nulos.
--
-- Aqui SI hay que derivar un codigo para las especies que ya existen --nadie puede escribirlo--, y
-- se hace con el genero y el prefijo CAT literal: una migracion es una foto de un momento y no lee
-- configuracion. Es lo unico que genera un codigo de especie, y es de una sola vez.

ALTER TABLE species
    ADD COLUMN code          TEXT,
    ADD COLUMN next_sequence INT NOT NULL DEFAULT 1;

ALTER TABLE plant
    ADD COLUMN code TEXT;

-- La semilla de grusonii recibe el codigo del prototipo.
UPDATE species SET code = 'CAT-GRUSS'
 WHERE id = 200001 AND scientific_name = 'Echinocactus grusonii';

-- El resto: las cinco primeras letras del genero. Si dos especies dan el mismo codigo, o si choca con
-- uno ya asignado, el segundo y los siguientes llevan un sufijo numerico para desempatar.
WITH base AS (
    SELECT id,
           'CAT-' || COALESCE(
               NULLIF(upper(left(regexp_replace(split_part(scientific_name, ' ', 1), '[^A-Za-z]', '', 'g'), 5)), ''),
               'ESP') AS candidate
      FROM species
     WHERE code IS NULL
), ranked AS (
    SELECT id, candidate, row_number() OVER (PARTITION BY candidate ORDER BY id) AS rn
      FROM base
)
UPDATE species s
   SET code = CASE
                  WHEN r.rn = 1 AND NOT EXISTS (SELECT 1 FROM species x WHERE x.code = r.candidate)
                      THEN r.candidate
                  ELSE r.candidate || r.rn::text
              END
  FROM ranked r
 WHERE s.id = r.id;

-- Los ejemplares: codigo de su especie + numero por orden de alta, con al menos dos cifras.
WITH numbered AS (
    SELECT p.id,
           s.code AS species_code,
           row_number() OVER (PARTITION BY p.species_id ORDER BY p.created_at, p.id) AS rn
      FROM plant p
      JOIN species s ON s.id = p.species_id
)
UPDATE plant p
   SET code = n.species_code || '-' || lpad(n.rn::text, 2, '0')
  FROM numbered n
 WHERE p.id = n.id;

-- El contador de cada especie apunta al numero siguiente al ultimo asignado.
UPDATE species s
   SET next_sequence = (SELECT count(*) FROM plant p WHERE p.species_id = s.id) + 1;

ALTER TABLE species
    ALTER COLUMN code SET NOT NULL,
    ADD CONSTRAINT species_code_unique UNIQUE (code),
    ADD CONSTRAINT species_code_format_valid
        CHECK (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' AND length(code) <= 20),
    ADD CONSTRAINT species_next_sequence_valid CHECK (next_sequence >= 1);

ALTER TABLE plant
    ALTER COLUMN code SET NOT NULL,
    ADD CONSTRAINT plant_code_unique UNIQUE (code),
    ADD CONSTRAINT plant_code_format_valid
        CHECK (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' AND length(code) <= 30);
