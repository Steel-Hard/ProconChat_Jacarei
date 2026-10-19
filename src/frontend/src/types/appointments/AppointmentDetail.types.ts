import type AppointmentAvailableActions from "@/types/appointments/AppointmentAvailableActions.types"
import type AppointmentEvent from "@/types/appointments/AppointmentEvent.types"
import type AppointmentReason from "@/types/appointments/AppointmentReason.types"
import type AppointmentTimelineStep from "@/types/appointments/AppointmentTimelineStep.types"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentDetail = {
    id: string
    appointment_code: string
    protocol: string
    session_id: string
    status: AppointmentStatus
    name: string
    cpf_masked: string
    by_representative: boolean
    reason: AppointmentReason
    appointment_datetime: string
    rescheduled_from: string | null
    off_grid: boolean
    request_datetime: string
    assigned_user_id: string | null
    assigned_user_name: string | null
    category_id: string
    category_name: string
    question_id: string
    question_title: string
    documents_sent: {
        group: string[]
        question: string[]
    }
    is_documents_config_different: boolean
    events: AppointmentEvent[]
    timeline: AppointmentTimelineStep[]
    available_actions: AppointmentAvailableActions
}

export default AppointmentDetail
