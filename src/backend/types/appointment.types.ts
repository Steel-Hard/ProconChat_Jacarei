export type AppointmentStatus =
    | "PENDING"
    | "CONFIRMED"
    | "ATTENDED"
    | "NO_SHOW"
    | "CANCELED"

export type AppointmentReason = "REQUIRES_IN_PERSON" | "NOT_RESOLVED"

export type AppointmentEventType =
    | "CREATED"
    | "CLAIMED"
    | "ASSIGNED"
    | "RESCHEDULED"
    | "BACK_TO_PENDING"
    | "ATTENDED"
    | "NO_SHOW"
    | "RECORD_CORRECTED"
    | "CANCELED_BY_CITIZEN"
    | "CANCELED_BY_STAFF"
    | "CITIZEN_NOTIFIED"
    | "CITIZEN_NOTIFICATION_FAILED"
    | "REMINDER_SENT"
    | "KEPT_OFF_GRID"

export type AppointmentFilterStatus =
    | "all"
    | "PENDING"
    | "CONFIRMED"
    | "ATTENDED"
    | "NO_SHOW"
    | "CANCELED"
    | "waiting_record"

export type AppointmentFilterPeriod =
    | "all"
    | "today"
    | "this_week"
    | "upcoming"
    | "past"

export type AppointmentSortBy =
    | "name"
    | "appointment_datetime"
    | "responsible"
    | "status"

export type AppointmentSortOrder = "asc" | "desc"

export type AppointmentActionType = "claim" | "attended" | "no_show"

export interface AppointmentListItem {
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

export interface AppointmentChipCounts {
    all: number
    pending: number
    confirmed: number
    attended: number
    no_show: number
    canceled: number
    waiting_record: number
}

export interface AppointmentListResponse {
    items: AppointmentListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
    chipCounts: AppointmentChipCounts
}

export interface AppointmentEventItem {
    id: string
    type: AppointmentEventType
    actor_user_id: string | null
    actor_user_name: string | null
    data: Record<string, unknown>
    created_at: string
}

export interface ConversationTimelineStep {
    id: string
    type: string
    created_at: string
    generated_by_ai: boolean
    data: Record<string, unknown>
}

export type TransitionErrorCode =
    | "APPOINTMENT_ALREADY_CLAIMED"
    | "ALREADY_ATTENDED"
    | "ALREADY_NO_SHOW"
    | "APPOINTMENT_CANCELED"
    | "ATTENDANCE_NOT_YET_AVAILABLE"
    | "NO_SHOW_NOT_YET_AVAILABLE"

export interface AppointmentActionAvailability {
    allowed: boolean
    code: TransitionErrorCode | null
}

export type AppointmentAvailableActions = Record<AppointmentActionType, AppointmentActionAvailability>

export interface AppointmentDetail {
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

    events: AppointmentEventItem[]
    timeline: ConversationTimelineStep[]
    available_actions: AppointmentAvailableActions
}

export type AppointmentDetailRecord = Omit<AppointmentDetail, "available_actions">

export interface AppointmentListFilters {
    search?: string
    status?: AppointmentFilterStatus
    period?: AppointmentFilterPeriod
    responsible?: string
    sortBy?: AppointmentSortBy
    sortOrder?: AppointmentSortOrder
    page?: number
    limit?: number
    currentUserId?: number
}
