import AppError from "./AppError"

export default class BadGatewayError extends AppError {
    constructor(message = "Bad gateway") {
        super(message, 502, "PROVIDER_ERROR")
    }
}
