import AppError from "./AppError"

class ConflictError extends AppError {
    constructor(message: string, code: string = "CONFLICT", details?: Record<string, unknown>) {
        super(message, 409, code, details)
    }
}

export default ConflictError
