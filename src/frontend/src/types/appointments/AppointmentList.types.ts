import type AppointmentChipCounts from "@/types/appointments/AppointmentChipCounts.types"
import type AppointmentListItem from "@/types/appointments/AppointmentListItem.types"

type AppointmentList = {
    items: AppointmentListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
    chipCounts: AppointmentChipCounts
}

export default AppointmentList
