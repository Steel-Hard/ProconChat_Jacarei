import AppError from "./AppError"

export class BookingFailedError extends AppError {
    constructor(message: string = "Falha ao inserir agendamento") {
        super(message, 500, "BOOKING_FAILED")
    }
}

export default BookingFailedError
