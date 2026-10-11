import getPool from "../db/connection"
import { AuthenticatedUser, PERMISSIONS } from "../types/auth.types"

export interface AuthUserRecord extends AuthenticatedUser {
    passwordHash: string
    active: boolean
}

const pool = () => getPool()

export const authRepository = {
    async findByEmail(email: string): Promise<AuthUserRecord | undefined> {
        const result = await pool().query(
            `SELECT id, name, email, password_hash, active, is_admin, session_version
             FROM Users WHERE lower(email) = $1 LIMIT 1`,
            [email],
        )
        const row = result.rows[0]
        if (!row) return undefined
        return {
            id: Number(row.id),
            name: row.name,
            email: row.email,
            passwordHash: row.password_hash,
            active: row.active,
            isAdmin: row.is_admin,
            permissions: row.is_admin ? [...PERMISSIONS] : [],
            sessionVersion: row.session_version,
        }
    },

    async findActiveById(id: number): Promise<AuthenticatedUser | undefined> {
        const result = await pool().query(
            `SELECT id, name, email, is_admin, session_version
             FROM Users WHERE id = $1 AND active = TRUE LIMIT 1`,
            [id],
        )
        const row = result.rows[0]
        if (!row) return undefined
        return {
            id: Number(row.id),
            name: row.name,
            email: row.email,
            isAdmin: row.is_admin,
            permissions: row.is_admin ? [...PERMISSIONS] : [],
            sessionVersion: row.session_version,
        }
    },

    async recordLogin(id: number): Promise<void> {
        await pool().query("UPDATE Users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
    },

    async findActiveWithPassword(id: number): Promise<AuthUserRecord | undefined> {
        const result = await pool().query(
            `SELECT id, name, email, password_hash, active, is_admin, session_version
             FROM Users WHERE id = $1 AND active = TRUE LIMIT 1`,
            [id],
        )
        const row = result.rows[0]
        if (!row) return undefined
        return {
            id: Number(row.id),
            name: row.name,
            email: row.email,
            passwordHash: row.password_hash,
            active: row.active,
            isAdmin: row.is_admin,
            permissions: row.is_admin ? [...PERMISSIONS] : [],
            sessionVersion: row.session_version,
        }
    },

    async revokeSessions(id: number): Promise<number> {
        const result = await pool().query(
            "UPDATE Users SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version",
            [id],
        )
        if (!result.rows[0]) throw new Error("Could not revoke user sessions")
        return result.rows[0].session_version
    },

    async changePassword(id: number, passwordHash: string): Promise<number> {
        const result = await pool().query(
            `UPDATE Users
             SET password_hash = $2, session_version = session_version + 1
             WHERE id = $1 AND active = TRUE
             RETURNING session_version`,
            [id, passwordHash],
        )
        if (!result.rows[0]) throw new Error("Could not update password for active user")
        return result.rows[0].session_version
    },
}
