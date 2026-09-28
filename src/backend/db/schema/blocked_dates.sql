CREATE TABLE BlockedDates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    description VARCHAR(150) NOT NULL,
    CONSTRAINT chk_blocked_dates_period CHECK (
        (start_time IS NULL AND end_time IS NULL)
        OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    CONSTRAINT chk_blocked_dates_description CHECK (char_length(btrim(description)) > 0)
);

CREATE INDEX idx_blocked_dates_date ON BlockedDates(date);
