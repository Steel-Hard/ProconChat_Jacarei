type AppointmentEventType =
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

export default AppointmentEventType
