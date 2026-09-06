import { randomUUID } from "node:crypto"
import { Request, Response, NextFunction } from "express"

function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID()
    res.setHeader("X-Request-Id", requestId)
    const startTimestamp = Date.now()
    res.on("finish", () => {
        const durationMs = Date.now() - startTimestamp
        console.log(JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs,
            requestId,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        }))
    })
    next()
}

export default requestLoggerMiddleware
