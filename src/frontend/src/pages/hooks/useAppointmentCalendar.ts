import { useSearchParams } from "react-router-dom"
import appointmentsApi from "@/store/api/appointments.api"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

const DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(value: string): boolean {
    const parsed = new Date(`${value}T12:00:00Z`)

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T12:00:00Z`)
    shifted.setUTCDate(shifted.getUTCDate() + days)
    return shifted.toISOString().slice(0, 10)
}

function useAppointmentCalendar(filters: AppointmentListFilters) {
    const [searchParams, setSearchParams] = useSearchParams()
    const enabled = searchParams.get("visao") === "calendario"
    const week = searchParams.get("semana")
    const date = week !== null && DATE.test(week) && isRealDate(week) ? week : undefined
    const query = appointmentsApi.useGetAppointmentCalendarQuery(
        { date, status: filters.status, responsible: filters.responsible },
        { skip: !enabled, refetchOnMountOrArgChange: true }
    )

    function setWeek(next: string | undefined) {
        setSearchParams(
            (current) => {
                const params = new URLSearchParams(current)

                if (next === undefined) {
                    params.delete("semana")
                } else {
                    params.set("semana", next)
                }

                return params
            },
            { replace: true }
        )
    }

    function setEnabled(value: boolean) {
        setSearchParams(
            (current) => {
                const params = new URLSearchParams(current)
                params.delete("semana")

                if (value) {
                    params.set("visao", "calendario")
                } else {
                    params.delete("visao")
                }

                return params
            },
            { replace: true }
        )
    }

    return {
        enabled,
        setEnabled,
        data: query.currentData,
        loading: query.isFetching,
        error: query.isError && !query.isFetching,
        retry: () => void query.refetch(),
        previous: () => {
            if (query.currentData) {
                setWeek(shiftDate(query.currentData.weekStart, -7))
            }
        },
        next: () => {
            if (query.currentData) {
                setWeek(shiftDate(query.currentData.weekStart, 7))
            }
        },
        current: () => setWeek(undefined)
    }
}

export default useAppointmentCalendar
