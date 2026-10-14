import AppError from "./AppError"

export default class ServiceUnavailableError extends AppError {
    constructor(message = "Service unavailable") {
        super(message, 503, "SERVICE_UNAVAILABLE")
    }
}
