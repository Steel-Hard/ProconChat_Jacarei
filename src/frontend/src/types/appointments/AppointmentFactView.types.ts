import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentFactView = {
    label: string
    value: string
    status?: AppointmentStatus
    emphasis?: boolean
    mono?: boolean
    wide?: boolean
}

export default AppointmentFactView
