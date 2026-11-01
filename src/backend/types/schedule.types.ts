export type AppointmentReason = "REQUIRES_IN_PERSON" | "NOT_RESOLVED"
export type AppointmentStatus =
    | "PENDING"
    | "CONFIRMED"
    | "ATTENDED"
    | "NO_SHOW"
    | "CANCELED"

export type SlotMinutes = 20 | 30 | 40 | 60
export type MinNoticeDays = 0 | 1 | 2 | 3 | 5
export type ReminderHours = 2 | 6 | 12 | 24 | 48

export interface ScheduleUpdatedBy {
    id: number
    name: string
}

export interface ScheduleSettings {
    id: number
    slot_minutes: number
    seats_per_slot: number
    window_days: number
    min_notice_days: number
    wait_alert_days: number
    unit_address: string
    unit_address_complement: string | null
    reminder_enabled: boolean
    reminder_hours: number
    updated_by?: ScheduleUpdatedBy | null
    updated_at?: Date
}

export interface ScheduleRange {
    id: number
    weekday: number
    slot_index: number
    start_time: string
    end_time: string
}

export interface BlockedDate {
    id: number
    date: string
    start_time: string | null
    end_time: string | null
    description: string
}

export interface AvailableSlot {
    datetime: Date
    dateStr: string
    timeStr: string
    formatted: string
    remainingSeats: number
}

export interface DocumentsSent {
    group: string[]
    question: string[]
}

export interface BookAppointmentInput {
    sessionId: string
    questionId: number
    reason: AppointmentReason
    name: string
    cpfHash: string
    cpfMasked: string
    phone?: string
    byRepresentative: boolean
    appointmentDatetime: Date
}

export interface BookAppointmentResult {
    id: string
    appointmentCode: string
    protocol: string
    appointmentDatetime: Date
    unitAddress: string
    unitAddressComplement: string | null
    documentsSent: DocumentsSent
    reminderEnabled: boolean
    reminderHours: number
}

export interface ScheduleRangeItem {
    weekday: number
    slotIndex: number
    startTime: string
    endTime: string
}

export interface BlockedDateItem {
    date: string
    startTime: string | null
    endTime: string | null
    description: string
}

export interface ScheduleConfigView {
    effectiveFrom?: string | null
    slotMinutes: SlotMinutes
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: MinNoticeDays
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: ReminderHours
    ranges: ScheduleRangeItem[]
    blockedDates: BlockedDateItem[]
    updatedBy: ScheduleUpdatedBy | null
    updatedAt: string | null
}

export interface ScheduleVersion {
    effectiveFrom: string | null
    config: ScheduleConfigView
}

export interface ScheduleRangeInputItem {
    weekday: number
    slotIndex?: number
    startTime: string
    endTime: string
}

export interface BlockedDateInputItem {
    date: string
    startTime?: string | null
    endTime?: string | null
    description: string
}

export interface ScheduleConfigInput {
    slotMinutes: SlotMinutes
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: MinNoticeDays
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement?: string | null
    reminderEnabled: boolean
    reminderHours: ReminderHours
    ranges: ScheduleRangeInputItem[]
    blockedDates: BlockedDateInputItem[]
}

export interface NormalizedScheduleConfig {
    slotMinutes: SlotMinutes
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: MinNoticeDays
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: ReminderHours
    ranges: ScheduleRangeItem[]
    blockedDates: BlockedDateItem[]
}

export interface ReturningAppointment {
    id: string
    appointmentDatetime: Date
    status: "PENDING" | "CONFIRMED"
}

export interface CitizenCancelInput {
    sessionId: string
    appointmentId: number | string
    phoneHash: string
    now?: Date
}

export interface CitizenCancelResult {
    protocol: string
}

export interface FutureActiveAppointment {
    id: string
    protocol: string
    name: string
    cpfMasked: string
    appointmentDatetime: Date
    requestDatetime: Date
    status: "PENDING" | "CONFIRMED"
    assignedUserId: number | null
    offGrid: boolean
}

export type ScheduleConflictCode =
    | "DATE_BLOCKED"
    | "PERIOD_BLOCKED"
    | "DAY_WITHOUT_SERVICE"
    | "DURATION_CHANGED"
    | "RANGE_CHANGED"
    | "SEATS_REDUCED"
    | "RESPONSIBLE_OVERLAP"

export interface ScheduleConflictItem {
    id: string
    protocol: string
    name: string
    cpfMasked: string
    appointmentDatetime: string
    date: string
    time: string
    status: "PENDING" | "CONFIRMED"
    reason: string
    code: ScheduleConflictCode
    conflictingAppointmentId?: string
    conflictingProtocol?: string
}

export type DayPreviewStatus =
    | "AVAILABLE"
    | "FULL"
    | "BEFORE_MIN_NOTICE"
    | "BLOCKED"
    | "NO_SERVICE"
    | "OUTSIDE_WINDOW"
    | "PAST"
    | "CLOSED_TODAY"

export interface DaySlotPreview {
    time: string
    capacity: number
    usedSeats: number
    freeSeats: number
    offered: boolean
    past: boolean
}

export interface DayPreview {
    date: string
    weekday: number
    status: DayPreviewStatus
    totalSlots: number
    capacity: number
    usedSeats: number
    freeSeats: number
    blockDescription: string | null
    slots: DaySlotPreview[]
}

export interface WeekdayPreview {
    weekday: number
    slots: string[]
    totalSlots: number
    totalSeats: number
}

export interface MonthlyGridPreview {
    month: string
    today: string
    windowStart: string
    windowEnd: string
    totalWindowSlots: number
    totalWindowSeats: number
    usedWindowSeats: number
    freeWindowSeats: number
    weekdays: WeekdayPreview[]
    days: DayPreview[]
}

export interface MonthlyPreviewResult extends MonthlyGridPreview {
    conflicts: SchedulePreviewConflict[]
}

export interface SchedulePreviewConflict {
    protocol: string
    date: string
    time: string
    status: "PENDING" | "CONFIRMED"
    code: ScheduleConflictCode
    reason: string
}

export interface BookedTime {
    time: string
    count: number
}

export interface BookedDay {
    date: string
    weekday: number
    total: number
    times: BookedTime[]
}

export interface BookedDaysResult {
    days: BookedDay[]
}
