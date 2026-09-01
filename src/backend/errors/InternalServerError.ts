import AppError from "./AppError"

class InternalServerError extends AppError {
    constructor(message: string) {
        super(message, 500, "INTERNAL_SERVER_ERROR")
    }
}

export default InternalServerError
