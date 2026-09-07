abstract class AppError extends Error {
    public readonly statusCode: number
    public readonly code: string

    constructor(message: string, statusCode: number, code: string) {
        super(message)
        this.name = new.target.name
        this.statusCode = statusCode
        this.code = code
    }
}

export default AppError
