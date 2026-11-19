export type SessionOutcome =
    | "IN_PROGRESS"
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"
    | "ABANDONED"

export type SessionOutcomeFilter = "all" | SessionOutcome
export type SessionPeriod = "7" | "30" | "90" | "current_month" | "previous_month" | "custom"

export type SessionAppointment = {
    id: string
    protocol: string
    action: "CREATED" | "RESCHEDULED" | "CANCELED" | null
}

export type SessionListItem = {
    id: string
    code: string
    started_at: string
    outcome: SessionOutcome
    current_step: string | null
    category_name: string | null
    question_title: string | null
    appointment: SessionAppointment | null
}

export type SessionTimelineItem = {
    id: string
    type: string
    created_at: string
    category_name: string | null
    question_title: string | null
    data: Record<string, unknown>
    appointment: { id: string; protocol: string } | null
}

export type SessionDetail = {
    id: string
    code: string
    started_at: string
    ended_at: string | null
    outcome: SessionOutcome
    current_step: string | null
    category_name: string | null
    question_title: string | null
    appointment: SessionAppointment | null
    timeline: SessionTimelineItem[]
    other_sessions: { id: string; code: string; started_at: string; outcome: SessionOutcome }[]
    anonymized: boolean
}

export type SessionList = {
    items: SessionListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
    chipCounts: Record<
        | "all"
        | "resolved"
        | "scheduled"
        | "out_of_scope"
        | "no_slot"
        | "declined"
        | "managed_appointment"
        | "abandoned"
        | "in_progress",
        number
    >
    range: { from: string; to: string }
    categories: { id: number; name: string }[]
}

export type SessionFilters = {
    search?: string
    period: SessionPeriod
    categoryId?: number
    outcome: SessionOutcomeFilter
    from?: string
    to?: string
    page: number
}
