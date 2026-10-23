import { Pool, PoolClient } from "pg"
import { Permission, PERMISSIONS } from "../types/auth.types"
import type { BusyAppointment, RuleAccount } from "../types/userAccount.types"

export const PROTOCOL_SQL = "UPPER(SUBSTRING(a.appointment_code::text, 1, 8))"

export function orderedPermissions(isAdmin: boolean, keys: string[]): Permission[] {
    if (isAdmin) {
        return [...PERMISSIONS]
    }
    const granted = new Set(keys)
    return PERMISSIONS.filter((permission) => granted.has(permission))
}

export async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        const result = await work(client)
        await client.query("COMMIT")
        return result
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

export async function lockAccounts(client: PoolClient, ids: number[]): Promise<RuleAccount[]> {
    if (ids.length === 0) {
        return []
    }
    const users = await client.query<{ id: string; is_admin: boolean; active: boolean }>(
        "SELECT id, is_admin, active FROM Users WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE",
        [ids],
    )
    const permissions = await client.query<{ user_id: string; permission_key: string }>(
        "SELECT user_id, permission_key FROM UserPermissions WHERE user_id = ANY($1::bigint[])",
        [ids],
    )
    return users.rows.map((row) => {
        const keys = permissions.rows
            .filter((permission) => permission.user_id === row.id)
            .map((permission) => permission.permission_key)
        return {
            id: Number(row.id),
            isAdmin: row.is_admin,
            active: row.active,
            permissions: orderedPermissions(row.is_admin, keys),
        }
    })
}

export async function readSlotMinutes(client: PoolClient): Promise<number | null> {
    const result = await client.query<{ slot_minutes: number }>("SELECT slot_minutes FROM ScheduleSettings WHERE id = 1")
    return result.rows[0]?.slot_minutes ?? null
}

export async function readConfirmedBetween(
    client: PoolClient,
    userIds: number[],
    from: Date,
    to: Date,
): Promise<BusyAppointment[]> {
    if (userIds.length === 0) {
        return []
    }
    const result = await client.query<{ id: string; protocol: string; assigned_user_id: string; appointment_datetime: Date }>(
        `SELECT a.id, ${PROTOCOL_SQL} AS protocol, a.assigned_user_id, a.appointment_datetime
         FROM Appointments a
         WHERE a.status = 'CONFIRMED'
           AND a.assigned_user_id = ANY($1::bigint[])
           AND a.appointment_datetime BETWEEN $2 AND $3`,
        [userIds, from, to],
    )
    return result.rows.map((row) => ({
        appointmentId: String(row.id),
        protocol: row.protocol,
        assignedUserId: Number(row.assigned_user_id),
        appointmentDatetime: new Date(row.appointment_datetime),
    }))
}

export function readConfirmedAround(
    client: PoolClient,
    userIds: number[],
    appointmentDatetime: Date,
    slotMinutes: number | null,
): Promise<BusyAppointment[]> {
    const margin = (slotMinutes ?? 0) * 60_000
    return readConfirmedBetween(
        client,
        userIds,
        new Date(appointmentDatetime.getTime() - margin),
        new Date(appointmentDatetime.getTime() + margin),
    )
}
