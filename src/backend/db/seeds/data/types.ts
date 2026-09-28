export interface FaqQuestionSeed {
    question: string
    legalBasis: string | null
    answer: string
    requiresInPerson: boolean
    outOfScope?: boolean
    requiredDocuments: string[]
}

export interface FaqCategorySeed {
    title: string
    description: string
    questions: FaqQuestionSeed[]
}

export interface ScheduleRangeSeed {
    weekday: number
    slotIndex: number
    startTime: string
    endTime: string
}

export interface AttendanceDocumentsSeed {
    holder: string[]
    representative: string[]
}

export interface InitialConfigSeed {
    slotMinutes: number
    seatsPerSlot: number
    windowDays: number
    minNoticeDays: number
    waitAlertDays: number
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: number
    scheduleRanges: ScheduleRangeSeed[]
    attendanceDocuments: AttendanceDocumentsSeed
}
