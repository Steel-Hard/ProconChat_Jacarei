import AppError from "./AppError"

export default class TooManyRequestsError extends AppError {
    constructor(message = "Too many login attempts. Try again later.") {
        super(message, 429, "TOO_MANY_REQUESTS")
    }
}
