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

export type AppointmentReassignmentReason = "USER_DEACTIVATED" | "MANAGE_PERMISSION_REMOVED"

export interface AssignedEventData {
    assignee_user_id: number
    reason?: AppointmentReassignmentReason
}

export interface BackToPendingEventData {
    reason: AppointmentReassignmentReason
}

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

export const CANCELLATION_REASONS = ["UNIT_CLOSED", "CITIZEN_REQUEST", "DUPLICATE", "OTHER"] as const

export type CancellationReason = (typeof CANCELLATION_REASONS)[number]

export type AppointmentActionType = "claim" | "attended" | "no_show" | "assign" | "correct_record" | "cancel"

export type AppointmentAvailableActionKey = AppointmentActionType | "add_note" | "retry_cancellation_notice"

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

export interface AppointmentNote {
    id: string
    author_user_id: string
    author_user_name: string | null
    text: string
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
    | "RECORD_NOT_CORRECTABLE"
    | "ALREADY_ASSIGNED_TO_USER"
    | "INVALID_ASSIGNEE"
    | "ASSIGNEE_BUSY"
    | "PERMISSION_REQUIRED"
    | "CANCEL_AFTER_START"
    | "NOTIFICATION_NOT_RETRYABLE"
    | "CITIZEN_PHONE_UNAVAILABLE"
    | "NOTIFICATION_AFTER_START"

export interface AppointmentActionAvailability {
    allowed: boolean
    code: TransitionErrorCode | null
}

export type AppointmentAvailableActions = Record<AppointmentAvailableActionKey, AppointmentActionAvailability>

export interface CorrectionHistoryEvent {
    id: string
    type: AppointmentEventType
    data: Record<string, unknown>
    createdAt: Date
}

export type CorrectionTarget =
    | { status: "PENDING"; assignedUserId: null }
    | { status: "CONFIRMED"; assignedUserId: number }

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
    notes: AppointmentNote[]
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

export interface StaffMember {
    id: string
    name: string
    active: boolean
}

export interface CorrectionWarningDetails {
    appointmentId: string
    protocol: string
    previousAssignedUserId: string
    previousAssignedUserName: string
    conflictingAppointmentId?: string
    conflictingProtocol?: string
    freeStaffCount: number
}

export interface CorrectionWarning {
    code: "RESPONSIBLE_BUSY" | "RESPONSIBLE_UNAVAILABLE"
    message: string
    details: CorrectionWarningDetails
}

export interface CorrectionResult {
    warning: CorrectionWarning | null
}

export interface WeekAppointmentRecord {
    id: string
    protocol: string
    shortName: string
    appointmentDatetime: Date
    status: AppointmentStatus
    assigned_user_id: string | null
    off_grid: boolean
}

export interface CalendarFilters {
    status?: AppointmentFilterStatus
    responsible?: string
    currentUserId?: number
}

export interface CalendarBlockedPeriod {
    start: string
    end: string
    description: string
}

export interface CalendarDay {
    date: string
    blocked: {
        fullDay: boolean
        description: string | null
        periods: CalendarBlockedPeriod[]
    }
    slots: { time: string; freeSeats: number | null }[]
}

export interface CalendarAppointment {
    id: string
    protocol: string
    shortName: string
    date: string
    time: string
    status: AppointmentStatus
    assigned_user_id: string | null
    off_grid: boolean
}

export interface AppointmentCalendar {
    weekStart: string
    weekEnd: string
    weekStartDay: number
    days: CalendarDay[]
    appointments: CalendarAppointment[]
}
