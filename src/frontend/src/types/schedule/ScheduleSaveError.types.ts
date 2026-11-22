import type ScheduleCancellationNoticeState from "@/types/schedule/ScheduleCancellationNoticeState.types"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleConflictChange from "@/types/schedule/ScheduleConflictChange.types"
import type ScheduleFieldIssue from "@/types/schedule/ScheduleFieldIssue.types"

type ScheduleSaveError =
    | {
          kind: "conflicts"
          conflicts: ScheduleConflict[]
          changed: boolean
          notice: ScheduleCancellationNoticeState | null
          changes: ScheduleConflictChange[]
      }
    | { kind: "issues"; issues: ScheduleFieldIssue[] }
    | { kind: "invalidOrigin" }
    | { kind: "failed" }

export default ScheduleSaveError
