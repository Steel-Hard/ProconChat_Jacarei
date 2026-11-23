import AppError from "./AppError"

class NotFoundError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 404, "NOT_FOUND", details)
    }
}

export default NotFoundError
