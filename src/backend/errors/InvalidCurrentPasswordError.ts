import AppError from "./AppError"

class InvalidCurrentPasswordError extends AppError {
    constructor(message: string) {
        super(message, 400, "INVALID_CURRENT_PASSWORD")
    }
}

export default InvalidCurrentPasswordError
