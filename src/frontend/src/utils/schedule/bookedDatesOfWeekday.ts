import type BookedDay from "@/types/schedule/BookedDay.types"

function bookedDatesOfWeekday(bookedDays: BookedDay[], weekday: number): BookedDay[] {
    return bookedDays
        .filter((day) => day.weekday === weekday)
        .toSorted((a, b) => a.date.localeCompare(b.date))
}

export default bookedDatesOfWeekday
