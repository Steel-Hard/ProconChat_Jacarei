-- Up Migration
CREATE TYPE session_step AS ENUM ('AWAITING_CATEGORY', 'AWAITING_QUESTION', 'FINISHED');

ALTER TABLE Sessions
    ADD COLUMN current_step session_step NOT NULL DEFAULT 'AWAITING_CATEGORY',
    ADD COLUMN current_category_id BIGINT REFERENCES Categories(id);

-- Down Migration
ALTER TABLE Sessions
    DROP COLUMN current_category_id,
    DROP COLUMN current_step;

DROP TYPE session_step;
