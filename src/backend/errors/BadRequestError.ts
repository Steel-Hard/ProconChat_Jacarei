import AppError from "./AppError"

class BadRequestError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 400, "BAD_REQUEST", details)
    }
}

export default BadRequestError
