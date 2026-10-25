import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"

type ScheduleIssueField =
    | { kind: "range"; weekday: number; rangeIndex: number }
    | { kind: "block"; blockIndex: number }
    | { kind: "field"; field: Exclude<keyof ScheduleConfigInput, "ranges" | "blockedDates"> }

export default ScheduleIssueField
