import AppError from "./AppError"

class AppointmentNotChangeableError extends AppError {
    constructor(message: string = "O agendamento não pode mais ser alterado") {
        super(message, 409, "APPOINTMENT_NOT_CHANGEABLE")
    }
}

export default AppointmentNotChangeableError
