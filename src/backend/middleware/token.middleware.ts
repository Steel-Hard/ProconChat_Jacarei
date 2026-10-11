import { NextFunction, Request, Response } from "express"
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken"
import UnauthorizedError from "../errors/UnauthorizedError"
import ForbiddenError from "../errors/ForbiddenError"
import { authRepository } from "../repositories/auth.repository"
import { Permission } from "../types/auth.types"
import { SESSION_COOKIE_NAME, verifySessionToken } from "../utils/sessionToken"

function readSessionCookie(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) return undefined

    const cookie = cookieHeader.split(";").map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    if (!cookie) return undefined

    try {
        return decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1))
    } catch {
        return undefined
    }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const token = readSessionCookie(req)
        if (!token) throw new UnauthorizedError("Authentication required")

        const payload = verifySessionToken(token)
        const userId = Number(payload.sub)
        if (!Number.isSafeInteger(userId) || userId < 1) {
            throw new UnauthorizedError("Invalid session")
        }

        const user = await authRepository.findActiveById(userId)
        if (!user || user.sessionVersion !== payload.sessionVersion) {
            throw new UnauthorizedError("Session is no longer valid")
        }

        req.authUser = user
        next()
    } catch (error) {
        if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
            next(new UnauthorizedError("Invalid or expired session"))
            return
        }
        next(error)
    }
}

export function requirePermission(permission: Permission) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.authUser) {
            next(new UnauthorizedError("Authentication required"))
            return
        }
        if (!req.authUser.isAdmin && !req.authUser.permissions.includes(permission)) {
            next(new ForbiddenError("Insufficient permission"))
            return
        }
        next()
    }
}