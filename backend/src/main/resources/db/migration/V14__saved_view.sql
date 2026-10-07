-- Vistas guardadas del inventario y grupos de especies (T-21). Una vista es una consulta con nombre:
-- la query string de filtros y orden de un listado, en su forma canonica, y —solo en plantas— las
-- columnas visibles de la tabla. Un grupo de especies es una vista de ambito `species`: sus miembros
-- no se guardan, son las especies que cumplen la consulta cuando se evalua.
--
-- Aun no hay usuarios: las vistas son globales a la coleccion. Cuando los haya se anade un
-- propietario; nada de esta tabla lo impide.
CREATE TABLE saved_view (
    id         BIGINT PRIMARY KEY,
    scope      TEXT        NOT NULL,
    name       TEXT        NOT NULL,
    -- La query string canonica de filtros y orden; vacia = sin criterios.
    query      TEXT        NOT NULL DEFAULT '',
    -- Claves de columna separadas por comas. NULL = la vista no guarda columnas; '' = ninguna opcional.
    columns    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT saved_view_scope_valid CHECK (scope IN ('plants', 'species')),
    CONSTRAINT saved_view_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT saved_view_name_length CHECK (char_length(name) <= 100),
    CONSTRAINT saved_view_columns_only_plants CHECK (scope = 'plants' OR columns IS NULL)
);

-- El mismo criterio que el nombre de un tag: sin distinguir mayusculas ni espacios de los extremos,
-- pero dentro de un ambito: «Cuarentena» tiene sentido en plantas y en especies.
CREATE UNIQUE INDEX saved_view_scope_name_unique ON saved_view (scope, lower(trim(name)));
