import AppError from "./AppError"

export default class BadGatewayError extends AppError {
    public readonly providerErrorCode: string | null

    constructor(message = "Bad gateway", providerErrorCode: string | null = null) {
        super(message, 502, "PROVIDER_ERROR")
        this.providerErrorCode = providerErrorCode
    }
}
