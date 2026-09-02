CREATE TABLE Interactions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES Sessions(id),
    category_id BIGINT REFERENCES Categories(id),
    question_id BIGINT REFERENCES Questions(id),

    answered_via_llm BOOLEAN NOT NULL DEFAULT FALSE,
    llm_answer_text TEXT,

    ended_in_appointment BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_session ON Interactions(session_id);
CREATE INDEX idx_interactions_category ON Interactions(category_id);
CREATE INDEX idx_interactions_question ON Interactions(question_id);
