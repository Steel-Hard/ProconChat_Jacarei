import AppError from "./AppError"

class ForbiddenError extends AppError {
    constructor(message: string, code: string = "FORBIDDEN", details?: Record<string, unknown>) {
        super(message, 403, code, details)
    }
}

export default ForbiddenError
