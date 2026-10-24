import { DatabaseError, Pool, PoolClient } from "pg"
import getPool from "../db/connection"
import ConflictError from "../errors/ConflictError"
import type {
    AccountBatchResult,
    AccountChange,
    AccountPlan,
    BusyAppointment,
    FutureAppointment,
    LockedAccount,
    ReassignableAppointment,
    UserAccount,
    UserAccountList,
} from "../types/userAccount.types"
import type { AppointmentStatus } from "../types/appointment.types"
import { assignAppointment, returnAppointmentToPending } from "./appointmentReassignment"
import {
    inTransaction,
    lockAccounts,
    orderedPermissions,
    PROTOCOL_SQL,
    readConfirmedBetween,
    readSlotMinutes,
} from "./responsibleQueries"
import { UserAccountRepository } from "./userAccount.repository.interface"

type Queryable = Pool | PoolClient

interface AccountRow {
    id: string
    name: string
    email: string
    is_admin: boolean
    active: boolean
    last_login_at: Date | null
    permissions_updated_at: Date | null
    permissions_updated_by: string | null
    permissions_updated_by_name: string | null
    permissions: string[]
}

interface AppointmentRow {
    id: string
    protocol: string
    assigned_user_id: string
    appointment_datetime: Date
}

const EMAIL_UNIQUE_CONSTRAINTS = new Set(["users_email_key", "uniq_users_email_lower"])

const ACCOUNT_SELECT = `
    SELECT u.id, u.name, u.email, u.is_admin, u.active, u.last_login_at,
           u.permissions_updated_at, u.permissions_updated_by, ub.name AS permissions_updated_by_name,
           COALESCE(
               (SELECT array_agg(up.permission_key::text) FROM UserPermissions up WHERE up.user_id = u.id),
               '{}'
           ) AS permissions
    FROM Users u
    LEFT JOIN Users ub ON ub.id = u.permissions_updated_by`

function toUserAccount(row: AccountRow): UserAccount {
    return {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        isAdmin: row.is_admin,
        active: row.active,
        permissions: orderedPermissions(row.is_admin, row.permissions),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
        permissionsUpdatedAt: row.permissions_updated_at ? new Date(row.permissions_updated_at).toISOString() : null,
        permissionsUpdatedBy:
            row.permissions_updated_by !== null && row.permissions_updated_by_name !== null
                ? { id: Number(row.permissions_updated_by), name: row.permissions_updated_by_name }
                : null,
    }
}

async function selectAccountList(db: Queryable): Promise<UserAccountList> {
    const result = await db.query<AccountRow>(
        `${ACCOUNT_SELECT}
         ORDER BY u.is_admin DESC, u.active DESC, u.name ASC, u.id ASC`,
    )
    const items = result.rows.map(toUserAccount)
    const latest = await db.query<{ name: string; at: Date }>(
        `SELECT ub.name, u.permissions_updated_at AS at
         FROM Users u
         JOIN Users ub ON ub.id = u.permissions_updated_by
         ORDER BY u.permissions_updated_at DESC, u.id DESC
         LIMIT 1`,
    )
    const last = latest.rows[0]
    return { items, lastChange: last ? { name: last.name, at: new Date(last.at).toISOString() } : null }
}

function isEmailConflict(error: unknown): boolean {
    return (
        error instanceof DatabaseError &&
        error.code === "23505" &&
        error.constraint !== undefined &&
        EMAIL_UNIQUE_CONSTRAINTS.has(error.constraint)
    )
}

async function lockFutureAppointments(
    client: PoolClient,
    userIds: number[],
    now: Date,
): Promise<Map<number, ReassignableAppointment[]>> {
    const result = await client.query<AppointmentRow>(
        `SELECT a.id, ${PROTOCOL_SQL} AS protocol, a.assigned_user_id, a.appointment_datetime
         FROM Appointments a
         WHERE a.status = 'CONFIRMED' AND a.assigned_user_id = ANY($1::bigint[]) AND a.appointment_datetime > $2
         ORDER BY a.id
         FOR UPDATE`,
        [userIds, now],
    )
    const byUser = new Map<number, ReassignableAppointment[]>()
    const sorted = [...result.rows].sort(
        (a, b) =>
            new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime() ||
            Number(a.id) - Number(b.id),
    )
    for (const row of sorted) {
        const owner = Number(row.assigned_user_id)
        const list = byUser.get(owner) ?? []
        list.push({ appointmentId: row.id, protocol: row.protocol, appointmentDatetime: new Date(row.appointment_datetime) })
        byUser.set(owner, list)
    }
    return byUser
}

async function readBusy(
    client: PoolClient,
    targetIds: number[],
    moving: ReassignableAppointment[],
    slotMinutes: number | null,
): Promise<BusyAppointment[]> {
    if (targetIds.length === 0 || moving.length === 0) {
        return []
    }
    const margin = (slotMinutes ?? 0) * 60_000
    const times = moving.map((appointment) => appointment.appointmentDatetime.getTime())
    return readConfirmedBetween(
        client,
        targetIds,
        new Date(Math.min(...times) - margin),
        new Date(Math.max(...times) + margin),
    )
}

function assignTargets(changes: AccountChange[]): number[] {
    const targets = new Set<number>()
    for (const change of changes) {
        if (change.reassignment?.mode === "assign") {
            targets.add(change.reassignment.toUserId)
        }
    }
    return [...targets]
}

async function writePlan(client: PoolClient, plan: AccountPlan, actorUserId: number, now: Date): Promise<number> {
    if (plan.revoke.length > 0) {
        await client.query("DELETE FROM UserPermissions WHERE user_id = $1 AND permission_key = ANY($2::text[])", [
            plan.userId,
            plan.revoke,
        ])
    }
    if (plan.grant.length > 0) {
        await client.query(
            `INSERT INTO UserPermissions (user_id, permission_key, granted_by, granted_at)
             SELECT $1, permission_key, $3, $4 FROM unnest($2::text[]) AS permission_key`,
            [plan.userId, plan.grant, actorUserId, now],
        )
    }
    if (plan.recordUpdate) {
        await client.query(
            `UPDATE Users
             SET active = COALESCE($2, active),
                 session_version = session_version + CASE WHEN $3 THEN 1 ELSE 0 END,
                 permissions_updated_by = $4,
                 permissions_updated_at = $5
             WHERE id = $1`,
            [plan.userId, plan.active, plan.bumpSessionVersion, actorUserId, now],
        )
    }

    const reassignment = plan.reassignment
    if (!reassignment) {
        return 0
    }
    for (const appointment of reassignment.appointments) {
        if (reassignment.mode === "assign") {
            await assignAppointment(client, {
                appointmentId: appointment.appointmentId,
                assigneeUserId: reassignment.toUserId,
                actorUserId,
                data: { assignee_user_id: reassignment.toUserId, reason: reassignment.reason },
                now,
            })
        } else {
            await returnAppointmentToPending(client, {
                appointmentId: appointment.appointmentId,
                actorUserId,
                data: { reason: reassignment.reason },
                now,
            })
        }
    }
    return reassignment.appointments.length
}

export function createUserAccountRepository(pool: Pool = getPool()): UserAccountRepository {
    return {
        listAccounts: () => selectAccountList(pool),

        async createAccount({ name, email, passwordHash }) {
            try {
                const inserted = await pool.query<{ id: string }>(
                    "INSERT INTO Users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
                    [name, email, passwordHash],
                )
                const result = await pool.query<AccountRow>(`${ACCOUNT_SELECT} WHERE u.id = $1`, [inserted.rows[0]?.id])
                const row = result.rows[0]
                if (!row) {
                    throw new Error("Conta criada não encontrada")
                }
                return toUserAccount(row)
            } catch (error) {
                if (isEmailConflict(error)) {
                    throw new ConflictError("Este e-mail já está em uso", "EMAIL_ALREADY_IN_USE")
                }
                throw error
            }
        },

        async findFutureAppointments(userId, now) {
            const exists = await pool.query("SELECT 1 FROM Users WHERE id = $1", [userId])
            if (exists.rowCount === 0) {
                return null
            }
            const result = await pool.query<{
                id: string
                protocol: string
                name: string
                appointment_datetime: Date
                status: AppointmentStatus
            }>(
                `SELECT a.id, ${PROTOCOL_SQL} AS protocol, a.name, a.appointment_datetime, a.status
                 FROM Appointments a
                 WHERE a.status = 'CONFIRMED' AND a.assigned_user_id = $1 AND a.appointment_datetime > $2
                 ORDER BY a.appointment_datetime ASC, a.id ASC`,
                [userId, now],
            )
            return result.rows.map(
                (row): FutureAppointment => ({
                    id: row.id,
                    protocol: row.protocol,
                    name: row.name,
                    appointmentDatetime: new Date(row.appointment_datetime).toISOString(),
                    status: row.status,
                }),
            )
        },

        applyAccountBatch({ requester, changes, now }, decide): Promise<AccountBatchResult> {
            return inTransaction(pool, async (client) => {
                const batchIds = [...new Set(changes.map((change) => change.userId))]
                const targetIds = assignTargets(changes).filter((id) => !batchIds.includes(id))
                const locked = await lockAccounts(client, [...batchIds, ...targetIds])
                const existingBatchIds = locked.filter((account) => batchIds.includes(account.id)).map((account) => account.id)
                const future =
                    existingBatchIds.length > 0 ? await lockFutureAppointments(client, existingBatchIds, now) : new Map()
                const accounts: LockedAccount[] = locked
                    .filter((account) => batchIds.includes(account.id))
                    .map((account) => ({ ...account, futureAppointments: future.get(account.id) ?? [] }))
                const targets = locked.filter((account) => targetIds.includes(account.id))
                const slotMinutes = await readSlotMinutes(client)
                const assigning = new Set(
                    changes.filter((change) => change.reassignment?.mode === "assign").map((change) => change.userId),
                )
                const moving = accounts
                    .filter((account) => assigning.has(account.id))
                    .flatMap((account) => account.futureAppointments)
                const lockedIds = new Set(locked.map((account) => account.id))
                const existingTargets = assignTargets(changes).filter((id) => lockedIds.has(id))
                const busy = await readBusy(client, existingTargets, moving, slotMinutes)

                const decision = decide({ requester, changes, accounts, targets, slotMinutes, busy })
                if (!decision.allowed) {
                    throw decision.error
                }

                let redistributed = 0
                for (const plan of decision.plans) {
                    redistributed += await writePlan(client, plan, requester.id, now)
                }
                const list = await selectAccountList(client)
                return { ...list, redistributed }
            })
        },

        resetPassword({ requester, userId, passwordHash }, decide): Promise<void> {
            return inTransaction(pool, async (client) => {
                const [account] = await lockAccounts(client, [userId])
                const decision = decide({ requester, userId, account: account ?? null })
                if (!decision.allowed) {
                    throw decision.error
                }
                await client.query(
                    "UPDATE Users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1",
                    [userId, passwordHash],
                )
            })
        },
    }
}

export const userAccountRepository = createUserAccountRepository()
export default userAccountRepository
