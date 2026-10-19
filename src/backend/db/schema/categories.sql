CREATE TABLE Categories (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    short_title TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    seed_key VARCHAR(80),
    updated_by BIGINT REFERENCES Users(id),
    CONSTRAINT chk_categories_short_title_length CHECK (char_length(short_title) BETWEEN 1 AND 24 AND short_title = btrim(short_title)),
    CONSTRAINT chk_categories_position CHECK (position >= 0),
    CONSTRAINT uniq_categories_seed_key UNIQUE (seed_key)
);

CREATE INDEX idx_categories_active ON Categories(active);
CREATE INDEX idx_categories_position ON Categories(position, id);
