-- Fotografias (T-19, ADR-018): la primera vez que el sistema guarda binarios. La base guarda la
-- REFERENCIA y los metadatos; los archivos viven en disco, detras del puerto MediaStorage.
--
-- `media_asset` es lo que ES el archivo (tipo, dimensiones, texto alternativo, fecha de captura) y los
-- dos satelites dicen DE QUIEN es y como se muestra. Los satelites comparten la clave del asset y se
-- borran en cascada con el: borrar una fotografia es borrar una fila del asset.
CREATE TABLE media_asset (
    id           BIGINT PRIMARY KEY,
    -- La carpeta del almacen (`media/<id>`): derivada del id, nunca un nombre que venga del usuario.
    storage_key  TEXT        NOT NULL,
    content_type TEXT        NOT NULL,
    width        INT         NOT NULL,
    height       INT         NOT NULL,
    size_bytes   BIGINT      NOT NULL,
    alt_text     TEXT        NOT NULL,
    -- Cuando se tomo la foto: del EXIF o corregida a mano. Distinta de `created_at`, la de subida.
    captured_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT media_asset_storage_key_unique UNIQUE (storage_key),
    CONSTRAINT media_asset_content_type_valid CHECK (content_type IN ('image/jpeg', 'image/png')),
    CONSTRAINT media_asset_alt_text_not_blank CHECK (length(trim(alt_text)) > 0),
    CONSTRAINT media_asset_width_positive CHECK (width > 0),
    CONSTRAINT media_asset_height_positive CHECK (height > 0),
    CONSTRAINT media_asset_size_positive CHECK (size_bytes > 0)
);

-- La galeria de referencia de una especie. Orden manual; una sola principal; autoria opcional.
CREATE TABLE species_media (
    media_id   BIGINT  PRIMARY KEY REFERENCES media_asset (id) ON DELETE CASCADE,
    species_id BIGINT  NOT NULL REFERENCES species (id),
    position   INT     NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    credit     TEXT,
    CONSTRAINT species_media_position_non_negative CHECK (position >= 0)
);
CREATE INDEX species_media_species_idx ON species_media (species_id, position);
-- «Una sola principal por especie» defendida en la base. Que haya UNA cuando hay fotos es regla de
-- conjunto y la mantiene el dominio.
CREATE UNIQUE INDEX species_media_one_primary ON species_media (species_id) WHERE is_primary;

-- La galeria de un ejemplar. Una foto puede colgar de un evento de la cronologia (comentario,
-- intervencion, floracion o tarea completada): borrar el evento NO borra la foto, que queda sin evento.
CREATE TABLE plant_media (
    media_id   BIGINT  PRIMARY KEY REFERENCES media_asset (id) ON DELETE CASCADE,
    plant_id   BIGINT  NOT NULL REFERENCES plant (id),
    event_id   BIGINT  REFERENCES plant_event (id) ON DELETE SET NULL,
    purpose    TEXT,
    position   INT     NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT plant_media_position_non_negative CHECK (position >= 0),
    CONSTRAINT plant_media_purpose_valid CHECK (purpose IS NULL OR purpose IN ('general', 'detalle', 'etiqueta_fisica'))
);
CREATE INDEX plant_media_plant_idx ON plant_media (plant_id, position);
CREATE INDEX plant_media_event_idx ON plant_media (event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX plant_media_one_primary ON plant_media (plant_id) WHERE is_primary;
