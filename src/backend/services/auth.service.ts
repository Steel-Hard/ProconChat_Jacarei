import BadRequestError from "../errors/BadRequestError"
import InvalidCurrentPasswordError from "../errors/InvalidCurrentPasswordError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AuthRepository } from "../repositories/auth.repository.interface"
import { authRepository } from "../repositories/auth.repository"
import { AuthenticatedUser, PublicUser } from "../types/auth.types"
import { bcryptPasswordHasher, PasswordHasher } from "../utils/passwordHasher"
import validatePassword from "../utils/passwordPolicy"
import { REFRESH_TOKEN_TTL_MS, SessionTokens, sessionTokens } from "../utils/sessionToken"
import { LoginAttemptLimiter, loginAttemptLimiter } from "./loginAttemptLimiter.service"

const MAX_PASSWORD_BYTES = 72
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"
const DUMMY_PASSWORD_HASH = "$2b$12$fwrly6zoDK9AUOO9jrDJjerRsIWgJr.215Nqdf1.52CQf2c8SG1l."

export interface LoginInput {
    email: string
    password: string
    ip: string
}

export interface IssuedSession {
    accessToken: string
    refreshToken: string
    refreshExpiresAt: Date
}

export interface LoginResult extends IssuedSession {
    user: PublicUser
}

export interface AuthService {
    login(input: LoginInput): Promise<LoginResult>
    refresh(refreshToken: string | undefined): Promise<{ accessToken: string }>
    logout(): Promise<void>
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<IssuedSession>
}

interface AuthServiceDependencies {
    users: AuthRepository
    limiter: LoginAttemptLimiter
    hasher: PasswordHasher
    tokens: SessionTokens
    now: () => number
}

export function toPublicUser({ id, name, email, isAdmin, permissions }: PublicUser): PublicUser {
    return { id, name, email, isAdmin, permissions: [...permissions] }
}

const fitsBcrypt = (password: string): boolean => Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES

export function createAuthService({ users, limiter, hasher, tokens, now }: AuthServiceDependencies): AuthService {
    const issueSession = (user: Pick<AuthenticatedUser, "id">, sessionVersion: number): IssuedSession => {
        const claims = { userId: user.id, sessionVersion }
        const refreshExpiresAt = new Date(now() + REFRESH_TOKEN_TTL_MS)
        return {
            accessToken: tokens.signAccessToken(claims),
            refreshToken: tokens.signRefreshToken({ ...claims, expiresAt: refreshExpiresAt }),
            refreshExpiresAt,
        }
    }

    return {
        async login({ email: rawEmail, password, ip }) {
            const email = rawEmail.trim().toLowerCase()
            const attempt = { ip, email }
            const limit = limiter.check(attempt)
            if (limit.blocked) {
                throw new TooManyRequestsError("Too many login attempts. Try again later", limit.retryAfterSeconds)
            }

            const user = await users.findByEmail(email)
            const matches = await hasher.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
            if (!user || !user.active || !matches || !fitsBcrypt(password)) {
                limiter.recordFailure(attempt)
                throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE)
            }

            limiter.reset(attempt)
            await users.recordLogin(user.id)
            return { user: toPublicUser(user), ...issueSession(user, user.sessionVersion) }
        },

        async refresh(refreshToken) {
            const claims = refreshToken ? tokens.verifyRefreshToken(refreshToken) : null
            const user = claims ? await users.findActiveById(claims.userId) : null
            if (!claims || !user || user.sessionVersion !== claims.sessionVersion) {
                throw new UnauthorizedError("Invalid or expired session")
            }
            return { accessToken: tokens.signAccessToken(claims) }
        },

        async logout() {
            return undefined
        },

        async changePassword(userId, currentPassword, newPassword) {
            const violation = validatePassword(newPassword)
            if (violation) {
                throw new BadRequestError(violation)
            }

            const user = await users.findActiveWithPassword(userId)
            if (!user) {
                throw new UnauthorizedError("Invalid or expired session")
            }
            const matches = await hasher.compare(currentPassword, user.passwordHash)
            if (!matches || !fitsBcrypt(currentPassword)) {
                throw new InvalidCurrentPasswordError("Current password is incorrect")
            }

            const sessionVersion = await users.updatePassword(user.id, await hasher.hash(newPassword))
            if (sessionVersion === null) {
                throw new UnauthorizedError("Invalid or expired session")
            }
            return issueSession(user, sessionVersion)
        },
    }
}

export const authService = createAuthService({
    users: authRepository,
    limiter: loginAttemptLimiter,
    hasher: bcryptPasswordHasher,
    tokens: sessionTokens,
    now: Date.now,
})
