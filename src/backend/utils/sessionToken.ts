import jwt from "jsonwebtoken"

export const SESSION_COOKIE_NAME = "proconchat_session"
export const SESSION_DURATION_SECONDS = 8 * 60 * 60

export interface SessionTokenPayload extends jwt.JwtPayload {
    sub: string
    sessionVersion: number
}

function getTokenSecret(): string {
    const secret = process.env.AUTH_TOKEN_SECRET
    if (!secret || secret.length < 32) {
        throw new Error("AUTH_TOKEN_SECRET must contain at least 32 characters")
    }
    return secret
}

export function signSessionToken(userId: number, sessionVersion: number): string {
    return jwt.sign({ sessionVersion }, getTokenSecret(), {
        subject: String(userId),
        expiresIn: SESSION_DURATION_SECONDS,
        algorithm: "HS256",
    })
}

export function verifySessionToken(token: string): SessionTokenPayload {
    const payload = jwt.verify(token, getTokenSecret(), { algorithms: ["HS256"] })
    if (
        typeof payload === "string" ||
        typeof payload.sub !== "string" ||
        !Number.isInteger(payload.sessionVersion)
    ) {
        throw new jwt.JsonWebTokenError("Invalid session token")
    }
    return { ...payload, sub: payload.sub, sessionVersion: payload.sessionVersion as number }
}

const cookieSecurityOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
}

export const sessionCookieOptions = {
    ...cookieSecurityOptions,
    maxAge: SESSION_DURATION_SECONDS * 1000,
}

export const clearSessionCookieOptions = cookieSecurityOptions
