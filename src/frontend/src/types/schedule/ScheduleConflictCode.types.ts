type ScheduleConflictCode =
    | "DATE_BLOCKED"
    | "PERIOD_BLOCKED"
    | "DAY_WITHOUT_SERVICE"
    | "DURATION_CHANGED"
    | "RANGE_CHANGED"
    | "SEATS_REDUCED"
    | "RESPONSIBLE_OVERLAP"

export default ScheduleConflictCode
