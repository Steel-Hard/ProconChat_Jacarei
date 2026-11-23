import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type FutureAppointment = {
    id: string
    protocol: string
    name: string
    appointmentDatetime: string
    status: AppointmentStatus
}

export default FutureAppointment
