import type AppointmentList from "@/types/appointments/AppointmentList.types"
import type AppointmentListItem from "@/types/appointments/AppointmentListItem.types"

function buildAppointmentList(
    items: AppointmentListItem[],
    overrides: Partial<AppointmentList> = {}
): AppointmentList {
    return {
        items,
        total: items.length,
        page: 1,
        limit: 20,
        totalPages: items.length > 0 ? 1 : 0,
        chipCounts: {
            all: items.length,
            pending: items.filter((item) => item.status === "PENDING").length,
            confirmed: items.filter((item) => item.status === "CONFIRMED").length,
            attended: items.filter((item) => item.status === "ATTENDED").length,
            no_show: items.filter((item) => item.status === "NO_SHOW").length,
            canceled: items.filter((item) => item.status === "CANCELED").length,
            waiting_record: items.filter((item) => item.waiting_record).length
        },
        ...overrides
    }
}

export default buildAppointmentList
