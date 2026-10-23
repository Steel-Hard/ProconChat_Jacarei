import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
import { createUserAccountRepository } from "../../repositories/userAccount.repository"
import { decideAccountBatch } from "../../services/userAccountRules"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { appointmentState, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const ROUNDS = 5
const repository = createAppointmentRepository()
const accounts = createUserAccountRepository()

async function lockWaiters(): Promise<number> {
    const result = await getPool().query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    )
    return result.rows[0]?.count ?? 0
}

async function waitForLockWaiters(count: number): Promise<void> {
    const deadline = Date.now() + 5_000
    while ((await lockWaiters()) < count) {
        if (Date.now() > deadline) {
            throw new Error(`Esperava ${count} transações aguardando trava`)
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
}

async function raceOnBlockedAppointment<A, B>(
    appointmentId: number,
    first: () => Promise<A>,
    second: () => Promise<B>,
): Promise<[PromiseSettledResult<A>, PromiseSettledResult<B>]> {
    const blocker = await getPool().connect()
    try {
        await blocker.query("BEGIN")
        await blocker.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [appointmentId])
        const firstResult = first().then(
            (value): PromiseSettledResult<A> => ({ status: "fulfilled", value }),
            (reason: unknown): PromiseSettledResult<A> => ({ status: "rejected", reason }),
        )
        await waitForLockWaiters(1)
        const secondResult = second().then(
            (value): PromiseSettledResult<B> => ({ status: "fulfilled", value }),
            (reason: unknown): PromiseSettledResult<B> => ({ status: "rejected", reason }),
        )
        await waitForLockWaiters(2)
        await blocker.query("COMMIT")
        return [await firstResult, await secondResult]
    } finally {
        blocker.release()
    }
}

function withoutDeadlock(results: PromiseSettledResult<unknown>[]): void {
    for (const result of results) {
        if (result.status === "rejected") {
            expect(result.reason).not.toMatchObject({ code: "40P01" })
        }
    }
}

describe("Ordem de travas com a conta de quem age com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let day = 0

    async function user(name: string, permissions: Permission[] = MANAGE): Promise<TestUser> {
        const created = await createTestUser({ name, permissions })
        createdUserIds.push(created.createdId)
        return created
    }

    async function appointment(status: AppointmentStatus, past: boolean, owner: TestUser | null = null): Promise<number> {
        day += 1
        return createTestAppointment(scope, {
            status,
            assignedUserId: owner?.id ?? null,
            appointmentDatetime: past ? new Date(Date.UTC(2025, 5, day, 16)) : new Date(Date.UTC(2031, 10, day, 16)),
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    async function reset(id: number, status: AppointmentStatus, owner: TestUser | null): Promise<void> {
        await getPool().query("UPDATE Appointments SET status = $2, assigned_user_id = $3 WHERE id = $1", [
            id,
            status,
            owner?.id ?? null,
        ])
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        scope = await createAppointmentScope(admin.id, "lock_order")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("Ana atribui X a Bruno enquanto Carlos atribui X a Ana, sem deadlock", async () => {
        const ana = await user("Ana Trava")
        const bruno = await user("Bruno Trava")
        const carlos = await user("Carlos Trava")
        const id = await appointment("PENDING", false)

        for (let round = 0; round < ROUNDS; round += 1) {
            await reset(id, "PENDING", null)

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.assign(String(id), bruno.id, ana.id, NOW),
                () => repository.assign(String(id), ana.id, carlos.id, NOW),
            )

            withoutDeadlock(results)
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: ana.id })
        }
    })

    it("Ana atribui X a Bruno enquanto o lote desativa Ana e redistribui para Bruno, sem deadlock", async () => {
        const manager = await user("Gestora Trava", [...MANAGE, "users.manage"])
        const requester = { id: manager.id, isAdmin: false, permissions: [...MANAGE, "users.manage"] as Permission[] }
        const ana = await user("Ana Lote")
        const bruno = await user("Bruno Lote")
        const id = await appointment("CONFIRMED", false, ana)

        for (let round = 0; round < ROUNDS; round += 1) {
            await getPool().query("UPDATE Users SET active = true WHERE id = $1", [ana.id])
            await reset(id, "CONFIRMED", ana)

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.assign(String(id), bruno.id, ana.id, NOW),
                () =>
                    accounts.applyAccountBatch(
                        {
                            requester,
                            changes: [{ userId: ana.id, active: false, reassignment: { mode: "assign", toUserId: bruno.id } }],
                            now: NOW,
                        },
                        decideAccountBatch,
                    ),
            )

            withoutDeadlock(results)
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: bruno.id })
        }
    })

    it("a mesma pessoa atribui X e marca X como atendido ao mesmo tempo, sem deadlock", async () => {
        const ana = await user("Ana Atende")
        const bruno = await user("Bruno Atende")
        const id = await appointment("PENDING", true)

        for (let round = 0; round < ROUNDS; round += 1) {
            await reset(id, "PENDING", null)

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.assign(String(id), bruno.id, ana.id, NOW),
                () => repository.markAttended(String(id), ana.id, NOW),
            )

            withoutDeadlock(results)
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(id)).toEqual({ status: "ATTENDED", assignedUserId: bruno.id })
        }
    })

    it("a mesma pessoa corrige o registro de X e assume X ao mesmo tempo, sem deadlock", async () => {
        const ana = await user("Ana Corrige")
        const bruno = await user("Bruno Corrige")
        const id = await appointment("ATTENDED", true, bruno)

        for (let round = 0; round < ROUNDS; round += 1) {
            await reset(id, "ATTENDED", bruno)

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.correctRecord(String(id), ana.id, NOW),
                () => repository.claim(String(id), ana.id, NOW),
            )

            withoutDeadlock(results)
            expect(results[0].status).toBe("fulfilled")
            expect(results[1].status === "rejected" && results[1].reason).toMatchObject({
                code: "APPOINTMENT_ALREADY_CLAIMED",
            })
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: bruno.id })
        }
    })

    it("a mesma pessoa escreve uma observação em X e assume X ao mesmo tempo, sem deadlock", async () => {
        const ana = await user("Ana Observa")
        const id = await appointment("PENDING", false)

        for (let round = 0; round < ROUNDS; round += 1) {
            await reset(id, "PENDING", null)

            const results = await raceOnBlockedAppointment(
                id,
                () => repository.addNote(String(id), ana.id, `Observação ${round}`, NOW),
                () => repository.claim(String(id), ana.id, NOW),
            )

            withoutDeadlock(results)
            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: ana.id })
        }
    })
})
