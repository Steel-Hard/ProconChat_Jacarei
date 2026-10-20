import { randomBytes } from "node:crypto"
import type { Pool, PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { createUserAccountRepository } from "../../repositories/userAccount.repository"
import { decideAccountBatch } from "../../services/userAccountRules"
import type { Permission } from "../../types/auth.types"
import type { AccountChange, AccountRequester } from "../../types/userAccount.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { restoreScheduleConfig, ScheduleConfigSnapshot, snapshotScheduleConfig, useScheduleConfig } from "./helpers/scheduleDb"
import { accountRows, appointmentState, createTestUser, deleteTestUsers, eventsOf, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createUserAccountRepository()

describe("Lote de contas do repositório com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let manager: TestUser
    let requester: AccountRequester
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    let day = 0

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    function nextDayAt(hour: number, minute = 0): Date {
        day += 1
        return new Date(Date.UTC(2031, 5, day, hour, minute))
    }

    async function confirmed(owner: TestUser, at: Date = nextDayAt(16)): Promise<number> {
        return createTestAppointment(scope, {
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: at,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    function batch(changes: AccountChange[]) {
        return repository.applyAccountBatch({ requester, changes, now: NOW }, decideAccountBatch)
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        manager = await user({ permissions: [...MANAGE, "users.manage"] })
        requester = { id: manager.id, isAdmin: false, permissions: [...MANAGE, "users.manage"] }
        scope = await createAppointmentScope(admin.id, "accounts_batch")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua Teste, 1",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [],
        })
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("volta para pendente os agendamentos futuros de quem perde appointments.manage, com um evento cada", async () => {
        const staff = await user({ permissions: MANAGE })
        const first = await confirmed(staff)
        const second = await confirmed(staff)

        const result = await batch([{ userId: staff.id, permissions: ["appointments.view"], reassignment: { mode: "pending" } }])

        expect(result.redistributed).toBe(2)
        expect([await appointmentState(first), await appointmentState(second)]).toEqual([
            { status: "PENDING", assignedUserId: null },
            { status: "PENDING", assignedUserId: null },
        ])
        expect(await eventsOf([first, second])).toEqual(
            [first, second].map((appointmentId) => ({
                appointmentId,
                type: "BACK_TO_PENDING",
                actorUserId: manager.id,
                data: { reason: "MANAGE_PERMISSION_REMOVED" },
                createdAt: NOW.toISOString(),
            })),
        )
    })

    it("atribui ao destino os agendamentos futuros de quem e desativado, com o evento ASSIGNED", async () => {
        const staff = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const appointment = await confirmed(staff)

        const result = await batch([
            { userId: staff.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
        ])

        expect(result.redistributed).toBe(1)
        expect(await appointmentState(appointment)).toEqual({ status: "CONFIRMED", assignedUserId: destination.id })
        expect(await eventsOf([appointment])).toEqual([
            {
                appointmentId: appointment,
                type: "ASSIGNED",
                actorUserId: manager.id,
                data: { assignee_user_id: destination.id, reason: "USER_DEACTIVATED" },
                createdAt: NOW.toISOString(),
            },
        ])
    })

    it("entrega os agendamentos ao destino que ganha appointments.manage no mesmo lote", async () => {
        const staff = await user({ permissions: MANAGE })
        const destination = await user({})
        const appointment = await confirmed(staff)

        await batch([
            { userId: staff.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
            { userId: destination.id, permissions: ["appointments.manage"] },
        ])

        expect(await appointmentState(appointment)).toEqual({ status: "CONFIRMED", assignedUserId: destination.id })
    })

    it("nao grava nada do lote quando a terceira conta falha", async () => {
        const first = await user({})
        const second = await user({ permissions: MANAGE })
        const third = await user({ permissions: ["reports.view"] })
        const appointment = await confirmed(second)
        const ids = [first.id, second.id, third.id]
        const accountsBefore = await accountRows(ids)
        const appointmentBefore = await appointmentState(appointment)

        const attempt = batch([
            { userId: first.id, permissions: ["appointments.view"] },
            { userId: second.id, active: false, reassignment: { mode: "pending" } },
            { userId: third.id, active: false },
        ])

        await expect(attempt).rejects.toMatchObject({ code: "TARGET_HAS_MORE_PERMISSIONS", details: { userId: third.id } })
        expect(await accountRows(ids)).toEqual(accountsBefore)
        expect(await appointmentState(appointment)).toEqual(appointmentBefore)
        expect(await eventsOf([appointment])).toEqual([])
    })

    it("desfaz todo o lote quando a gravacao de um evento falha", async () => {
        const first = await user({})
        const second = await user({ permissions: MANAGE })
        const appointment = await confirmed(second)
        const ids = [first.id, second.id]
        const accountsBefore = await accountRows(ids)
        const failingPool = {
            connect: async (): Promise<PoolClient> => {
                const client = await getPool().connect()
                const query = client.query.bind(client) as (text: string, params?: unknown[]) => Promise<unknown>
                return new Proxy(client, {
                    get(target, property, receiver) {
                        if (property === "query") {
                            return (text: string, params?: unknown[]) =>
                                text.includes("INSERT INTO AppointmentEvents")
                                    ? Promise.reject(new Error("falha simulada ao gravar o evento"))
                                    : query(text, params)
                        }
                        return Reflect.get(target, property, receiver)
                    },
                })
            },
        } as unknown as Pool

        const attempt = createUserAccountRepository(failingPool).applyAccountBatch(
            {
                requester,
                changes: [
                    { userId: first.id, permissions: ["appointments.view"] },
                    { userId: second.id, active: false, reassignment: { mode: "pending" } },
                ],
                now: NOW,
            },
            decideAccountBatch,
        )

        await expect(attempt).rejects.toThrow("falha simulada ao gravar o evento")
        expect(await accountRows(ids)).toEqual(accountsBefore)
        expect(await appointmentState(appointment)).toEqual({ status: "CONFIRMED", assignedUserId: second.id })
        expect(await eventsOf([appointment])).toEqual([])
    })

    it("recusa o destino com CONFIRMED sobreposto e nao grava nada", async () => {
        const staff = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const at = nextDayAt(16)
        const moving = await confirmed(staff, at)
        const clash = await confirmed(destination, new Date(at.getTime() + 20 * 60_000))
        const before = await accountRows([staff.id])

        const attempt = batch([
            { userId: staff.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } },
        ])

        await expect(attempt).rejects.toMatchObject({
            code: "REASSIGNMENT_TARGET_BUSY",
            details: { userId: staff.id, toUserId: destination.id, protocol: expect.any(String), conflictingProtocol: expect.any(String) },
        })
        expect(await accountRows([staff.id])).toEqual(before)
        expect(await appointmentState(moving)).toEqual({ status: "CONFIRMED", assignedUserId: staff.id })
        expect(await eventsOf([moving, clash])).toEqual([])
    })

    it("aceita o destino com CONFIRMED adjacente", async () => {
        const staff = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const at = nextDayAt(16)
        const moving = await confirmed(staff, at)
        await confirmed(destination, new Date(at.getTime() + 30 * 60_000))

        await batch([{ userId: staff.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } }])

        expect(await appointmentState(moving)).toEqual({ status: "CONFIRMED", assignedUserId: destination.id })
    })

    it("termina sem deadlock e sem evento duplicado com dois lotes cruzados rodados varias vezes", async () => {
        const a = await user({ permissions: MANAGE })
        const b = await user({ permissions: MANAGE })
        const appointment = await confirmed(a)

        for (let round = 0; round < 5; round += 1) {
            await getPool().query("UPDATE Users SET active = true WHERE id = ANY($1::bigint[])", [[a.id, b.id]])
            await getPool().query("UPDATE Appointments SET status = 'CONFIRMED', assigned_user_id = $1 WHERE id = $2", [
                a.id,
                appointment,
            ])
            const eventsBefore = (await eventsOf([appointment])).length

            const results = await Promise.allSettled([
                batch([
                    { userId: a.id, active: false, reassignment: { mode: "pending" } },
                    { userId: b.id, permissions: [...MANAGE, "users.manage"] },
                ]),
                batch([
                    { userId: b.id, permissions: MANAGE },
                    { userId: a.id, active: false, reassignment: { mode: "pending" } },
                ]),
            ])

            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(appointment)).toEqual({ status: "PENDING", assignedUserId: null })
            expect((await eventsOf([appointment])).length).toBe(eventsBefore + 1)
        }
    })

    it("sempre grava um e recusa o outro de dois lotes que levam agendamentos sobrepostos ao mesmo destino", async () => {
        const a = await user({ permissions: MANAGE })
        const b = await user({ permissions: MANAGE })
        const destination = await user({ permissions: MANAGE })
        const at = nextDayAt(16)
        const fromA = await confirmed(a, at)
        const fromB = await confirmed(b, new Date(at.getTime() + 10 * 60_000))

        for (let round = 0; round < 5; round += 1) {
            await getPool().query("UPDATE Users SET active = true WHERE id = ANY($1::bigint[])", [[a.id, b.id]])
            await getPool().query("UPDATE Appointments SET assigned_user_id = $1 WHERE id = $2", [a.id, fromA])
            await getPool().query("UPDATE Appointments SET assigned_user_id = $1 WHERE id = $2", [b.id, fromB])

            const results = await Promise.allSettled([
                batch([{ userId: a.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } }]),
                batch([{ userId: b.id, active: false, reassignment: { mode: "assign", toUserId: destination.id } }]),
            ])

            const rejected = results.filter((result) => result.status === "rejected")
            expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
            expect(rejected).toHaveLength(1)
            expect(rejected[0]?.status === "rejected" && rejected[0].reason).toMatchObject({ code: "REASSIGNMENT_TARGET_BUSY" })
        }
    })
})
