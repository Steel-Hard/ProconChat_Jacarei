-- Up Migration

ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_current_category_id_fkey;

ALTER TABLE sessions
ADD CONSTRAINT sessions_current_category_id_fkey
FOREIGN KEY (current_category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

-- Down Migration

ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_current_category_id_fkey;

ALTER TABLE sessions
ADD CONSTRAINT sessions_current_category_id_fkey
FOREIGN KEY (current_category_id)
REFERENCES categories(id);