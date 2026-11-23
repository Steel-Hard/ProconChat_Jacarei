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
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, eventsOf, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
const MANAGE: Permission[] = ["appointments.view", "appointments.manage"]
const repository = createAppointmentRepository()

describe("Observações internas com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let author: TestUser
    let viewer: TestUser
    let scope: OwnedAppointmentScope
    let day = 0

    async function appointment(status: AppointmentStatus): Promise<number> {
        day += 1
        return createTestAppointment(scope, {
            status,
            assignedUserId: status === "PENDING" || status === "CANCELED" ? null : author.id,
            appointmentDatetime: new Date(Date.UTC(2031, 8, day, 16)),
            cpfHash: randomBytes(32).toString("hex"),
        })
    }

    function post(id: number, text: string, user: TestUser = author): request.Test {
        return request(app)
            .post(`/api/v1/appointments/${id}/notes`)
            .set("Origin", ORIGIN)
            .set("Cookie", user.cookie)
            .send({ text })
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        author = await createTestUser({ name: "Paula Autora", permissions: MANAGE })
        viewer = await createTestUser({ permissions: ["appointments.view"] })
        createdUserIds.push(admin.createdId, author.id, viewer.id)
        scope = await createAppointmentScope(admin.id, "notes")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("grava a observação com autor e data e o detalhe devolvido a inclui, sem criar evento", async () => {
        const id = await appointment("PENDING")

        const res = await post(id, "  Cidadão avisou que chega 10 minutos atrasado.  ")

        expect(res.status).toBe(201)
        expect(res.body.data.notes).toEqual([
            {
                id: expect.any(String),
                author_user_id: String(author.id),
                author_user_name: "Paula Autora",
                text: "Cidadão avisou que chega 10 minutos atrasado.",
                created_at: expect.any(String),
            },
        ])
        expect(await eventsOf([id])).toEqual([])
    })

    it("aceita observação em qualquer status e devolve as observações em ordem cronológica crescente", async () => {
        const id = await appointment("CANCELED")
        await repository.addNote(String(id), author.id, "Segunda", new Date("2031-01-02T10:00:00.000Z"))
        await repository.addNote(String(id), admin.id, "Primeira", new Date("2031-01-01T10:00:00.000Z"))

        const detail = await repository.findById(id)

        expect(detail?.notes.map((note) => note.text)).toEqual(["Primeira", "Segunda"])
        expect(detail?.notes[0]?.author_user_id).toBe(String(admin.id))
    })

    it("aceita 2000 caracteres e recusa 2001 com 400", async () => {
        const id = await appointment("CONFIRMED")

        const accepted = await post(id, "a".repeat(2000))
        const refused = await post(id, "a".repeat(2001))

        expect(accepted.status).toBe(201)
        expect(refused.status).toBe(400)
        expect((await repository.findById(id))?.notes).toHaveLength(1)
    })

    it("a conta só com Ver agendamentos vê as observações e recebe 403 ao escrever", async () => {
        const id = await appointment("ATTENDED")
        await repository.addNote(String(id), author.id, "Documento conferido.", new Date("2031-01-01T10:00:00.000Z"))

        const detail = await request(app).get(`/api/v1/appointments/${id}`).set("Cookie", viewer.cookie)
        const refused = await post(id, "Tentativa", viewer)

        expect(detail.status).toBe(200)
        expect(detail.body.data.notes.map((note: { text: string }) => note.text)).toEqual(["Documento conferido."])
        expect(detail.body.data.available_actions.add_note).toEqual({ allowed: false, code: "PERMISSION_REQUIRED" })
        expect(refused.status).toBe(403)
        expect(refused.body.error.code).toBe("FORBIDDEN")
        expect((await repository.findById(id))?.notes).toHaveLength(1)
    })

    it("devolve 404 para agendamento inexistente", async () => {
        const res = await post(999_999_999, "Observação")

        expect(res.status).toBe(404)
    })

    it("não há rota de edição nem de exclusão, e o banco recusa UPDATE e DELETE direto", async () => {
        const id = await appointment("PENDING")
        await repository.addNote(String(id), author.id, "Imutável", new Date("2031-01-01T10:00:00.000Z"))

        for (const method of ["put", "patch", "delete"] as const) {
            const agent = request(app)
            const res = await agent[method](`/api/v1/appointments/${id}/notes/1`)
                .set("Origin", ORIGIN)
                .set("Cookie", admin.cookie)
                .send({ text: "Alterado" })
            expect(res.status).toBe(404)
        }
        await expect(
            getPool().query("UPDATE AppointmentNotes SET text = 'Alterado' WHERE appointment_id = $1", [id]),
        ).rejects.toThrow("AppointmentNotes são imutáveis")
        await expect(getPool().query("DELETE FROM AppointmentNotes WHERE appointment_id = $1", [id])).rejects.toThrow(
            "AppointmentNotes são imutáveis",
        )
        expect((await repository.findById(id))?.notes.map((note) => note.text)).toEqual(["Imutável"])
    })
})
