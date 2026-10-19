import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import APPOINTMENT_LIST_DEFAULTS from "@/utils/appointmentListDefaults"

function toAppointmentListParams(filters: AppointmentListFilters): URLSearchParams {
    const params = new URLSearchParams()

    if (filters.status !== APPOINTMENT_LIST_DEFAULTS.status) {
        params.set("status", filters.status)
    }

    if (filters.period !== APPOINTMENT_LIST_DEFAULTS.period) {
        params.set("period", filters.period)
    }

    if (filters.responsible !== APPOINTMENT_LIST_DEFAULTS.responsible) {
        params.set("responsible", filters.responsible)
    }

    if (filters.sortBy && filters.sortOrder) {
        params.set("sortBy", filters.sortBy)
        params.set("sortOrder", filters.sortOrder)
    }

    if (filters.page !== APPOINTMENT_LIST_DEFAULTS.page) {
        params.set("page", String(filters.page))
    }

    return params
}

export default toAppointmentListParams
