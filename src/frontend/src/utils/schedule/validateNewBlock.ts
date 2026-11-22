import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"

const MAX_DESCRIPTION_LENGTH = 150

type NewBlock = {
    date: string
    description: string
    fullDay?: boolean
    startTime?: string
    endTime?: string
}

function isFullDay(block: BlockedDate): boolean {
    return block.startTime === null || block.endTime === null
}

function periodsOverlap(
    first: { startTime: string; endTime: string },
    second: { startTime: string; endTime: string }
): boolean {
    return first.startTime < second.endTime && second.startTime < first.endTime
}

function periodProblem(startTime: string, endTime: string): BlockedDateProblem | null {
    if (startTime === "" || endTime === "") {
        return { code: "periodRequired" }
    }

    return startTime < endTime ? null : { code: "periodInvalid" }
}

function conflictWithSameDate(
    sameDate: BlockedDate[],
    period: { startTime: string; endTime: string } | null
): BlockedDateProblem | null {
    if (sameDate.length === 0) {
        return null
    }

    if (period === null || sameDate.some(isFullDay)) {
        return { code: "dateAlreadyBlocked" }
    }

    const overlaps = sameDate.some((block) =>
        periodsOverlap(period, { startTime: block.startTime ?? "", endTime: block.endTime ?? "" })
    )

    return overlaps ? { code: "periodOverlap" } : null
}

function validateNewBlock(
    blocks: BlockedDate[],
    { date, description, fullDay = true, startTime = "", endTime = "" }: NewBlock
): BlockedDateProblem | null {
    if (date === "") {
        return { code: "dateRequired" }
    }

    const period = fullDay ? null : { startTime, endTime }
    const invalidPeriod = period ? periodProblem(startTime, endTime) : null

    if (invalidPeriod) {
        return invalidPeriod
    }

    const conflict = conflictWithSameDate(
        blocks.filter((block) => block.date === date),
        period
    )

    if (conflict) {
        return conflict
    }

    const text = description.trim()

    if (text === "") {
        return { code: "descriptionRequired" }
    }

    return text.length > MAX_DESCRIPTION_LENGTH ? { code: "descriptionTooLong" } : null
}

export default validateNewBlock
