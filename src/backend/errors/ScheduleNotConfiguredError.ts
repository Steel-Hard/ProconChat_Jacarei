import AppError from "./AppError"

class ScheduleNotConfiguredError extends AppError {
    constructor(message: string = "Agenda não configurada") {
        super(message, 500, "SCHEDULE_NOT_CONFIGURED")
    }
}

export default ScheduleNotConfiguredError
