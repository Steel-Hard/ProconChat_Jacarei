import { CookieOptions } from "express"
import { ACCESS_TOKEN_TTL_SECONDS } from "./sessionToken"

export const ACCESS_COOKIE_NAME = "proconchat_access"
export const REFRESH_COOKIE_NAME = "proconchat_refresh"

const ACCESS_COOKIE_PATH = "/"
const REFRESH_COOKIE_PATH = "/api/v1/auth"

export interface CookieEnv {
    NODE_ENV?: string
}

const baseOptions = (env: CookieEnv, path: string): CookieOptions => ({
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path,
})

export function accessCookieOptions(env: CookieEnv): CookieOptions {
    return { ...baseOptions(env, ACCESS_COOKIE_PATH), maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 }
}

export function refreshCookieOptions(env: CookieEnv, expiresAt: Date, now: number = Date.now()): CookieOptions {
    return { ...baseOptions(env, REFRESH_COOKIE_PATH), maxAge: Math.max(expiresAt.getTime() - now, 0) }
}

export function clearAccessCookieOptions(env: CookieEnv): CookieOptions {
    return baseOptions(env, ACCESS_COOKIE_PATH)
}

export function clearRefreshCookieOptions(env: CookieEnv): CookieOptions {
    return baseOptions(env, REFRESH_COOKIE_PATH)
}
