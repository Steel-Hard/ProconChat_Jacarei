import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentSortOrder from "@/types/appointments/AppointmentSortOrder.types"
import APPOINTMENT_LIST_DEFAULTS from "@/utils/appointmentListDefaults"
import APPOINTMENT_PERIODS from "@/utils/appointmentPeriods"
import APPOINTMENT_RESPONSIBLE_FILTERS from "@/utils/appointmentResponsibleFilters"
import APPOINTMENT_STATUS_FILTERS from "@/utils/appointmentStatusFilters"

const SORT_BYS: readonly AppointmentSortBy[] = [
    "name",
    "appointment_datetime",
    "responsible",
    "status"
]
const SORT_ORDERS: readonly AppointmentSortOrder[] = ["asc", "desc"]
const PAGE = /^[1-9]\d*$/

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
    return allowed.find((option) => option === value)
}

function parsePage(value: string | null): number {
    if (value === null || !PAGE.test(value)) {
        return APPOINTMENT_LIST_DEFAULTS.page
    }

    const page = Number(value)

    return Number.isSafeInteger(page) ? page : APPOINTMENT_LIST_DEFAULTS.page
}

function parseAppointmentListParams(params: URLSearchParams): AppointmentListFilters {
    const filters: AppointmentListFilters = {
        status:
            pick(APPOINTMENT_STATUS_FILTERS, params.get("status")) ??
            APPOINTMENT_LIST_DEFAULTS.status,
        period: pick(APPOINTMENT_PERIODS, params.get("period")) ?? APPOINTMENT_LIST_DEFAULTS.period,
        responsible:
            pick(APPOINTMENT_RESPONSIBLE_FILTERS, params.get("responsible")) ??
            APPOINTMENT_LIST_DEFAULTS.responsible,
        page: parsePage(params.get("page"))
    }
    const sortBy = pick(SORT_BYS, params.get("sortBy"))

    if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = pick(SORT_ORDERS, params.get("sortOrder")) ?? "asc"
    }

    return filters
}

export default parseAppointmentListParams
