import AppError from "./AppError"

class ConflictError extends AppError {
    constructor(message: string, code: string = "CONFLICT") {
        super(message, 409, code)
    }
}

export default ConflictError
