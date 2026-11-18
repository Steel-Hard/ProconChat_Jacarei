export interface ErrorResponseBody {
    error: {
        code: string
        message: string
        details?: { providerErrorCode: string }
    }
}
