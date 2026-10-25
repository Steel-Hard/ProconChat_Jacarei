import type BookedDay from "@/types/schedule/BookedDay.types"

type Range = { startTime: string; endTime: string }

function rangeHasBooking(range: Range, weekday: number, bookedDays: BookedDay[]): boolean {
    return bookedDays.some(
        (day) =>
            day.weekday === weekday &&
            day.times.some(({ time }) => range.startTime <= time && time < range.endTime)
    )
}

export default rangeHasBooking
