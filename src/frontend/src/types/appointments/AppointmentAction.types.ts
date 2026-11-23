type AppointmentAction =
    | "claim"
    | "attended"
    | "no_show"
    | "assign"
    | "correct_record"
    | "cancel"
    | "retry_cancellation_notice"
    | "add_note"

export default AppointmentAction
