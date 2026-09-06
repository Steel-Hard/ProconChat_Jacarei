import { Request, Response, NextFunction } from "express"
import AppError from "../errors/AppError"
import { ErrorResponseBody } from "../types/errorResponse.types"

function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) {
        next(err)
        return
    }

    if (err instanceof AppError) {
        const body: ErrorResponseBody = { error: { code: err.code, message: err.message } }
        res.status(err.statusCode).json(body)
        return
    }

    console.error("Error:", err)
    const body: ErrorResponseBody = {
        error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" },
    }
    res.status(500).json(body)
}

export default errorHandler
