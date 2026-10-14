import { NextFunction, Request, RequestHandler, Response } from "express"
import ForbiddenError from "../errors/ForbiddenError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AuthRepository } from "../repositories/auth.repository.interface"
import { authRepository } from "../repositories/auth.repository"
import { Permission } from "../types/auth.types"
import readCookie from "../utils/readCookie"
import { ACCESS_COOKIE_NAME } from "../utils/sessionCookies"
import { SessionTokens, sessionTokens } from "../utils/sessionToken"

const AUTHENTICATION_REQUIRED = "Authentication required"

interface RequireAuthDependencies {
    users: Pick<AuthRepository, "findActiveById">
    tokens: Pick<SessionTokens, "verifyAccessToken">
}

export function createRequireAuth({ users, tokens }: RequireAuthDependencies): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const token = readCookie(req, ACCESS_COOKIE_NAME)
            const claims = token ? tokens.verifyAccessToken(token) : null
            const user = claims ? await users.findActiveById(claims.userId) : null
            if (!claims || !user || user.sessionVersion !== claims.sessionVersion) {
                next(new UnauthorizedError(AUTHENTICATION_REQUIRED))
                return
            }
            req.authUser = user
            next()
        } catch (error) {
            next(error)
        }
    }
}

export function requirePermission(permission: Permission): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const user = req.authUser
        if (!user) {
            next(new UnauthorizedError(AUTHENTICATION_REQUIRED))
            return
        }
        if (!user.isAdmin && !user.permissions.includes(permission)) {
            next(new ForbiddenError("Insufficient permission"))
            return
        }
        next()
    }
}

export const requireAuth = createRequireAuth({ users: authRepository, tokens: sessionTokens })
