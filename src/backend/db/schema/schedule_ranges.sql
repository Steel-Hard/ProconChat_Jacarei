CREATE TABLE ScheduleRanges (
    id BIGSERIAL PRIMARY KEY,
    weekday SMALLINT NOT NULL,
    slot_index SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT chk_schedule_ranges_weekday CHECK (weekday BETWEEN 0 AND 6),
    CONSTRAINT chk_schedule_ranges_slot_index CHECK (slot_index BETWEEN 1 AND 3),
    CONSTRAINT chk_schedule_ranges_order CHECK (end_time > start_time),
    CONSTRAINT uniq_schedule_ranges_weekday_slot UNIQUE (weekday, slot_index)
);
