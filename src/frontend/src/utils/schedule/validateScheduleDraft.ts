import type ScheduleDayDraft from "@/types/schedule/ScheduleDayDraft.types"
import type ScheduleDraft from "@/types/schedule/ScheduleDraft.types"
import type ScheduleDraftErrors from "@/types/schedule/ScheduleDraftErrors.types"
import type ScheduleProblem from "@/types/schedule/ScheduleProblem.types"
import minutesOf from "@/utils/schedule/minutesOf"
import rangeKey from "@/utils/schedule/rangeKey"

const DIGITS = /^\d+$/
const MAX_ADDRESS_LENGTH = 500

type Range = ScheduleDayDraft["ranges"][number]

function isComplete(range: Range): boolean {
    return range.startTime !== "" && range.endTime !== "" && range.endTime > range.startTime
}

function overlapsAnEarlierRange(ranges: Range[], index: number): boolean {
    const range = ranges[index]

    return ranges.some((other, otherIndex) => {
        if (otherIndex === index || !isComplete(other)) {
            return false
        }

        const comesFirst =
            other.startTime < range.startTime ||
            (other.startTime === range.startTime && otherIndex < index)

        return (
            comesFirst &&
            Math.max(minutesOf(range.startTime), minutesOf(other.startTime)) <
                Math.min(minutesOf(range.endTime), minutesOf(other.endTime))
        )
    })
}

function rangeProblem(ranges: Range[], index: number, slotMinutes: number): ScheduleProblem | null {
    const range = ranges[index]

    if (range.startTime === "" || range.endTime === "") {
        return { code: "rangeMissing" }
    }

    if (range.endTime <= range.startTime) {
        return { code: "rangeEndBeforeStart" }
    }

    if (overlapsAnEarlierRange(ranges, index)) {
        return { code: "rangeOverlap" }
    }

    if (minutesOf(range.endTime) - minutesOf(range.startTime) < slotMinutes) {
        return { code: "rangeTooShort", minutes: slotMinutes }
    }

    return null
}

function integerProblem(
    value: string,
    min: number,
    max: number,
    problem: ScheduleProblem
): ScheduleProblem | null {
    if (!DIGITS.test(value)) {
        return problem
    }

    const number = Number(value)

    return number < min || number > max ? problem : null
}

function validateScheduleDraft(draft: ScheduleDraft): ScheduleDraftErrors {
    const ranges: ScheduleDraftErrors["ranges"] = {}

    for (const day of draft.days) {
        if (!day.enabled) {
            continue
        }

        day.ranges.forEach((_, index) => {
            const problem = rangeProblem(day.ranges, index, draft.slotMinutes)

            if (problem !== null) {
                ranges[rangeKey(day.weekday, index)] = problem
            }
        })
    }

    const address = draft.unitAddress.trim()
    const candidates: ScheduleDraftErrors["fields"] = {
        seatsPerSlot:
            integerProblem(draft.seatsPerSlot, 1, 20, { code: "seatsOutOfRange" }) ?? undefined,
        windowDays:
            integerProblem(draft.windowDays, 1, 180, { code: "windowOutOfRange" }) ?? undefined,
        waitAlertDays:
            integerProblem(draft.waitAlertDays, 1, 60, { code: "waitAlertOutOfRange" }) ??
            undefined,
        unitAddress:
            address === ""
                ? { code: "addressRequired" }
                : address.length > MAX_ADDRESS_LENGTH
                  ? { code: "addressTooLong" }
                  : undefined,
        unitAddressComplement:
            draft.unitAddressComplement.trim().length > MAX_ADDRESS_LENGTH
                ? { code: "complementTooLong" }
                : undefined
    }
    const fields: ScheduleDraftErrors["fields"] = Object.fromEntries(
        Object.entries(candidates).filter(([, problem]) => problem !== undefined)
    )

    return {
        ranges,
        fields,
        count: Object.keys(ranges).length + Object.keys(fields).length
    }
}

export default validateScheduleDraft
