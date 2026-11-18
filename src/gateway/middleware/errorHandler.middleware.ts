import { Request, Response, NextFunction } from "express"
import AppError from "../errors/AppError"
import BadGatewayError from "../errors/BadGatewayError"
import { ErrorResponseBody } from "../types/errorResponse.types"

function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) {
        next(err)
        return
    }

    if (err instanceof AppError) {
        const body: ErrorResponseBody = { error: { code: err.code, message: err.message } }
        if (err instanceof BadGatewayError && err.providerErrorCode !== null) {
            body.error.details = { providerErrorCode: err.providerErrorCode }
        }
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
