import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { loginAdmin } from "./helpers/appointmentsDb"
import { insertCitizenAppointment } from "./helpers/citizenAppointmentDb"
import { hashPhone } from "./helpers/phone"
import { cleanupScheduleTestData, createTestQuestion } from "./helpers/scheduleDb"
import { deleteTestUsers } from "./helpers/usersDb"

const phones = {
    now: "5512999990591",
    inactive: "5512999990592",
    owner: "5512999990593",
    stranger: "5512999990594",
    confirmed: "5512999990595",
}

const HOUR = 60 * 60 * 1000

describe("agendamento de retorno do cidadão (Postgres)", () => {
    const createdAppointmentIds: string[] = []
    const now = new Date(Math.floor(Date.now() / 1000) * 1000)
    let questionId: number
    let adminUserId: number
    let createdAdminId: number | null = null

    beforeAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: Object.values(phones).map(hashPhone), appointmentIds: [] })
        questionId = (await createTestQuestion()).questionId
        const admin = await loginAdmin()
        adminUserId = admin.adminUserId
        createdAdminId = admin.createdAdminId
    })

    afterAll(async () => {
        await cleanupScheduleTestData({
            phoneHashes: Object.values(phones).map(hashPhone),
            appointmentIds: createdAppointmentIds,
        })
        await deleteTestUsers([createdAdminId])
        await getPool().end()
    })

    async function appointmentFor(phone: string, input: Partial<Parameters<typeof insertCitizenAppointment>[0]> = {}) {
        const id = await insertCitizenAppointment({
            phone,
            questionId,
            appointmentDatetime: new Date(now.getTime() + 48 * HOUR),
            assignedUserId: adminUserId,
            ...input,
        })
        createdAppointmentIds.push(id)
        return id
    }

    describe("findReturningAppointment", () => {
        it("não devolve o agendamento Pendente marcado exatamente para agora", async () => {
            await appointmentFor(phones.now, { appointmentDatetime: now })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.now), now)

            expect(found).toBeNull()
        })

        it("não devolve agendamentos futuros Cancelados, Atendidos ou Não compareceu", async () => {
            await appointmentFor(phones.inactive, { status: "CANCELED", appointmentDatetime: new Date(now.getTime() + 24 * HOUR) })
            await appointmentFor(phones.inactive, { status: "ATTENDED", appointmentDatetime: new Date(now.getTime() + 25 * HOUR) })
            await appointmentFor(phones.inactive, { status: "NO_SHOW", appointmentDatetime: new Date(now.getTime() + 26 * HOUR) })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.inactive), now)

            expect(found).toBeNull()
        })

        it("não devolve o agendamento de outro telefone e devolve null para quem não tem nenhum", async () => {
            await appointmentFor(phones.owner)

            const stranger = await scheduleRepository.findReturningAppointment(hashPhone(phones.stranger), now)

            expect(stranger).toBeNull()
        })

        it("devolve o agendamento Confirmado futuro com id, horário e status", async () => {
            const appointmentDatetime = new Date(now.getTime() + 72 * HOUR)
            const id = await appointmentFor(phones.confirmed, { status: "CONFIRMED", appointmentDatetime })

            const found = await scheduleRepository.findReturningAppointment(hashPhone(phones.confirmed), now)

            expect(found).toEqual({ id, appointmentDatetime, status: "CONFIRMED" })
        })
    })
})
