import jwt from "jsonwebtoken"

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000

const MIN_SECRET_LENGTH = 32
const SUBJECT_PATTERN = /^[1-9][0-9]*$/

type TokenType = "access" | "refresh"

export interface SessionClaims {
    userId: number
    sessionVersion: number
}

export interface SessionTokens {
    signAccessToken(claims: SessionClaims): string
    verifyAccessToken(token: string): SessionClaims | null
    signRefreshToken(claims: SessionClaims & { expiresAt: Date }): string
    verifyRefreshToken(token: string): SessionClaims | null
}

interface SessionTokensOptions {
    secret: () => string | undefined
    now: () => number
}

export function createSessionTokens({ secret, now }: SessionTokensOptions): SessionTokens {
    const readSecret = (): string => {
        const value = secret()
        if (!value || value.length < MIN_SECRET_LENGTH) {
            throw new Error(`AUTH_TOKEN_SECRET must contain at least ${MIN_SECRET_LENGTH} characters`)
        }
        return value
    }

    const nowInSeconds = (): number => Math.floor(now() / 1000)

    const sign = (typ: TokenType, { userId, sessionVersion }: SessionClaims, exp: number): string =>
        jwt.sign({ sub: String(userId), sessionVersion, typ, iat: nowInSeconds(), exp }, readSecret(), {
            algorithm: "HS256",
        })

    const verify = (typ: TokenType, token: string): SessionClaims | null => {
        let payload: string | jwt.JwtPayload
        try {
            payload = jwt.verify(token, readSecret(), { algorithms: ["HS256"], clockTimestamp: nowInSeconds() })
        } catch {
            return null
        }
        if (typeof payload === "string" || payload.typ !== typ || typeof payload.exp !== "number") {
            return null
        }
        const { sub, sessionVersion } = payload
        if (typeof sub !== "string" || !SUBJECT_PATTERN.test(sub)) {
            return null
        }
        const userId = Number(sub)
        if (!Number.isSafeInteger(userId) || !Number.isInteger(sessionVersion) || sessionVersion < 0) {
            return null
        }
        return { userId, sessionVersion }
    }

    return {
        signAccessToken: (claims) => sign("access", claims, nowInSeconds() + ACCESS_TOKEN_TTL_SECONDS),
        verifyAccessToken: (token) => verify("access", token),
        signRefreshToken: ({ expiresAt, ...claims }) =>
            sign("refresh", claims, Math.floor(expiresAt.getTime() / 1000)),
        verifyRefreshToken: (token) => verify("refresh", token),
    }
}

export const sessionTokens = createSessionTokens({
    secret: () => process.env.AUTH_TOKEN_SECRET,
    now: Date.now,
})
