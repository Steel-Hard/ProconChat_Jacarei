import AppError from "./AppError"

export default class PayloadTooLargeError extends AppError {
    constructor(message = "Payload too large") {
        super(message, 413, "PAYLOAD_TOO_LARGE")
    }
}
