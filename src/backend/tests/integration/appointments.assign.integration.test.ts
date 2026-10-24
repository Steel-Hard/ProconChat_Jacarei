import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
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

const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
const NOW = new Date("2031-01-10T12:00:00.000Z")
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createAppointmentRepository()
const accounts = createUserAccountRepository()

describe("Atribuir a outro funcionário com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let actor: TestUser
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
        return new Date(Date.UTC(2031, 4, day, hour, minute))
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
        actor = await user({ permissions: MANAGE })
        scope = await createAppointmentScope(admin.id, "assign")
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

    describe("regras", () => {
        it("atribui um pendente a uma conta ativa com Gerenciar agendamentos e grava ASSIGNED com quem atribuiu", async () => {
            const target = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", nextDayAt(16))

            await repository.assign(String(id), target.id, actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: target.id })
            expect(await eventsOf([id])).toEqual([
                {
                    appointmentId: id,
                    type: "ASSIGNED",
                    actorUserId: actor.id,
                    data: { assignee_user_id: target.id },
                    createdAt: NOW.toISOString(),
                },
            ])
        })

        it("troca o responsável de um confirmado, inclusive um que já passou, e mantém CONFIRMED", async () => {
            const from = await user({ permissions: MANAGE })
            const target = await user({ permissions: MANAGE })
            const id = await appointment("CONFIRMED", new Date("2030-12-01T16:00:00.000Z"), from)

            await repository.assign(String(id), target.id, actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: target.id })
        })

        it("permite atribuir ao Admin e a si mesmo", async () => {
            const toAdmin = await appointment("PENDING", nextDayAt(16))
            const toSelf = await appointment("PENDING", nextDayAt(16))

            await repository.assign(String(toAdmin), admin.id, actor.id, NOW)
            await repository.assign(String(toSelf), actor.id, actor.id, NOW)

            expect(await appointmentState(toAdmin)).toEqual({ status: "CONFIRMED", assignedUserId: admin.id })
            expect(await appointmentState(toSelf)).toEqual({ status: "CONFIRMED", assignedUserId: actor.id })
        })

        it("recusa com INVALID_ASSIGNEE um destino inativo, inexistente, só com Ver agendamentos ou sem permissões, sem gravar nada", async () => {
            const inactive = await user({ permissions: MANAGE, active: false })
            const viewer = await user({ permissions: ["appointments.view"] })
            const nobody = await user({})
            const id = await appointment("PENDING", nextDayAt(16))

            for (const targetId of [inactive.id, viewer.id, nobody.id, 999_999_999]) {
                await expect(repository.assign(String(id), targetId, actor.id, NOW)).rejects.toMatchObject({
                    statusCode: 409,
                    code: "INVALID_ASSIGNEE",
                })
            }

            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            expect(await eventsOf([id])).toEqual([])
        })

        it("recusa com ALREADY_ASSIGNED_TO_USER quando o destino já é o responsável", async () => {
            const owner = await user({ permissions: MANAGE })
            const id = await appointment("CONFIRMED", nextDayAt(16), owner)

            await expect(repository.assign(String(id), owner.id, actor.id, NOW)).rejects.toMatchObject({
                statusCode: 409,
                code: "ALREADY_ASSIGNED_TO_USER",
            })
            expect(await eventsOf([id])).toEqual([])
        })

        it.each([
            { status: "CANCELED" as const, code: "APPOINTMENT_CANCELED" },
            { status: "ATTENDED" as const, code: "ALREADY_ATTENDED" },
            { status: "NO_SHOW" as const, code: "ALREADY_NO_SHOW" },
        ])("recusa atribuir um $status com $code", async ({ status, code }) => {
            const owner = await user({ permissions: MANAGE })
            const target = await user({ permissions: MANAGE })
            const id = await appointment(status, nextDayAt(16), status === "CANCELED" ? null : owner)

            await expect(repository.assign(String(id), target.id, actor.id, NOW)).rejects.toMatchObject({
                statusCode: 409,
                code,
            })
            expect(await eventsOf([id])).toEqual([])
        })

        it("devolve 404 para um agendamento que não existe", async () => {
            const target = await user({ permissions: MANAGE })

            await expect(repository.assign("999999999", target.id, actor.id, NOW)).rejects.toMatchObject({
                statusCode: 404,
            })
        })
    })

    describe("horário do destino", () => {
        it.each([
            { label: "no mesmo horário (13:00 contra 13:00)", offset: 0 },
            { label: "com intervalo sobreposto (13:20 contra 13:00)", offset: 20 },
            { label: "com intervalo sobreposto antes (12:40 contra 13:00)", offset: -20 },
        ])("recusa com ASSIGNEE_BUSY o destino que já tem um confirmado $label", async ({ offset }) => {
            const target = await user({ permissions: MANAGE })
            const at = nextDayAt(16)
            const busy = await appointment("CONFIRMED", at, target)
            const id = await appointment("PENDING", plusMinutes(at, offset))
            const conflictingProtocol = await protocolOf(busy)

            const attempt = repository.assign(String(id), target.id, actor.id, NOW)

            await expect(attempt).rejects.toMatchObject({
                statusCode: 409,
                code: "ASSIGNEE_BUSY",
                details: {
                    assigneeUserId: String(target.id),
                    conflictingAppointmentId: String(busy),
                    conflictingProtocol,
                },
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            expect(await eventsOf([id])).toEqual([])
        })

        it("aceita o destino com um confirmado adjacente (13:30 contra 13:00)", async () => {
            const target = await user({ permissions: MANAGE })
            const at = nextDayAt(16)
            await appointment("CONFIRMED", at, target)
            const id = await appointment("PENDING", plusMinutes(at, 30))

            await repository.assign(String(id), target.id, actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: target.id })
        })

        it("aceita o destino com um cancelado, atendido ou não compareceu no mesmo horário", async () => {
            const target = await user({ permissions: MANAGE })
            const at = nextDayAt(16)
            await appointment("CANCELED", at)
            await appointment("ATTENDED", at, target)
            await appointment("NO_SHOW", at, target)
            const id = await appointment("PENDING", at)

            await repository.assign(String(id), target.id, actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: target.id })
        })
    })

    describe("pela rota", () => {
        it("atribui pelo PATCH com a conta logada como autora do evento", async () => {
            const target = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", nextDayAt(16))

            const res = await request(app)
                .patch(`/api/v1/appointments/${id}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", actor.cookie)
                .send({ action: "assign", assigneeUserId: target.id })

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.assigned_user_id).toBe(String(target.id))
            expect(res.body.data.events[0]).toMatchObject({
                type: "ASSIGNED",
                actor_user_id: String(actor.id),
                data: { assignee_user_id: target.id },
            })
        })
    })

    describe("concorrência", () => {
        it("sempre grava uma e recusa a outra de duas atribuições sobrepostas para a mesma pessoa", async () => {
            const target = await user({ permissions: MANAGE })
            const at = nextDayAt(16)
            const first = await appointment("PENDING", at)
            const second = await appointment("PENDING", plusMinutes(at, 20))

            for (let round = 0; round < 5; round += 1) {
                await getPool().query(
                    "UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = ANY($1::bigint[])",
                    [[first, second]],
                )

                const results = await Promise.allSettled([
                    repository.assign(String(first), target.id, actor.id, NOW),
                    repository.assign(String(second), target.id, actor.id, NOW),
                ])

                const rejected = results.filter((result) => result.status === "rejected")
                expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
                expect(rejected).toHaveLength(1)
                expect(rejected[0]?.status === "rejected" && rejected[0].reason).toMatchObject({ code: "ASSIGNEE_BUSY" })
            }
        })

        it("termina sem deadlock e nunca deixa um responsável inativo quando o lote desativa o destino ao mesmo tempo", async () => {
            const manager = await user({ permissions: [...MANAGE, "users.manage"] })
            const requester = { id: manager.id, isAdmin: false, permissions: [...MANAGE, "users.manage"] as Permission[] }
            const target = await user({ permissions: MANAGE })
            const id = await appointment("PENDING", nextDayAt(16))

            for (let round = 0; round < 5; round += 1) {
                await getPool().query("UPDATE Users SET active = true WHERE id = $1", [target.id])
                await getPool().query("UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = $1", [id])

                const results = await Promise.allSettled([
                    repository.assign(String(id), target.id, actor.id, NOW),
                    accounts.applyAccountBatch(
                        { requester, changes: [{ userId: target.id, active: false, reassignment: { mode: "pending" } }], now: NOW },
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
