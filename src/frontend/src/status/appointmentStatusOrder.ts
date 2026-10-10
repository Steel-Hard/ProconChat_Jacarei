import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

const APPOINTMENT_STATUS_ORDER: AppointmentStatus[] = [
    "PENDING",
    "CONFIRMED",
    "ATTENDED",
    "NO_SHOW",
    "CANCELED"
]

export default APPOINTMENT_STATUS_ORDER
