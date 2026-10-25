import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type ScheduleInputWithOrigins from "@/types/schedule/ScheduleInputWithOrigins.types"
import type ScheduleIssueField from "@/types/schedule/ScheduleIssueField.types"

type Origins = Pick<ScheduleInputWithOrigins, "rangeOrigins" | "blockOrigins">
type TopField = Extract<ScheduleIssueField, { kind: "field" }>["field"]

const TOP_FIELDS: readonly string[] = [
    "slotMinutes",
    "seatsPerSlot",
    "windowDays",
    "minNoticeDays",
    "waitAlertDays",
    "unitAddress",
    "unitAddressComplement",
    "reminderEnabled",
    "reminderHours"
] satisfies (keyof ScheduleConfigInput)[]

function isTopField(value: string): value is TopField {
    return TOP_FIELDS.includes(value)
}

function fieldOfIssuePath(path: string, origins: Origins): ScheduleIssueField | null {
    const [root, position] = path.split(".")

    if (isTopField(root)) {
        return { kind: "field", field: root }
    }

    const index = Number(position)

    if (position === undefined || !Number.isInteger(index)) {
        return null
    }

    if (root === "ranges") {
        const origin = origins.rangeOrigins[index]

        return origin ? { kind: "range", ...origin } : null
    }

    if (root === "blockedDates") {
        const blockIndex = origins.blockOrigins[index]

        return blockIndex === undefined ? null : { kind: "block", blockIndex }
    }

    return null
}

export default fieldOfIssuePath
