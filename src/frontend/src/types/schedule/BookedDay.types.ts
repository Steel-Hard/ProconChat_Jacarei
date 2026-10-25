import type BookedTime from "@/types/schedule/BookedTime.types"

type BookedDay = {
    date: string
    weekday: number
    total: number
    times: BookedTime[]
}

export default BookedDay
