import type BookedDay from "@/types/schedule/BookedDay.types"

function buildBookedDays(): BookedDay[] {
    return [
        {
            date: "2026-11-04",
            weekday: 3,
            total: 2,
            times: [
                { time: "09:00", count: 1 },
                { time: "14:00", count: 1 }
            ]
        }
    ]
}

export default buildBookedDays
