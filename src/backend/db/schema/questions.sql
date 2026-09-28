CREATE TABLE Questions (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES Categories(id),

    question TEXT NOT NULL,
    legal_basis TEXT,
    answer TEXT NOT NULL,

    requires_in_person BOOLEAN NOT NULL DEFAULT FALSE,
    in_person_note TEXT,
    out_of_scope BOOLEAN NOT NULL DEFAULT FALSE,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    short_title TEXT NOT NULL,
    short_description TEXT,
    position INT NOT NULL DEFAULT 0,
    llm_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    seed_key VARCHAR(80),
    updated_by BIGINT REFERENCES Users(id),

    CONSTRAINT chk_questions_short_title_length CHECK (char_length(btrim(short_title)) BETWEEN 1 AND 24),
    CONSTRAINT chk_questions_short_description_length CHECK (short_description IS NULL OR char_length(btrim(short_description)) BETWEEN 1 AND 72),
    CONSTRAINT chk_questions_position CHECK (position >= 0),
    CONSTRAINT chk_questions_in_person_xor_out_of_scope CHECK (NOT (requires_in_person AND out_of_scope)),
    CONSTRAINT chk_questions_out_of_scope_no_llm CHECK (NOT (out_of_scope AND llm_allowed)),
    CONSTRAINT chk_questions_answer_length CHECK (char_length(answer) <= 3000),
    CONSTRAINT uniq_questions_seed_key UNIQUE (seed_key)
);

CREATE INDEX idx_questions_category ON Questions(category_id);
CREATE INDEX idx_questions_active ON Questions(active);
CREATE INDEX idx_questions_category_position ON Questions(category_id, position, id);
