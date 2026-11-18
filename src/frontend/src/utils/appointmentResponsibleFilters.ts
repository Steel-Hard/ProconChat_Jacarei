import type AppointmentResponsibleFilter from "@/types/appointments/AppointmentResponsibleFilter.types"

const APPOINTMENT_RESPONSIBLE_FILTERS = [
    "all",
    "unassigned",
    "me"
] as const satisfies readonly AppointmentResponsibleFilter[]

export default APPOINTMENT_RESPONSIBLE_FILTERS
