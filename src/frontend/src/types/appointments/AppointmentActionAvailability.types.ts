import type AppointmentActionCode from "@/types/appointments/AppointmentActionCode.types"

type AppointmentActionAvailability = {
    allowed: boolean
    code: AppointmentActionCode | null
}

export default AppointmentActionAvailability
