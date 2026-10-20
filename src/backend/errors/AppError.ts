abstract class AppError extends Error {
    public readonly statusCode: number
    public readonly code: string
    public readonly details: Record<string, unknown> | undefined

    constructor(message: string, statusCode: number, code: string, details?: Record<string, unknown>) {
        super(message)
        this.name = new.target.name
        this.statusCode = statusCode
        this.code = code
        this.details = details
    }
}

export default AppError
