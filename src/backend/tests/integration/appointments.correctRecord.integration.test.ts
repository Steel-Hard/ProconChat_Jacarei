import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { createAppointmentRepository } from "../../repositories/appointment.repository"
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

describe("Corrigir registro com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let actor: TestUser
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
        return new Date(Date.UTC(2031, 6, futureDay, hour, minute))
    }

    function pastAt(hour: number, minute = 0): Date {
        pastDay += 1
        return new Date(Date.UTC(2025, 2, pastDay, hour, minute))
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

    async function eligibleIds(): Promise<number[]> {
        const result = await getPool().query<{ id: string }>(
            `SELECT u.id FROM Users u
             WHERE u.active AND (u.is_admin OR EXISTS (
                 SELECT 1 FROM UserPermissions up WHERE up.user_id = u.id AND up.permission_key = 'appointments.manage'
             ))`,
        )
        return result.rows.map((row) => Number(row.id))
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        actor = await user({ permissions: MANAGE })
        scope = await createAppointmentScope(admin.id, "correct_record")
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

    describe("estado anterior", () => {
        it("volta a pendente sem responsável um atendido marcado a partir de um pendente, e grava RECORD_CORRECTED", async () => {
            const at = futureAt(16)
            const id = await appointment("PENDING", at)
            await repository.markAttended(String(id), actor.id, plusMinutes(at, -60))

            const result = await repository.correctRecord(String(id), admin.id, NOW)

            expect(result).toEqual({ warning: null })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            const events = await eventsOf([id])
            expect(events[events.length - 1]).toEqual({
                appointmentId: id,
                type: "RECORD_CORRECTED",
                actorUserId: admin.id,
                data: { previous_status: "ATTENDED", previous_assigned_user_id: actor.id },
                createdAt: NOW.toISOString(),
            })
        })

        it("volta a confirmado com o mesmo responsável um não compareceu que estava confirmado", async () => {
            const owner = await user({ permissions: MANAGE })
            const at = pastAt(16)
            const id = await appointment("CONFIRMED", at, owner)
            await repository.markNoShow(String(id), owner.id, plusMinutes(at, 60))

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result).toEqual({ warning: null })
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: owner.id })
        })

        it("na segunda correção usa o terminal mais recente", async () => {
            const at = pastAt(16)
            const id = await appointment("PENDING", at)
            await repository.markAttended(String(id), actor.id, plusMinutes(at, 60))
            await repository.correctRecord(String(id), actor.id, plusMinutes(at, 120))
            await repository.claim(String(id), actor.id, plusMinutes(at, 180))
            await repository.markNoShow(String(id), actor.id, plusMinutes(at, 240))

            await repository.correctRecord(String(id), actor.id, NOW)

            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: actor.id })
        })

        it.each([
            { status: "PENDING" as const },
            { status: "CONFIRMED" as const },
            { status: "CANCELED" as const },
        ])("recusa corrigir um $status com RECORD_NOT_CORRECTABLE", async ({ status }) => {
            const id = await appointment(status, futureAt(16), status === "CONFIRMED" ? actor : null)

            await expect(repository.correctRecord(String(id), actor.id, NOW)).rejects.toMatchObject({
                statusCode: 409,
                code: "RECORD_NOT_CORRECTABLE",
            })
            expect(await eventsOf([id])).toEqual([])
        })

        it("devolve 404 para um agendamento que não existe", async () => {
            await expect(repository.correctRecord("999999999", actor.id, NOW)).rejects.toMatchObject({ statusCode: 404 })
        })
    })

    describe("responsável anterior", () => {
        it("num agendamento passado volta ao responsável anterior sem checar o horário e sem aviso", async () => {
            const owner = await user({ permissions: MANAGE })
            const at = pastAt(16)
            await appointment("CONFIRMED", at, owner)
            const id = await appointment("NO_SHOW", plusMinutes(at, 20), owner)
            await getPool().query("UPDATE Users SET active = false WHERE id = $1", [owner.id])

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result).toEqual({ warning: null })
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: owner.id })
        })

        it("num agendamento futuro volta a pendente com RESPONSIBLE_UNAVAILABLE quando o responsável foi desativado", async () => {
            const owner = await user({ name: "Rita Desativada", permissions: MANAGE })
            const id = await appointment("NO_SHOW", futureAt(16), owner)
            await getPool().query("UPDATE Users SET active = false WHERE id = $1", [owner.id])

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result.warning).toEqual({
                code: "RESPONSIBLE_UNAVAILABLE",
                message: expect.any(String),
                details: {
                    appointmentId: String(id),
                    protocol: await protocolOf(id),
                    previousAssignedUserId: String(owner.id),
                    previousAssignedUserName: "Rita Desativada",
                    freeStaffCount: expect.any(Number),
                },
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
            const events = await eventsOf([id])
            expect(events[events.length - 1]?.data).toEqual({ previous_status: "NO_SHOW", previous_assigned_user_id: owner.id })
        })

        it("num agendamento futuro volta a pendente com RESPONSIBLE_BUSY quando o responsável tem outro confirmado sobreposto", async () => {
            const owner = await user({ name: "Ricardo Ocupado", permissions: MANAGE })
            const at = futureAt(16)
            const busy = await appointment("CONFIRMED", at, owner)
            const id = await appointment("NO_SHOW", plusMinutes(at, 20), owner)
            const protocol = await protocolOf(id)
            const conflictingProtocol = await protocolOf(busy)

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result.warning).toEqual({
                code: "RESPONSIBLE_BUSY",
                message:
                    "O responsável anterior já tem outro agendamento neste horário. O agendamento voltou para Pendente sem responsável.",
                details: {
                    appointmentId: String(id),
                    protocol,
                    previousAssignedUserId: String(owner.id),
                    previousAssignedUserName: "Ricardo Ocupado",
                    conflictingAppointmentId: String(busy),
                    conflictingProtocol,
                    freeStaffCount: expect.any(Number),
                },
            })
            expect(await appointmentState(id)).toEqual({ status: "PENDING", assignedUserId: null })
        })

        it("num agendamento futuro restaura o responsável quando o confirmado dele é adjacente", async () => {
            const owner = await user({ permissions: MANAGE })
            const at = futureAt(16)
            await appointment("CONFIRMED", at, owner)
            const id = await appointment("NO_SHOW", plusMinutes(at, 30), owner)

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result).toEqual({ warning: null })
            expect(await appointmentState(id)).toEqual({ status: "CONFIRMED", assignedUserId: owner.id })
        })

        it("informa freeStaffCount 0 quando nenhuma conta elegível está livre no horário", async () => {
            const owner = await user({ permissions: MANAGE })
            const at = futureAt(16)
            const id = await appointment("NO_SHOW", at, owner)
            for (const eligible of await eligibleIds()) {
                await createTestAppointment(scope, {
                    status: "CONFIRMED",
                    assignedUserId: eligible,
                    appointmentDatetime: plusMinutes(at, 10),
                    cpfHash: randomBytes(32).toString("hex"),
                })
            }

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(result.warning?.code).toBe("RESPONSIBLE_BUSY")
            expect(result.warning?.details.freeStaffCount).toBe(0)
        })

        it("conta as contas elegíveis livres no horário", async () => {
            const owner = await user({ permissions: MANAGE })
            const at = futureAt(16)
            const id = await appointment("NO_SHOW", at, owner)
            const eligible = await eligibleIds()
            const [free, ...others] = eligible.filter((eligibleId) => eligibleId !== owner.id)
            for (const busyId of [owner.id, ...others]) {
                await createTestAppointment(scope, {
                    status: "CONFIRMED",
                    assignedUserId: busyId,
                    appointmentDatetime: plusMinutes(at, 10),
                    cpfHash: randomBytes(32).toString("hex"),
                })
            }

            const result = await repository.correctRecord(String(id), actor.id, NOW)

            expect(free).toBeDefined()
            expect(result.warning?.details.freeStaffCount).toBe(1)
        })
    })

    describe("pela rota", () => {
        it("responde só com data, sem a chave warning, quando a correção não gera aviso", async () => {
            const owner = await user({ permissions: MANAGE })
            const id = await appointment("NO_SHOW", pastAt(16), owner)

            const res = await request(app)
                .patch(`/api/v1/appointments/${id}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", actor.cookie)
                .send({ action: "correct_record" })

            expect(res.status).toBe(200)
            expect(Object.keys(res.body)).toEqual(["data"])
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.events[0]).toMatchObject({ type: "RECORD_CORRECTED", actor_user_id: String(actor.id) })
        })

        it("responde com data e warning quando o responsável anterior não pôde ser restaurado", async () => {
            const owner = await user({ permissions: MANAGE })
            const id = await appointment("ATTENDED", futureAt(16), owner)
            await getPool().query("DELETE FROM UserPermissions WHERE user_id = $1 AND permission_key = 'appointments.manage'", [
                owner.id,
            ])

            const res = await request(app)
                .patch(`/api/v1/appointments/${id}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", actor.cookie)
                .send({ action: "correct_record" })

            expect(res.status).toBe(200)
            expect(Object.keys(res.body).sort()).toEqual(["data", "warning"])
            expect(res.body.data.status).toBe("PENDING")
            expect(res.body.warning.code).toBe("RESPONSIBLE_UNAVAILABLE")
        })

        it("recusa com 403 a conta só com Ver agendamentos, sem gravar nada", async () => {
            const viewer = await user({ permissions: ["appointments.view"] })
            const owner = await user({ permissions: MANAGE })
            const id = await appointment("NO_SHOW", pastAt(16), owner)

            const res = await request(app)
                .patch(`/api/v1/appointments/${id}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", viewer.cookie)
                .send({ action: "correct_record" })

            expect(res.status).toBe(403)
            expect(res.body.error.code).toBe("FORBIDDEN")
            expect(await appointmentState(id)).toEqual({ status: "NO_SHOW", assignedUserId: owner.id })
            expect(await eventsOf([id])).toEqual([])
        })
    })

    describe("concorrência", () => {
        it("sempre grava uma e recusa a outra de duas correções simultâneas", async () => {
            const owner = await user({ permissions: MANAGE })
            const id = await appointment("ATTENDED", pastAt(16), owner)

            for (let round = 0; round < 5; round += 1) {
                await getPool().query("UPDATE Appointments SET status = 'ATTENDED', assigned_user_id = $1 WHERE id = $2", [
                    owner.id,
                    id,
                ])
                const eventsBefore = (await eventsOf([id])).length

                const results = await Promise.allSettled([
                    repository.correctRecord(String(id), actor.id, NOW),
                    repository.correctRecord(String(id), admin.id, NOW),
                ])

                const rejected = results.filter((result) => result.status === "rejected")
                expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
                expect(rejected).toHaveLength(1)
                expect(rejected[0]?.status === "rejected" && rejected[0].reason).toMatchObject({
                    code: "RECORD_NOT_CORRECTABLE",
                })
                expect((await eventsOf([id])).length).toBe(eventsBefore + 1)
            }
        })
    })
})
