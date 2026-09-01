import AppError from "./AppError"

class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400, "BAD_REQUEST")
    }
}

export default BadRequestError
