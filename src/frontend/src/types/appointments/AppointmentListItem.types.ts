import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentListItem = {
    id: string
    protocol: string
    appointment_code: string
    name: string
    cpf_masked: string
    category_name: string
    question_title: string
    appointment_datetime: string
    by_representative: boolean
    assigned_user_id: string | null
    assigned_user_name: string | null
    status: AppointmentStatus
    off_grid: boolean
    waiting_record: boolean
}

export default AppointmentListItem
