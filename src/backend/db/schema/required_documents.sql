CREATE TABLE RequiredDocuments (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES Questions(id),
    description VARCHAR(255) NOT NULL
);

CREATE INDEX idx_required_documents_question ON RequiredDocuments(question_id);
