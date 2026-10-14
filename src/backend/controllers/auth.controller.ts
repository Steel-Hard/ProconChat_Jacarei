import { NextFunction, Request, Response } from "express"
import BadRequestError from "../errors/BadRequestError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AuthService, authService, IssuedSession, toPublicUser } from "../services/auth.service"
import readCookie from "../utils/readCookie"
import {
    ACCESS_COOKIE_NAME,
    CookieEnv,
    REFRESH_COOKIE_NAME,
    accessCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
    refreshCookieOptions,
} from "../utils/sessionCookies"

const MAX_EMAIL_LENGTH = 254

interface AuthControllerDependencies {
    auth: AuthService
}

class AuthController {
    private auth: AuthService

    constructor({ auth }: AuthControllerDependencies = { auth: authService }) {
        this.auth = auth
    }

    public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const credentials = this.readStrings(req.body, ["email", "password"] as const)
            if (!credentials) {
                throw new BadRequestError("email and password must be non-empty strings")
            }
            if (credentials.email.trim().length > MAX_EMAIL_LENGTH) {
                throw new BadRequestError(`email must not exceed ${MAX_EMAIL_LENGTH} characters`)
            }
            const result = await this.auth.login({ ...credentials, ip: req.ip ?? "" })
            this.setSessionCookies(res, result)
            res.status(200).json({ data: { user: result.user } })
        } catch (error) {
            if (error instanceof TooManyRequestsError) {
                res.set("Retry-After", String(error.retryAfterSeconds))
            }
            next(error)
        }
    }

    public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { accessToken } = await this.auth.refresh(readCookie(req, REFRESH_COOKIE_NAME))
            res.cookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions(this.cookieEnv()))
            res.status(204).end()
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                this.clearSessionCookies(res)
            }
            next(error)
        }
    }

    public async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.auth.logout()
            this.clearSessionCookies(res)
            res.status(204).end()
        } catch (error) {
            next(error)
        }
    }

    public me(req: Request, res: Response, next: NextFunction): void {
        if (!req.authUser) {
            next(new UnauthorizedError("Authentication required"))
            return
        }
        res.status(200).json({ data: toPublicUser(req.authUser) })
    }

    public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.authUser) {
                throw new UnauthorizedError("Authentication required")
            }
            const passwords = this.readStrings(req.body, ["currentPassword", "newPassword"] as const)
            if (!passwords) {
                throw new BadRequestError("currentPassword and newPassword must be non-empty strings")
            }
            const session = await this.auth.changePassword(req.authUser.id, passwords.currentPassword, passwords.newPassword)
            this.setSessionCookies(res, session)
            res.status(200).json({ data: { changed: true } })
        } catch (error) {
            next(error)
        }
    }

    private cookieEnv(): CookieEnv {
        return { NODE_ENV: process.env.NODE_ENV }
    }

    private readStrings<K extends string>(body: unknown, fields: readonly K[]): Record<K, string> | null {
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

    private setSessionCookies(res: Response, session: IssuedSession): void {
        const env = this.cookieEnv()
        res.cookie(ACCESS_COOKIE_NAME, session.accessToken, accessCookieOptions(env))
        res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(env, session.refreshExpiresAt))
    }

    private clearSessionCookies(res: Response): void {
        const env = this.cookieEnv()
        res.clearCookie(ACCESS_COOKIE_NAME, clearAccessCookieOptions(env))
        res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env))
    }
}

export default AuthController
