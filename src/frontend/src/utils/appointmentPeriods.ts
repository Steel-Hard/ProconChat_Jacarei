import type AppointmentPeriod from "@/types/appointments/AppointmentPeriod.types"

const APPOINTMENT_PERIODS: readonly AppointmentPeriod[] = [
    "all",
    "today",
    "this_week",
    "upcoming",
    "past"
]

export default APPOINTMENT_PERIODS
