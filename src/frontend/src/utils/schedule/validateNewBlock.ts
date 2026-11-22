import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"

const MAX_DESCRIPTION_LENGTH = 150

type NewBlock = { date: string; description: string }

function validateNewBlock(
    blocks: BlockedDate[],
    { date, description }: NewBlock
): BlockedDateProblem | null {
    if (date === "") {
        return { code: "dateRequired" }
    }

    if (blocks.some((block) => block.date === date)) {
        return { code: "dateAlreadyBlocked" }
    }

    const text = description.trim()

    if (text === "") {
        return { code: "descriptionRequired" }
    }

    return text.length > MAX_DESCRIPTION_LENGTH ? { code: "descriptionTooLong" } : null
}

export default validateNewBlock
