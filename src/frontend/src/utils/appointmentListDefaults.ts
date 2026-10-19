import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

const APPOINTMENT_LIST_DEFAULTS: AppointmentListFilters = {
    status: "all",
    period: "upcoming",
    responsible: "all",
    page: 1
}

export default APPOINTMENT_LIST_DEFAULTS
