import { NextFunction, Request, Response } from "express"
import BadRequestError from "../errors/BadRequestError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { authService, IssuedSession, toPublicUser } from "../services/auth.service"
import readCookie from "../utils/readCookie"
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    accessCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
    refreshCookieOptions,
} from "../utils/sessionCookies"

const MAX_EMAIL_LENGTH = 254

const cookieEnv = () => ({ NODE_ENV: process.env.NODE_ENV })

function readStrings<K extends string>(body: unknown, fields: readonly K[]): Record<K, string> | null {
    if (typeof body !== "object" || body === null) {
        return null
    }
    const values = {} as Record<K, string>
    for (const field of fields) {
        const value: unknown = (body as Record<string, unknown>)[field]
        if (typeof value !== "string" || value.trim() === "") {
            return null
        }
        values[field] = value
    }
    return values
}

function setSessionCookies(res: Response, session: IssuedSession): void {
    const env = cookieEnv()
    res.cookie(ACCESS_COOKIE_NAME, session.accessToken, accessCookieOptions(env))
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(env, session.refreshExpiresAt))
}

function clearSessionCookies(res: Response): void {
    const env = cookieEnv()
    res.clearCookie(ACCESS_COOKIE_NAME, clearAccessCookieOptions(env))
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env))
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const credentials = readStrings(req.body, ["email", "password"] as const)
        if (!credentials) {
            throw new BadRequestError("email and password must be non-empty strings")
        }
        if (credentials.email.trim().length > MAX_EMAIL_LENGTH) {
            throw new BadRequestError(`email must not exceed ${MAX_EMAIL_LENGTH} characters`)
        }
        const result = await authService.login({ ...credentials, ip: req.ip ?? "" })
        setSessionCookies(res, result)
        res.status(200).json({ data: { user: result.user } })
    } catch (error) {
        if (error instanceof TooManyRequestsError) {
            res.set("Retry-After", String(error.retryAfterSeconds))
        }
        next(error)
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { accessToken } = await authService.refresh(readCookie(req, REFRESH_COOKIE_NAME))
        res.cookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions(cookieEnv()))
        res.status(204).end()
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            clearSessionCookies(res)
        }
        next(error)
    }
}

export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await authService.logout()
        clearSessionCookies(res)
        res.status(204).end()
    } catch (error) {
        next(error)
    }
}

export function me(req: Request, res: Response, next: NextFunction): void {
    if (!req.authUser) {
        next(new UnauthorizedError("Authentication required"))
        return
    }
    res.status(200).json({ data: toPublicUser(req.authUser) })
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.authUser) {
            throw new UnauthorizedError("Authentication required")
        }
        const passwords = readStrings(req.body, ["currentPassword", "newPassword"] as const)
        if (!passwords) {
            throw new BadRequestError("currentPassword and newPassword must be non-empty strings")
        }
        const session = await authService.changePassword(req.authUser.id, passwords.currentPassword, passwords.newPassword)
        setSessionCookies(res, session)
        res.status(200).json({ data: { changed: true } })
    } catch (error) {
        next(error)
    }
}
