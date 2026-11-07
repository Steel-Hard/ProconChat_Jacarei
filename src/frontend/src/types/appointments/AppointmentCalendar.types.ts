import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentCalendar = {
    weekStart: string
    weekEnd: string
    weekStartDay: number
    days: {
        date: string
        blocked: {
            fullDay: boolean
            description: string | null
            periods: { start: string; end: string; description: string }[]
        }
        slots: { time: string; freeSeats: number | null }[]
    }[]
    appointments: {
        id: string
        protocol: string
        shortName: string
        date: string
        time: string
        status: AppointmentStatus
        assigned_user_id: string | null
        off_grid: boolean
    }[]
}

export default AppointmentCalendar
