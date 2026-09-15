-- Up Migration
CREATE UNIQUE INDEX uniq_sessions_phone_in_progress
ON Sessions(phone_hash)
WHERE status = 'IN_PROGRESS';

-- Down Migration
DROP INDEX uniq_sessions_phone_in_progress;
