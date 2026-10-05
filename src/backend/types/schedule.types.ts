export type AppointmentReason = "REQUIRES_IN_PERSON" | "NOT_RESOLVED"
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ATTENDED"
  | "NO_SHOW"
  | "CANCELED"

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
