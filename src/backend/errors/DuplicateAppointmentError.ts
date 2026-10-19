import AppError from "./AppError"

class DuplicateAppointmentError extends AppError {
    constructor(message: string = "Você já possui um agendamento ativo para este mesmo horário") {
        super(message, 409, "DUPLICATE_APPOINTMENT")
    }
}

export default DuplicateAppointmentError
