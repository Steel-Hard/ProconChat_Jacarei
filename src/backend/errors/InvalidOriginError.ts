import AppError from "./AppError"

class InvalidOriginError extends AppError {
    constructor(message: string) {
        super(message, 403, "INVALID_ORIGIN")
    }
}

export default InvalidOriginError
