-- Up Migration
UPDATE Categories SET short_title = btrim(short_title) WHERE short_title <> btrim(short_title);
UPDATE Questions SET short_title = btrim(short_title) WHERE short_title <> btrim(short_title);
UPDATE Questions SET short_description = btrim(short_description) WHERE short_description <> btrim(short_description);

ALTER TABLE Categories
    DROP CONSTRAINT chk_categories_short_title_length,
    ADD CONSTRAINT chk_categories_short_title_length CHECK (char_length(short_title) BETWEEN 1 AND 24 AND short_title = btrim(short_title));

ALTER TABLE Questions
    DROP CONSTRAINT chk_questions_short_title_length,
    DROP CONSTRAINT chk_questions_short_description_length,
    ADD CONSTRAINT chk_questions_short_title_length CHECK (char_length(short_title) BETWEEN 1 AND 24 AND short_title = btrim(short_title)),
    ADD CONSTRAINT chk_questions_short_description_length CHECK (short_description IS NULL OR (char_length(short_description) BETWEEN 1 AND 72 AND short_description = btrim(short_description)));

-- Down Migration
ALTER TABLE Questions
    DROP CONSTRAINT chk_questions_short_description_length,
    DROP CONSTRAINT chk_questions_short_title_length,
    ADD CONSTRAINT chk_questions_short_title_length CHECK (char_length(btrim(short_title)) BETWEEN 1 AND 24),
    ADD CONSTRAINT chk_questions_short_description_length CHECK (short_description IS NULL OR char_length(btrim(short_description)) BETWEEN 1 AND 72);

ALTER TABLE Categories
    DROP CONSTRAINT chk_categories_short_title_length,
    ADD CONSTRAINT chk_categories_short_title_length CHECK (char_length(btrim(short_title)) BETWEEN 1 AND 24);
