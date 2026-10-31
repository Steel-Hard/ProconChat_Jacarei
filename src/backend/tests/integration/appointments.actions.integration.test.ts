import { randomBytes } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import type { AppointmentStatus } from "../../types/appointment.types"
import type { Permission } from "../../types/auth.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]

type AccountKind = "none" | "view" | "manage"

describe("Ações do agendamento ponta a ponta com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let ana: TestUser
    let bruno: TestUser
    let viewer: TestUser
    let nobody: TestUser
    let scope: OwnedAppointmentScope
    let day = 0

    async function appointment(status: AppointmentStatus, past: boolean, owner: TestUser | null = null): Promise<number> {
        day += 1
        const at = past ? new Date(Date.UTC(2025, 4, day, 16)) : new Date(Date.UTC(2031, 9, day, 16))
        return createTestAppointment(scope, {
            status,
            assignedUserId: owner?.id ?? null,
            appointmentDatetime: at,
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    function patch(id: number, user: TestUser, body: Record<string, unknown>): request.Test {
        return request(app).patch(`/api/v1/appointments/${id}/status`).set("Origin", ORIGIN).set("Cookie", user.cookie).send(body)
    }

    function postNote(id: number, user: TestUser, text: string): request.Test {
        return request(app).post(`/api/v1/appointments/${id}/notes`).set("Origin", ORIGIN).set("Cookie", user.cookie).send({ text })
    }

    function accountOf(kind: AccountKind): TestUser {
        return kind === "none" ? nobody : kind === "view" ? viewer : ana
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        ana = await createTestUser({ name: "Ana Atendente", permissions: MANAGE })
        bruno = await createTestUser({ name: "Bruno Atendente", permissions: MANAGE })
        viewer = await createTestUser({ permissions: ["appointments.view"] })
        nobody = await createTestUser({})
        createdUserIds.push(admin.createdId, ana.id, bruno.id, viewer.id, nobody.id)
        scope = await createAppointmentScope(admin.id, "actions")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    describe("permissão por ação", () => {
        it.each([
            { kind: "none" as const, expected: 403 },
            { kind: "view" as const, expected: 200 },
            { kind: "manage" as const, expected: 200 },
        ])("lista de funcionários: conta $kind recebe $expected", async ({ kind, expected }) => {
            const res = await request(app).get("/api/v1/appointments/staff").set("Cookie", accountOf(kind).cookie)

            expect(res.status).toBe(expected)
        })

        it.each([
            { kind: "none" as const, expected: 403 },
            { kind: "view" as const, expected: 200 },
            { kind: "manage" as const, expected: 200 },
        ])("calendário: conta $kind recebe $expected", async ({ kind, expected }) => {
            const res = await request(app).get("/api/v1/appointments/calendar").set("Cookie", accountOf(kind).cookie)

            expect(res.status).toBe(expected)
        })

        it.each([
            { kind: "none" as const, expected: 403 },
            { kind: "view" as const, expected: 403 },
            { kind: "manage" as const, expected: 200 },
        ])("atribuir: conta $kind recebe $expected", async ({ kind, expected }) => {
            const id = await appointment("PENDING", false)

            const res = await patch(id, accountOf(kind), { action: "assign", assigneeUserId: bruno.id })

            expect(res.status).toBe(expected)
        })

        it.each([
            { kind: "none" as const, expected: 403 },
            { kind: "view" as const, expected: 403 },
            { kind: "manage" as const, expected: 200 },
        ])("corrigir registro: conta $kind recebe $expected", async ({ kind, expected }) => {
            const id = await appointment("NO_SHOW", true, bruno)

            const res = await patch(id, accountOf(kind), { action: "correct_record" })

            expect(res.status).toBe(expected)
        })

        it.each([
            { kind: "none" as const, expected: 403 },
            { kind: "view" as const, expected: 403 },
            { kind: "manage" as const, expected: 201 },
        ])("escrever observação: conta $kind recebe $expected", async ({ kind, expected }) => {
            const id = await appointment("PENDING", false)

            const res = await postNote(id, accountOf(kind), "Observação da matriz")

            expect(res.status).toBe(expected)
        })

        it("no Detalhe, a conta só com Ver agendamentos recebe PERMISSION_REQUIRED nas sete ações", async () => {
            const id = await appointment("PENDING", false)

            const res = await request(app).get(`/api/v1/appointments/${id}`).set("Cookie", viewer.cookie)

            expect(Object.values(res.body.data.available_actions)).toEqual(
                Array(7).fill({ allowed: false, code: "PERMISSION_REQUIRED" }),
            )
        })
    })

    describe("critérios de aceitação da issue", () => {
        it("regras de atribuição e correção: Ana atribui a Bruno, Bruno registra o atendimento e Ana corrige o registro", async () => {
            const id = await appointment("PENDING", true)

            const assigned = await patch(id, ana, { action: "assign", assigneeUserId: bruno.id })
            const attended = await patch(id, bruno, { action: "attended" })
            const corrected = await patch(id, ana, { action: "correct_record" })
            const refused = await patch(id, ana, { action: "assign", assigneeUserId: bruno.id })

            expect(assigned.body.data).toMatchObject({ status: "CONFIRMED", assigned_user_id: String(bruno.id) })
            expect(attended.body.data).toMatchObject({ status: "ATTENDED", assigned_user_id: String(bruno.id) })
            expect(corrected.status).toBe(200)
            expect(corrected.body.data).toMatchObject({ status: "CONFIRMED", assigned_user_id: String(bruno.id) })
            expect(refused.status).toBe(409)
            expect(refused.body.error.code).toBe("ALREADY_ASSIGNED_TO_USER")
        })

        it("observações imutáveis: não há rota de edição nem de exclusão e a observação continua igual", async () => {
            const id = await appointment("CONFIRMED", false, bruno)
            const created = await postNote(id, ana, "Cidadão pediu para trazer o filho.")
            const noteId = created.body.data.notes[0].id

            const attempts = [
                await request(app).put(`/api/v1/appointments/${id}/notes/${noteId}`).set("Origin", ORIGIN).set("Cookie", admin.cookie).send({ text: "x" }),
                await request(app).patch(`/api/v1/appointments/${id}/notes/${noteId}`).set("Origin", ORIGIN).set("Cookie", admin.cookie).send({ text: "x" }),
                await request(app).delete(`/api/v1/appointments/${id}/notes/${noteId}`).set("Origin", ORIGIN).set("Cookie", admin.cookie),
            ]
            const detail = await request(app).get(`/api/v1/appointments/${id}`).set("Cookie", viewer.cookie)

            expect(attempts.map((res) => res.status)).toEqual([404, 404, 404])
            expect(detail.body.data.notes).toEqual([
                expect.objectContaining({ id: noteId, text: "Cidadão pediu para trazer o filho.", author_user_name: "Ana Atendente" }),
            ])
        })

        it("eventos no histórico: atribuir, registrar e corrigir aparecem no Detalhe com quem fez", async () => {
            const id = await appointment("PENDING", true)
            await patch(id, ana, { action: "assign", assigneeUserId: bruno.id })
            await patch(id, bruno, { action: "no_show" })
            await patch(id, ana, { action: "correct_record" })
            await postNote(id, ana, "Observação não vira evento")

            const res = await request(app).get(`/api/v1/appointments/${id}`).set("Cookie", viewer.cookie)

            const history = [...res.body.data.events]
                .reverse()
                .map((event: { type: string; actor_user_id: string; data: Record<string, unknown> }) => ({
                    type: event.type,
                    actor: event.actor_user_id,
                    data: event.data,
                }))
            expect(history).toEqual([
                { type: "ASSIGNED", actor: String(ana.id), data: { assignee_user_id: bruno.id } },
                { type: "NO_SHOW", actor: String(bruno.id), data: {} },
                {
                    type: "RECORD_CORRECTED",
                    actor: String(ana.id),
                    data: { previous_status: "NO_SHOW", previous_assigned_user_id: bruno.id },
                },
            ])
        })
    })
})
