import type DayPreviewStatus from "@/types/schedule/DayPreviewStatus.types"
import type DaySlotPreview from "@/types/schedule/DaySlotPreview.types"

type DayPreview = {
    date: string
    weekday: number
    status: DayPreviewStatus
    totalSlots: number
    capacity: number
    usedSeats: number
    freeSeats: number
    blockDescription: string | null
    slots: DaySlotPreview[]
}

export default DayPreview
