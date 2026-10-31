import type BookedDay from "@/types/schedule/BookedDay.types"

function bookedDaysInVigency(days: BookedDay[], start: string, next: string | null): BookedDay[] {
    return days.filter((day) => day.date >= start && (next === null || day.date < next))
}

export default bookedDaysInVigency
