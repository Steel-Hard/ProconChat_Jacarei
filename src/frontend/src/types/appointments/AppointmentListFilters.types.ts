import type AppointmentPeriod from "@/types/appointments/AppointmentPeriod.types"
import type AppointmentResponsibleFilter from "@/types/appointments/AppointmentResponsibleFilter.types"
import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentSortOrder from "@/types/appointments/AppointmentSortOrder.types"
import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"

type AppointmentListFilters = {
    search?: string
    status: AppointmentStatusFilter
    period: AppointmentPeriod
    responsible: AppointmentResponsibleFilter
    sortBy?: AppointmentSortBy
    sortOrder?: AppointmentSortOrder
    page: number
}

export default AppointmentListFilters
