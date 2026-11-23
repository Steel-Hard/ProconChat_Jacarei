import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest"
import { eventsOf } from "../integration/helpers/usersDb"
import { createCitizen } from "./helpers/citizen"
import { appointmentByProtocol, moveAppointmentToPast, sessionsOfPhone } from "./helpers/e2eDb"
import { E2eEnvironment, startE2eEnvironment, stopE2eEnvironment } from "./helpers/e2eEnvironment"
import { protocolOf } from "./helpers/journeys"
import { appointmentDetail, loginStaff, panelAction } from "./helpers/panel"
import { E2E_CPFS, E2E_PHONES } from "./helpers/phones"
import { E2E_WHATSAPP } from "./helpers/whatsappSettingsDb"

const HOLDER_NAME = "Maria da Silva"
const PROTOCOL_LENGTH = 8

describe("fluxo principal ponta a ponta", () => {
    let env: E2eEnvironment

    beforeAll(async () => {
        env = await startE2eEnvironment()
    })

    afterEach(() => {
        expect(env.meta.unexpectedCalls).toEqual([])
    })

    afterAll(async () => {
        await stopE2eEnvironment(env)
    })

    test("duvida nova termina em agendamento e a equipe assume e marca como atendido pelo painel", async () => {
        const citizen = createCitizen(env, E2E_PHONES.fluxoPrincipal)

        await citizen.say("oi")
        await citizen.tapAcrossPages((id) => id === `cat_${env.categoryId}`)
        await citizen.tapAcrossPages((id) => id === `q_${env.questionId}`)
        expect(citizen.lastReply().length).toBeGreaterThanOrEqual(2)
        expect(citizen.replyText()).toContain("Compareça ao Procon.")
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["resolved_yes", "resolved_no"]))

        await citizen.tap("resolved_no")
        expect(citizen.optionIds()).toEqual(expect.arrayContaining(["schedule_yes", "schedule_no"]))

        await citizen.tap("schedule_yes")
        await citizen.tap("attendee_self")
        await citizen.say(HOLDER_NAME)
        await citizen.say(E2E_CPFS.fluxoPrincipal)
        const firstSlot = citizen.slotIds()[0] as string
        await citizen.tap(firstSlot)

        expect(citizen.replyText()).toContain("Agendamento realizado")
        const protocol = protocolOf(citizen.replyText())
        expect(protocol).toHaveLength(PROTOCOL_LENGTH)
        const pending = await appointmentByProtocol(protocol)
        expect(pending.status).toBe("PENDING")
        expect(pending.assignedUserId).toBeNull()
        expect(pending.appointmentDatetime.toISOString()).toBe(firstSlot.replace("slot_", ""))

        const sessions = await sessionsOfPhone(E2E_PHONES.fluxoPrincipal)
        expect(sessions).toHaveLength(1)
        const session = sessions[0]!
        expect(session.outcome).toBe("SCHEDULED")
        expect(session.draft).toBeNull()
        expect(session.events.map((event) => event.type)).toEqual([
            "STARTED",
            "CATEGORY_CHOSEN",
            "QUESTION_CHOSEN",
            "ANSWER_SENT",
            "RESOLVED_ANSWERED",
            "SCHEDULE_OFFERED",
            "ATTENDEE_CHOSEN",
            "PHONE_NOTICE_SHOWN",
            "APPOINTMENT_CREATED",
        ])
        const dataOf = (type: string) => session.events.find((event) => event.type === type)?.data
        expect(dataOf("ANSWER_SENT")).toMatchObject({ llm: "NOT_CALLED" })
        expect(dataOf("RESOLVED_ANSWERED")).toMatchObject({ resolved: false })
        expect(dataOf("SCHEDULE_OFFERED")).toMatchObject({ reason: "NOT_RESOLVED" })
        expect(dataOf("ATTENDEE_CHOSEN")).toMatchObject({ by_representative: false })
        expect(session.events.find((event) => event.type === "APPOINTMENT_CREATED")?.appointmentId).toBe(pending.id)
        const storedEvents = JSON.stringify(session.events)
        expect(storedEvents).not.toContain(HOLDER_NAME)
        expect(storedEvents).not.toContain(E2E_CPFS.fluxoPrincipal)
        expect(storedEvents).not.toContain(E2E_CPFS.fluxoPrincipal.replace(/\D/g, ""))

        const cookie = await loginStaff(env)
        const claimed = await panelAction(env, cookie, pending.id, "claim")
        expect(claimed.status).toBe(200)
        const confirmed = await appointmentByProtocol(protocol)
        expect(confirmed.status).toBe("CONFIRMED")
        expect(confirmed.assignedUserId).toBe(env.staff.id)
        expect((await eventsOf([pending.id])).map((event) => event.type)).toEqual(["CREATED", "CLAIMED"])

        await moveAppointmentToPast(pending.id)
        const attended = await panelAction(env, cookie, pending.id, "attended")
        expect(attended.status).toBe(200)
        expect((await appointmentByProtocol(protocol)).status).toBe("ATTENDED")
        const detail = await appointmentDetail(env, cookie, pending.id)
        expect(detail.status).toBe(200)
        expect(detail.body.data).toMatchObject({ status: "ATTENDED", name: HOLDER_NAME })
        expect((await eventsOf([pending.id])).map((event) => event.type)).toEqual(["CREATED", "CLAIMED", "ATTENDED"])
        expect((await sessionsOfPhone(E2E_PHONES.fluxoPrincipal))[0]?.outcome).toBe("SCHEDULED")

        expect(env.meta.graphCalls.length).toBeGreaterThan(0)
        for (const call of env.meta.graphCalls) {
            expect(call.url).toContain(`/${E2E_WHATSAPP.phoneNumberId}/messages`)
            expect(call.authorization).toBe(`Bearer ${E2E_WHATSAPP.accessToken}`)
            if (typeof call.body.to === "string") {
                expect(call.body.to).toBe(E2E_PHONES.fluxoPrincipal)
            }
        }
    })
})
