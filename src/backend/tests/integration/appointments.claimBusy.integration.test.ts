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
    firstRow,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { restoreScheduleConfig, ScheduleConfigSnapshot, snapshotScheduleConfig, useScheduleConfig } from "./helpers/scheduleDb"
import { appointmentState, createTestUser, deleteTestUsers, eventsOf, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createAppointmentRepository()
const accounts = createUserAccountRepository()

describe("Assumir e auto-claim respeitam o horário da pessoa com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    let futureDay = 0
    let pastDay = 0

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    function futureAt(hour: number, minute = 0): Date {
        futureDay += 1
        return new Date(Date.UTC(2031, 7, futureDay, hour, minute))
    }

    function pastAt(hour: number, minute = 0): Date {
        pastDay += 1
        return new Date(Date.UTC(2025, 3, pastDay, hour, minute))
    }

    function plusMinutes(at: Date, minutes: number): Date {
        return new Date(at.getTime() + minutes * 60_000)
    }

    async function appointment(status: AppointmentStatus, at: Date, owner: TestUser | null = null): Promise<number> {
        return createTestAppointment(scope, {
            status,
            assignedUserId: owner?.id ?? null,
            appointmentDatetime: at,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    async function protocolOf(id: number): Promise<string> {
        const result = await getPool().query<{ protocol: string }>(
            "SELECT UPPER(SUBSTRING(appointment_code::text, 1, 8)) AS protocol FROM Appointments WHERE id = $1",
            [id],
        )
        return firstRow(result.rows).protocol
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        scope = await createAppointmentScope(admin.id, "claim_busy")
        scheduleSnapshot = await snapshotScheduleConfig()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 5,
                window_days: 30,
                min_notice_days: 0,
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

    describe("Assumir para mim", () => {
        it("recusa com ASSIGNEE_BUSY quem já tem um confirmado sobreposto e mantém o agendamento pendente", async () => {
            const actor = await user({ permissions: MANAGE })
            const at = futureAt(16)
            const busy = await appointment("CONFIRMED", at, actor)
            const id = await appointment("PENDING", plusMinutes(at, 20))
            const conflictingProtocol = await protocolOf(busy)

            const attempt = repository.claim(String(id), actor.id, NOW)

            await expect(attempt).rejects.toMatchObject({
                statusCode: 409,
                code: "ASSIGNEE_BUSY",
                details: {
                    assigneeUserId: String(actor.id),
                    conflictingAppointmentId: String(busy),
                    conflictingProtocol,
                },
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            expect(await eventsOf([id])).toEqual([])
        })

        it("também checa o horário num pendente que já passou", async () => {
            const actor = await user({ permissions: MANAGE })
            const at = pastAt(16)
            await appointment("CONFIRMED", at, actor)
            const id = await appointment("PENDING", at)

            await expect(repository.claim(String(id), actor.id, NOW)).rejects.toMatchObject({ code: "ASSIGNEE_BUSY" })
        })

        it.each([
            { label: "adjacente", offset: 30 },
            { label: "em outro dia", offset: 24 * 60 },
        ])("assume normalmente quando o confirmado de quem clica é $label", async ({ offset }) => {
            const actor = await user({ permissions: MANAGE })
            const at = futureAt(16)
            await appointment("CONFIRMED", at, actor)
            const id = await appointment("PENDING", plusMinutes(at, offset))

            await repository.claim(String(id), actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: actor.id })
        })

        it("recusa com 409 INVALID_ASSIGNEE quem perdeu a permissão antes de a conta ser travada, sem gravar nada", async () => {
            const actor = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", futureAt(16))
            await getPool().query("UPDATE Users SET active = false WHERE id = $1", [actor.id])

            await expect(repository.claim(String(id), actor.id, NOW)).rejects.toMatchObject({
                statusCode: 409,
                code: "INVALID_ASSIGNEE",
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            expect(await eventsOf([id])).toEqual([])
        })
    })

    describe("auto-claim de Marcar como atendido e não compareceu", () => {
        it("recusa com ASSIGNEE_BUSY o atendido num pendente futuro quando quem clica tem um confirmado sobreposto", async () => {
            const actor = await user({ permissions: MANAGE })
            const at = futureAt(16)
            await appointment("CONFIRMED", at, actor)
            const id = await appointment("PENDING", plusMinutes(at, 20))

            await expect(repository.markAttended(String(id), actor.id, plusMinutes(at, -60))).rejects.toMatchObject({
                statusCode: 409,
                code: "ASSIGNEE_BUSY",
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            expect(await eventsOf([id])).toEqual([])
        })

        it.each([
            { action: "markAttended" as const, status: "ATTENDED" },
            { action: "markNoShow" as const, status: "NO_SHOW" },
        ])("grava $status num pendente que já passou sem checar o horário de quem clica", async ({ action, status }) => {
            const actor = await user({ permissions: MANAGE })
            const at = pastAt(16)
            await appointment("CONFIRMED", at, actor)
            const id = await appointment("PENDING", at)

            await repository[action](String(id), actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status, assignedUserId: actor.id })
            expect((await eventsOf([id])).map((event) => event.type)).toEqual(["CLAIMED", status])
        })

        it("recusa com 409 INVALID_ASSIGNEE o auto-claim de quem perdeu a permissão, mesmo num pendente que já passou", async () => {
            const actor = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", pastAt(16))
            await getPool().query("DELETE FROM UserPermissions WHERE user_id = $1", [actor.id])

            await expect(repository.markNoShow(String(id), actor.id, NOW)).rejects.toMatchObject({
                statusCode: 409,
                code: "INVALID_ASSIGNEE",
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
        })

        it("marca um confirmado sem checar quem clica, como hoje", async () => {
            const owner = await user({ permissions: MANAGE })
            const actor = await user({ permissions: MANAGE })
            const at = pastAt(16)
            await appointment("CONFIRMED", at, actor)
            const id = await appointment("CONFIRMED", at, owner)

            await repository.markAttended(String(id), actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "ATTENDED", assignedUserId: owner.id })
        })
    })

    describe("concorrência", () => {
        it("duas pessoas diferentes assumem agendamentos sobrepostos ao mesmo tempo", async () => {
            const first = await user({ permissions: MANAGE })
            const second = await user({ permissions: MANAGE })
            const at = futureAt(16)
            const a = await appointment("PENDING", at)
            const b = await appointment("PENDING", plusMinutes(at, 20))

            const results = await Promise.allSettled([
                repository.claim(String(a), first.id, NOW),
                repository.claim(String(b), second.id, NOW),
            ])

            expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"])
            expect(await appointmentState(a)).toEqual({ status: "CONFIRMED", assignedUserId: first.id })
            expect(await appointmentState(b)).toEqual({ status: "CONFIRMED", assignedUserId: second.id })
        })

        it("a mesma pessoa assumindo dois agendamentos sobrepostos ao mesmo tempo grava só um", async () => {
            const actor = await user({ permissions: MANAGE })
            const at = futureAt(16)
            const a = await appointment("PENDING", at)
            const b = await appointment("PENDING", plusMinutes(at, 20))

            for (let round = 0; round < 5; round += 1) {
                await getPool().query(
                    "UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = ANY($1::bigint[])",
                    [[a, b]],
                )

                const results = await Promise.allSettled([
                    repository.claim(String(a), actor.id, NOW),
                    repository.claim(String(b), actor.id, NOW),
                ])

                const rejected = results.filter((result) => result.status === "rejected")
                expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
                expect(rejected).toHaveLength(1)
                expect(rejected[0]?.status === "rejected" && rejected[0].reason).toMatchObject({ code: "ASSIGNEE_BUSY" })
            }
        })

        it("termina sem deadlock e nunca deixa um responsável inativo quando o lote desativa quem assume", async () => {
            const manager = await user({ permissions: [...MANAGE, "users.manage"] })
            const requester = { id: manager.id, isAdmin: false, permissions: [...MANAGE, "users.manage"] as Permission[] }
            const actor = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", futureAt(16))

            for (let round = 0; round < 5; round += 1) {
                await getPool().query("UPDATE Users SET active = true WHERE id = $1", [actor.id])
                await getPool().query("UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = $1", [id])

                const results = await Promise.allSettled([
                    repository.claim(String(id), actor.id, NOW),
                    accounts.applyAccountBatch(
                        { requester, changes: [{ userId: actor.id, active: false, reassignment: { mode: "pending" } }], now: NOW },
                        decideAccountBatch,
                    ),
                ])

                expect(results[1]?.status).toBe("fulfilled")
                if (results[0]?.status === "rejected") {
                    expect(results[0].reason).toMatchObject({ code: "INVALID_ASSIGNEE" })
                }
                expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            }
        })
    })
})
