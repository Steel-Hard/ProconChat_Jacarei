export interface ErrorResponseBody {
    error: {
        code: string
        message: string
        details?: Record<string, unknown>
    }
}
