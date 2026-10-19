import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"

const APPOINTMENT_STATUS_FILTERS: readonly AppointmentStatusFilter[] = [
    "all",
    "PENDING",
    "CONFIRMED",
    "ATTENDED",
    "NO_SHOW",
    "CANCELED",
    "waiting_record"
]

export default APPOINTMENT_STATUS_FILTERS
