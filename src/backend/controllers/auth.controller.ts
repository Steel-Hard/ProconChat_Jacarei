import { NextFunction, Request, Response } from "express"
import BadRequestError from "../errors/BadRequestError"
import { authRepository } from "../repositories/auth.repository"
import { authService } from "../services/auth.service"
import {
    SESSION_COOKIE_NAME,
    clearSessionCookieOptions,
    sessionCookieOptions,
    signSessionToken,
} from "../utils/sessionToken"

function requiredString(value: unknown, field: string): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new BadRequestError(`${field} is required`)
    }
    return value
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const email = requiredString(req.body?.email, "Email")
        const password = requiredString(req.body?.password, "Password")
        const result = await authService.login(email, password, req.ip || "unknown")
        res.cookie(
            SESSION_COOKIE_NAME,
            signSessionToken(result.user.id, result.sessionVersion),
            sessionCookieOptions,
        )
        res.status(200).json({ data: result.user })
    } catch (error) {
        next(error)
    }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await authRepository.revokeSessions(req.authUser!.id)
        res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions)
        res.status(204).end()
    } catch (error) {
        next(error)
    }
}

export function whoAmI(req: Request, res: Response): void {
    const { id, name, email, isAdmin, permissions } = req.authUser!
    res.status(200).json({ data: { id, name, email, isAdmin, permissions } })
}

export async function changePassword(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const currentPassword = requiredString(req.body?.currentPassword, "Current password")
        const newPassword = requiredString(req.body?.newPassword, "New password")
        const sessionVersion = await authService.changePassword(
            req.authUser!.id,
            currentPassword,
            newPassword,
        )
        res.cookie(
            SESSION_COOKIE_NAME,
            signSessionToken(req.authUser!.id, sessionVersion),
            sessionCookieOptions,
        )
        res.status(200).json({ data: { changed: true } })
    } catch (error) {
        next(error)
    }
}
