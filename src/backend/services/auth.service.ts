import bcrypt from "bcrypt"
import { authRepository, AuthUserRecord } from "../repositories/auth.repository"
import BadRequestError from "../errors/BadRequestError"
import UnauthorizedError from "../errors/UnauthorizedError"
import TooManyRequestsError from "../errors/TooManyRequestsError"
import { loginAttemptLimiter } from "./loginAttemptLimiter.service"

export type PublicUser = {
    id: number
    name: string
    email: string
    isAdmin: boolean
    permissions: AuthUserRecord["permissions"]
}

const publicUser = (user: AuthUserRecord): PublicUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    permissions: user.permissions,
})

export const authService = {
    async login(emailInput: string, password: string, attemptKey: string): Promise<{
        user: PublicUser
        sessionVersion: number
    }> {
        if (loginAttemptLimiter.isBlocked(attemptKey)) {
            throw new TooManyRequestsError()
        }

        const email = emailInput.trim().toLowerCase()
        const user = await authRepository.findByEmail(email)
        const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false
        if (!user || !passwordMatches || !user.active) {
            loginAttemptLimiter.recordFailure(attemptKey)
            throw new UnauthorizedError("Invalid email or password")
        }

        loginAttemptLimiter.reset(attemptKey)
        await authRepository.recordLogin(user.id)
        return { user: publicUser(user), sessionVersion: user.sessionVersion }
    },

    async changePassword(
        userId: number,
        currentPassword: string,
        newPassword: string,
    ): Promise<number> {
        if (newPassword.length < 8) {
            throw new BadRequestError("New password must contain at least 8 characters")
        }
        const user = await authRepository.findActiveWithPassword(userId)
        if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
            throw new UnauthorizedError("Current password is incorrect")
        }
        const passwordHash = await bcrypt.hash(newPassword, 12)
        return authRepository.changePassword(user.id, passwordHash)
    },
}
