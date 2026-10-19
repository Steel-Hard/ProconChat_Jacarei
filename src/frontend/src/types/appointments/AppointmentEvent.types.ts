import type AppointmentEventType from "@/types/appointments/AppointmentEventType.types"

type AppointmentEvent = {
    id: string
    type: AppointmentEventType
    actor_user_id: string | null
    actor_user_name: string | null
    data: Record<string, unknown>
    created_at: string
}

export default AppointmentEvent
