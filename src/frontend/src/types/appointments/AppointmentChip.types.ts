import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"

type AppointmentChip = {
    value: AppointmentStatusFilter
    label: string
    count: number
}

export default AppointmentChip
