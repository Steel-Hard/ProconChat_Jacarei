import { useState } from "react"
import appointmentsApi from "@/store/api/appointments.api"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

function shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T12:00:00Z`)
    shifted.setUTCDate(shifted.getUTCDate() + days)
    return shifted.toISOString().slice(0, 10)
}

function useAppointmentCalendar(filters: AppointmentListFilters) {
    const [enabled, setEnabled] = useState(false)
    const [date, setDate] = useState<string>()
    const query = appointmentsApi.useGetAppointmentCalendarQuery(
        { date, status: filters.status, responsible: filters.responsible },
        { skip: !enabled, refetchOnMountOrArgChange: true }
    )

    return {
        enabled,
        setEnabled,
        data: query.currentData,
        loading: query.isFetching,
        error: query.isError && !query.isFetching,
        retry: () => void query.refetch(),
        previous: () => {
            if (query.currentData) {
                setDate(shiftDate(query.currentData.weekStart, -7))
            }
        },
        next: () => {
            if (query.currentData) {
                setDate(shiftDate(query.currentData.weekStart, 7))
            }
        },
        current: () => setDate(undefined)
    }
}

export default useAppointmentCalendar
