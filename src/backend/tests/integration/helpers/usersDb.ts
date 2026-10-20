import bcrypt from "bcryptjs"
import getPool from "../../../db/connection"
import type { Permission } from "../../../types/auth.types"
import { sessionTokens } from "../../../utils/sessionToken"
import { firstRow, loginAdmin } from "./appointmentsDb"

export interface TestUserInput {
    name?: string
    permissions?: Permission[]
    active?: boolean
    isAdmin?: boolean
    password?: string
}

export interface TestUser {
    id: number
    name: string
    email: string
    cookie: string
    createdId: number | null
}

let createdCount = 0

export function accessCookie(userId: number, sessionVersion: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion })}`
}

export async function createTestUser(input: TestUserInput = {}): Promise<TestUser> {
    const pool = getPool()
    if (input.isAdmin) {
        const admin = await loginAdmin()
        const row = firstRow(
            (await pool.query<{ name: string; email: string }>("SELECT name, email FROM Users WHERE id = $1", [admin.adminUserId]))
                .rows,
        )
        return { id: admin.adminUserId, name: row.name, email: row.email, cookie: admin.adminCookie, createdId: admin.createdAdminId }
    }

    createdCount += 1
    const name = input.name ?? `Equipe Teste ${createdCount}`
    const email = `conta-${process.pid}-${Date.now()}-${createdCount}@teste.local`
    const passwordHash = input.password ? await bcrypt.hash(input.password, 4) : "hash"
    const result = await pool.query<{ id: string }>(
        "INSERT INTO Users (name, email, password_hash, active) VALUES ($1, $2, $3, $4) RETURNING id",
        [name, email, passwordHash, input.active ?? true],
    )
    const id = Number(firstRow(result.rows).id)
    for (const permission of input.permissions ?? []) {
        await pool.query("INSERT INTO UserPermissions (user_id, permission_key) VALUES ($1, $2)", [id, permission])
    }
    return { id, name, email, cookie: accessCookie(id, 0), createdId: id }
}

export async function deleteTestUsers(ids: (number | null)[]): Promise<void> {
    const userIds = ids.filter((id): id is number => id !== null)
    if (userIds.length === 0) {
        return
    }
    const pool = getPool()
    await pool.query("DELETE FROM UserPermissions WHERE user_id = ANY($1::bigint[]) OR granted_by = ANY($1::bigint[])", [userIds])
    await pool.query(
        "UPDATE Users SET permissions_updated_by = NULL, permissions_updated_at = NULL WHERE permissions_updated_by = ANY($1::bigint[])",
        [userIds],
    )
    await pool.query("DELETE FROM Users WHERE id = ANY($1::bigint[])", [userIds])
}
