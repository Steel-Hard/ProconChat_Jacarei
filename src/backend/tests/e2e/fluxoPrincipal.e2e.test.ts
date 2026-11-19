import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import request from "supertest"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import backendApp from "../../app"
import getPool from "../../db/connection"
import gatewayApp from "../../../gateway/app"
import { hashPhone } from "../integration/helpers/phone"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "../integration/helpers/scheduleDb"
import { createTestUser, deleteTestUsers, eventsOf, TestUser } from "../integration/helpers/usersDb"
import { createCitizen, Citizen } from "./helpers/citizen"
import { installMetaFake, MetaFake } from "./helpers/metaFake"
import { E2E_WHATSAPP, restoreWhatsAppSettings, snapshotWhatsAppSettings, useE2eWhatsAppSettings } from "./helpers/whatsappSettingsDb"

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
const HOLDER_CPF = "529.982.247-25"

const phones = {
    fluxoPrincipal: "5512999990701",
    retorno: "5512999990702",
}

interface AppointmentRow {
    id: string
    appointment_datetime: Date
    rescheduled_from: Date | null
    status: string
    assigned_user_id: string | null
}

describe("fluxo principal ponta a ponta (webhook da Meta, Gateway, Backend e Postgres)", () => {
    let backendServer: Server
    let meta: MetaFake
    let staff: TestUser
    let categoryId: number
    let questionId: number
    let savedSchedule: ScheduleConfigSnapshot
    let savedSettings: Awaited<ReturnType<typeof snapshotWhatsAppSettings>>

    beforeAll(async () => {
        backendServer = await new Promise<Server>((resolve) => {
            const server = backendApp.listen(0, "127.0.0.1", () => resolve(server))
        })
        process.env.BACKEND_INTERNAL_URL = `http://127.0.0.1:${(backendServer.address() as AddressInfo).port}`

        meta = installMetaFake()

        await cleanupScheduleTestData({ phoneHashes: Object.values(phones).map(hashPhone), appointmentIds: [] })
        savedSettings = await snapshotWhatsAppSettings()
        savedSchedule = await snapshotScheduleConfig()
        await useE2eWhatsAppSettings()
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 1,
                window_days: 30,
                min_notice_days: 1,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: null,
                reminder_enabled: false,
                reminder_hours: 24,
            },
            ranges: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
                weekday,
                slot_index: 1,
                start_time: "08:00",
                end_time: "18:00",
            })),
        })

        const created = await createTestQuestion()
        categoryId = created.categoryId
        questionId = created.questionId
        await getPool().query(
            "UPDATE Questions SET requires_in_person = false, out_of_scope = false, llm_allowed = false WHERE id = $1",
            [questionId],
        )

        staff = await createTestUser({ permissions: ["appointments.view", "appointments.manage"] })
    })

    afterEach(() => {
        expect(meta.unexpectedCalls).toEqual([])
    })

    afterAll(async () => {
        try {
            meta?.restore()
            await cleanupScheduleTestData({ phoneHashes: Object.values(phones).map(hashPhone), appointmentIds: [] })
            if (savedSchedule) {
                await restoreScheduleConfig(savedSchedule)
            }
            await restoreWhatsAppSettings(savedSettings)
            await deleteTestUsers([staff?.createdId ?? null])
        } finally {
            await new Promise<void>((resolve) => {
                if (!backendServer) {
                    resolve()
                    return
                }
                backendServer.close(() => resolve())
                backendServer.closeAllConnections()
            })
            await getPool().end()
        }
    })

    async function appointmentByProtocol(protocol: string): Promise<AppointmentRow> {
        const result = await getPool().query<AppointmentRow>(
            `SELECT id, appointment_datetime, rescheduled_from, status, assigned_user_id
             FROM Appointments
             WHERE upper(left(appointment_code::text, 8)) = $1`,
            [protocol],
        )
        expect(result.rows).toHaveLength(1)
        return result.rows[0] as AppointmentRow
    }

    function protocolOf(citizen: Citizen): string {
        const match = /Protocolo:\s*\*?([0-9A-F]{8})/.exec(citizen.replyText())
        expect(match).not.toBeNull()
        return (match as RegExpExecArray)[1] as string
    }

    async function bookFirstSlot(citizen: Citizen, holderName: string): Promise<string> {
        await citizen.say("oi")
        await citizen.tapAcrossPages((id) => id === `cat_${categoryId}`)
        await citizen.tapAcrossPages((id) => id === `q_${questionId}`)
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["resolved_yes", "resolved_no"]))

        await citizen.tap("resolved_no")
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["schedule_yes", "schedule_no"]))

        await citizen.tap("schedule_yes")
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["attendee_self", "attendee_rep"]))

        await citizen.tap("attendee_self")
        await citizen.say(holderName)
        await citizen.say(HOLDER_CPF)

        const firstSlot = citizen.firstSlotId()
        expect(firstSlot).toBeDefined()
        await citizen.tap(firstSlot as string)
        expect(citizen.replyText()).toContain("Agendamento realizado")
        return protocolOf(citizen)
    }

    it("percorre saudação, categoria, pergunta, agendamento e confirmação e a equipe assume e marca como atendido", async () => {
        const citizen = createCitizen(gatewayApp, meta, phones.fluxoPrincipal)

        const protocol = await bookFirstSlot(citizen, "Maria da Silva")

        const pending = await appointmentByProtocol(protocol)
        expect(pending.status).toBe("PENDING")
        expect(pending.assigned_user_id).toBeNull()

        const claimed = await request(backendApp)
            .patch(`/api/v1/appointments/${pending.id}/status`)
            .set("Cookie", staff.cookie)
            .set("Origin", FRONTEND_ORIGIN)
            .send({ action: "claim" })
        expect(claimed.status).toBe(200)
        expect(claimed.body.data.status).toBe("CONFIRMED")
        expect((await appointmentByProtocol(protocol)).assigned_user_id).toBe(String(staff.id))

        await getPool().query("UPDATE Appointments SET appointment_datetime = now() - interval '1 minute' WHERE id = $1", [
            pending.id,
        ])

        const attended = await request(backendApp)
            .patch(`/api/v1/appointments/${pending.id}/status`)
            .set("Cookie", staff.cookie)
            .set("Origin", FRONTEND_ORIGIN)
            .send({ action: "attended" })
        expect(attended.status).toBe(200)
        expect(attended.body.data.status).toBe("ATTENDED")

        const detail = await request(backendApp).get(`/api/v1/appointments/${pending.id}`).set("Cookie", staff.cookie)
        expect(detail.status).toBe(200)
        expect(detail.body.data).toMatchObject({ status: "ATTENDED", name: "Maria da Silva" })

        expect((await eventsOf([Number(pending.id)])).map((event) => event.type)).toEqual(
            expect.arrayContaining(["CLAIMED", "ATTENDED"]),
        )

        const sent = meta.graphCalls.filter((call) => call.body.to === phones.fluxoPrincipal)
        expect(sent.length).toBeGreaterThan(0)
        for (const call of sent) {
            expect(call.url).toContain(`/${E2E_WHATSAPP.phoneNumberId}/messages`)
            expect(call.authorization).toBe(`Bearer ${E2E_WHATSAPP.accessToken}`)
        }
    })

    it("no retorno de quem já tem agendamento, oferece remarcar e move o horário", async () => {
        const citizen = createCitizen(gatewayApp, meta, phones.retorno)

        const protocol = await bookFirstSlot(citizen, "João Pereira")
        const original = await appointmentByProtocol(protocol)
        expect(original.status).toBe("PENDING")

        await citizen.say("oi")
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["return_reschedule", "return_cancel", "return_other"]))

        await citizen.tap("return_reschedule")
        const originalSlot = `slot_${original.appointment_datetime.toISOString()}`
        const otherSlot = citizen.slotIds().find((id) => id !== originalSlot)
        expect(otherSlot).toBeDefined()

        await citizen.tap(otherSlot as string)
        expect(citizen.replyText()).toContain("Agendamento remarcado")

        const moved = await appointmentByProtocol(protocol)
        expect(moved.appointment_datetime.toISOString()).toBe((otherSlot as string).replace("slot_", ""))
        expect(moved.appointment_datetime.getTime()).not.toBe(original.appointment_datetime.getTime())
        expect(moved.rescheduled_from?.getTime()).toBe(original.appointment_datetime.getTime())
        expect(moved.status).toBe("PENDING")
    })
})
