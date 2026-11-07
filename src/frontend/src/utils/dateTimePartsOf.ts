import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"

type DateTimeParts = { date: string; time: string }

function dateTimePartsOf(value: string | null): DateTimeParts | null {
    if (value === null) {
        return null
    }

    const date = formatDate(value)
    const parsed = new Date(value)

    if (date === null || Number.isNaN(parsed.getTime())) {
        return null
    }

    return { date, time: formatTime(parsed) }
}

export default dateTimePartsOf
