import type AppointmentCalendarData from "@/types/appointments/AppointmentCalendar.types"
import type AppointmentCalendarGrid from "@/types/appointments/AppointmentCalendarGrid.types"

function sortedUnique(values: string[]): string[] {
    return [...new Set(values)].toSorted()
}

function appointmentCalendarGrid(data: AppointmentCalendarData): AppointmentCalendarGrid {
    return {
        dates: sortedUnique([
            ...data.days.map((day) => day.date),
            ...data.appointments.map((appointment) => appointment.date)
        ]),
        times: sortedUnique([
            ...data.days.flatMap((day) => day.slots.map((slot) => slot.time)),
            ...data.appointments.map((appointment) => appointment.time)
        ])
    }
}

export default appointmentCalendarGrid
