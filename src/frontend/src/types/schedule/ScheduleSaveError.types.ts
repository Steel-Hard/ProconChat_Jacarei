import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleFieldIssue from "@/types/schedule/ScheduleFieldIssue.types"

type ScheduleSaveError =
    | { kind: "conflicts"; conflicts: ScheduleConflict[] }
    | { kind: "issues"; issues: ScheduleFieldIssue[] }
    | { kind: "invalidOrigin" }
    | { kind: "failed" }

export default ScheduleSaveError
