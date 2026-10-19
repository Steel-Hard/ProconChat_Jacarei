import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import type AppointmentSortMode from "@/types/appointments/AppointmentSortMode.types"
import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"

const TERMINAL: readonly AppointmentStatusFilter[] = ["ATTENDED", "NO_SHOW", "CANCELED"]

function defaultSortMode(filters: AppointmentListFilters, searching: boolean): AppointmentSortMode {
    if (searching) {
        return "mixed"
    }

    if (filters.status !== "all") {
        return TERMINAL.includes(filters.status) ? "desc" : "asc"
    }

    if (filters.period === "past") {
        return "desc"
    }

    return filters.period === "all" ? "mixed" : "asc"
}

export default defaultSortMode
