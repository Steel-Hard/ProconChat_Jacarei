import type BlockedDate from "@/types/schedule/BlockedDate.types"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"
import type BookedDay from "@/types/schedule/BookedDay.types"

const MAX_DESCRIPTION_LENGTH = 150

type NewBlock = {
    date: string
    description: string
    fullDay?: boolean
    startTime?: string
    endTime?: string
}

function toMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number)
    return (hours ?? 0) * 60 + (minutes ?? 0)
}

function validateNewBlock(
    blocks: BlockedDate[],
    bookedDays: BookedDay[],
    { date, description, fullDay = true, startTime = "", endTime = "" }: NewBlock,
    slotMinutes = 30
): BlockedDateProblem | null {
    if (date === "") {
        return { code: "dateRequired" }
    }

    if (blocks.some((block) => block.date === date)) {
        return { code: "dateAlreadyBlocked" }
    }

    if (!fullDay) {
        if (startTime === "" || endTime === "") {
            return { code: "periodRequired" }
        }

        if (startTime >= endTime) {
            return { code: "periodInvalid" }
        }
    }

    const text = description.trim()

    if (text === "") {
        return { code: "descriptionRequired" }
    }

    if (text.length > MAX_DESCRIPTION_LENGTH) {
        return { code: "descriptionTooLong" }
    }

    const booked = bookedDays.find((day) => day.date === date)
    if (booked) {
        if (fullDay) {
            return { code: "dateHasAppointments", count: booked.total }
        }

        const start = toMinutes(startTime)
        const end = toMinutes(endTime)
        const overlappingCount = booked.times.reduce((count, appointment) => {
            const appointmentStart = toMinutes(appointment.time)
            return appointmentStart < end && appointmentStart + slotMinutes > start
                ? count + appointment.count
                : count
        }, 0)

        if (overlappingCount > 0) {
            return { code: "dateHasAppointments", count: overlappingCount }
        }
    }

    return null
}

export default validateNewBlock
