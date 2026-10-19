import AppError from "./AppError"

class TooManyRequestsError extends AppError {
    public readonly retryAfterSeconds: number

    constructor(message: string, retryAfterSeconds: number) {
        super(message, 429, "TOO_MANY_REQUESTS")
        this.retryAfterSeconds = retryAfterSeconds
    }
}

export default TooManyRequestsError
