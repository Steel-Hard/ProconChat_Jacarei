import { NextFunction, Request, RequestHandler, Response } from "express"
import InvalidOriginError from "../errors/InvalidOriginError"

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function originOf(url: string): string | undefined {
    try {
        return new URL(url).origin
    } catch {
        return undefined
    }
}

function requestOrigin(req: Request): string | undefined {
    const origin = req.get("Origin")
    if (origin !== undefined) {
        return origin
    }
    const referer = req.get("Referer")
    return referer === undefined ? undefined : originOf(referer)
}

export function createRequireTrustedOrigin(frontendOrigin: string): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!STATE_CHANGING_METHODS.has(req.method)) {
            next()
            return
        }
        if (requestOrigin(req) !== frontendOrigin) {
            next(new InvalidOriginError("Request origin is not allowed"))
            return
        }
        next()
    }
}
