import getPool from "../db/connection"
import { PERMISSIONS, UserCredentials } from "../types/auth.types"
import { AuthRepository } from "./auth.repository.interface"

interface UserRow {
    id: string
    name: string
    email: string
    password_hash: string
    active: boolean
    is_admin: boolean
    session_version: number
}

const USER_COLUMNS = "id, name, email, password_hash, active, is_admin, session_version"

function toUserCredentials(row: UserRow): UserCredentials {
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
}

function withoutCredentials({ passwordHash: _passwordHash, active: _active, ...user }: UserCredentials) {
    return user
}

async function findOne(where: string, params: unknown[]): Promise<UserCredentials | null> {
    const result = await getPool().query<UserRow>(`SELECT ${USER_COLUMNS} FROM Users WHERE ${where} LIMIT 1`, params)
    const row = result.rows[0]
    return row ? toUserCredentials(row) : null
}

export const authRepository: AuthRepository = {
    findByEmail: (email) => findOne("lower(email) = $1", [email]),

    findActiveWithPassword: (id) => findOne("id = $1 AND active", [id]),

    async findActiveById(id) {
        const user = await findOne("id = $1 AND active", [id])
        return user ? withoutCredentials(user) : null
    },

    async findAdmin() {
        const user = await findOne("is_admin", [])
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
