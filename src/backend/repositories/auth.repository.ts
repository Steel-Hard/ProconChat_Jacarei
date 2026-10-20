import getPool from "../db/connection"
import { Permission, PERMISSIONS, UserCredentials } from "../types/auth.types"
import { AuthRepository } from "./auth.repository.interface"

interface UserRow {
    id: string
    name: string
    email: string
    password_hash: string
    active: boolean
    is_admin: boolean
    session_version: number
    permissions: string[]
}

const USER_COLUMNS = "u.id, u.name, u.email, u.password_hash, u.active, u.is_admin, u.session_version"

function permissionsOf(row: UserRow): Permission[] {
    if (row.is_admin) {
        return [...PERMISSIONS]
    }
    const granted = new Set(row.permissions)
    return PERMISSIONS.filter((permission) => granted.has(permission))
}

function toUserCredentials(row: UserRow): UserCredentials {
    return {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
        active: row.active,
        isAdmin: row.is_admin,
        permissions: permissionsOf(row),
        sessionVersion: row.session_version,
    }
}

function withoutCredentials({ passwordHash: _passwordHash, active: _active, ...user }: UserCredentials) {
    return user
}

async function findOne(where: string, params: unknown[]): Promise<UserCredentials | null> {
    const result = await getPool().query<UserRow>(
        `SELECT ${USER_COLUMNS},
                COALESCE(
                    (SELECT array_agg(up.permission_key::text) FROM UserPermissions up WHERE up.user_id = u.id),
                    '{}'
                ) AS permissions
         FROM Users u
         WHERE ${where}
         LIMIT 1`,
        params,
    )
    const row = result.rows[0]
    return row ? toUserCredentials(row) : null
}

export const authRepository: AuthRepository = {
    findByEmail: (email) => findOne("lower(u.email) = $1", [email]),

    findActiveWithPassword: (id) => findOne("u.id = $1 AND u.active", [id]),

    async findActiveById(id) {
        const user = await findOne("u.id = $1 AND u.active", [id])
        return user ? withoutCredentials(user) : null
    },

    async recordLogin(id) {
        await getPool().query("UPDATE Users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
    },

    async updatePassword(id, passwordHash) {
        const result = await getPool().query<{ session_version: number }>(
            `UPDATE Users SET password_hash = $2, session_version = session_version + 1
             WHERE id = $1 AND active
             RETURNING session_version`,
            [id, passwordHash],
        )
        return result.rows[0]?.session_version ?? null
    },
}
