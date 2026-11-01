import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { appointmentRetentionRepository } from "../../repositories/appointmentRetention.repository"
import { loginAdmin } from "./helpers/appointmentsDb"
import { insertCitizenAppointment, storedCitizenAppointment } from "./helpers/citizenAppointmentDb"
import { hashPhone } from "./helpers/phone"
import { cleanupScheduleTestData, createTestQuestion } from "./helpers/scheduleDb"
import { deleteTestUsers } from "./helpers/usersDb"

const phones = ["5500000006901", "5500000006902", "5500000006903", "5500000006904", "5500000006905", "5500000006906"]

describe("apagamento do telefone dos agendamentos cujo horario chegou (Postgres)", () => {
    const createdAppointmentIds: string[] = []
    let questionId: number
    let adminUserId: number
    let createdAdminId: number | null = null
    let created = 0

    async function appointment(input: {
        at: string
        status?: "PENDING" | "CONFIRMED" | "ATTENDED" | "NO_SHOW" | "CANCELED"
    }): Promise<string> {
        const phone = phones[created % phones.length] as string
        created += 1
        const id = await insertCitizenAppointment({
            phone,
            questionId,
            appointmentDatetime: new Date(input.at),
            status: input.status ?? "PENDING",
            assignedUserId: adminUserId,
            cpfHash: created.toString(16).padStart(64, "0"),
        })
        createdAppointmentIds.push(id)
        return id
    }

    beforeAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: phones.map(hashPhone), appointmentIds: [] })
        questionId = (await createTestQuestion()).questionId
        const admin = await loginAdmin()
        adminUserId = admin.adminUserId
        createdAdminId = admin.createdAdminId
    })

    afterEach(async () => {
        await getPool().query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [createdAppointmentIds])
        await getPool().query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [createdAppointmentIds])
        createdAppointmentIds.length = 0
    })

    afterAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: phones.map(hashPhone), appointmentIds: [] })
        await deleteTestUsers([createdAdminId])
        await getPool().end()
    })

    it("apaga o telefone do agendamento com horario igual ao instante da varredura", async () => {
        const id = await appointment({ at: "2000-03-01T12:00:00Z" })

        await appointmentRetentionRepository.erasePastAppointmentPhones(new Date("2000-03-01T12:00:00Z"))

        expect((await storedCitizenAppointment(id)).phoneEncrypted).toBeNull()
    })

    it("mantem o telefone, igual ao gravado, do agendamento um segundo depois do instante", async () => {
        const id = await appointment({ at: "2000-03-01T12:00:01Z" })
        const before = (await storedCitizenAppointment(id)).phoneEncrypted

        await appointmentRetentionRepository.erasePastAppointmentPhones(new Date("2000-03-01T12:00:00Z"))

        expect(before).not.toBeNull()
        expect((await storedCitizenAppointment(id)).phoneEncrypted).toBe(before)
    })

    it("mantem o telefone de um agendamento cancelado com horario futuro", async () => {
        const id = await appointment({ at: "2000-03-02T12:00:00Z", status: "CANCELED" })
        const before = (await storedCitizenAppointment(id)).phoneEncrypted

        await appointmentRetentionRepository.erasePastAppointmentPhones(new Date("2000-03-01T12:00:00Z"))

        expect((await storedCitizenAppointment(id)).phoneEncrypted).toBe(before)
    })

    it.each(["PENDING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELED"] as const)(
        "apaga o telefone do agendamento %s cujo horario passou",
        async (status) => {
            const id = await appointment({ at: "2000-02-01T09:00:00Z", status })

            await appointmentRetentionRepository.erasePastAppointmentPhones(new Date("2000-02-01T10:00:00Z"))

            expect((await storedCitizenAppointment(id)).phoneEncrypted).toBeNull()
        },
    )

    it("devolve exatamente o numero de telefones apagados e zero na segunda execucao", async () => {
        const now = new Date("2001-01-01T12:00:00Z")
        await appointment({ at: "2001-01-01T11:00:00Z" })
        await appointment({ at: "2001-01-01T12:00:00Z" })
        await appointment({ at: "2001-01-01T12:00:01Z" })

        const first = await appointmentRetentionRepository.erasePastAppointmentPhones(now)
        const second = await appointmentRetentionRepository.erasePastAppointmentPhones(now)

        expect(first).toBe(2)
        expect(second).toBe(0)
    })

    it("nao altera os outros dados do agendamento nem registra evento", async () => {
        const id = await appointment({ at: "2000-04-01T09:00:00Z", status: "CONFIRMED" })
        const { phoneEncrypted: _phone, ...before } = await storedCitizenAppointment(id)
        const eventsBefore = await getPool().query("SELECT id FROM AppointmentEvents WHERE appointment_id = $1", [id])

        await appointmentRetentionRepository.erasePastAppointmentPhones(new Date("2000-04-01T10:00:00Z"))

        const { phoneEncrypted, ...after } = await storedCitizenAppointment(id)
        expect(phoneEncrypted).toBeNull()
        expect(after).toEqual(before)
        expect(after.assignedUserId).toBe(adminUserId)
        const eventsAfter = await getPool().query("SELECT id FROM AppointmentEvents WHERE appointment_id = $1", [id])
        expect(eventsAfter.rows).toEqual(eventsBefore.rows)
    })
})
