import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest"
import { eventsOf } from "../integration/helpers/usersDb"
import { createCitizen } from "./helpers/citizen"
import { appointmentByProtocol, E2eSession, sessionsOfPhone } from "./helpers/e2eDb"
import { E2eEnvironment, startE2eEnvironment, stopE2eEnvironment } from "./helpers/e2eEnvironment"
import { bookThroughChat, expectedWhen, goToSlotList, protocolOf } from "./helpers/journeys"
import { E2E_CPFS, E2E_PHONES } from "./helpers/phones"
import { loginStaff, panelAction } from "./helpers/panel"
import { setCancellationNotice } from "./helpers/whatsappSettingsDb"

const RETURN_OPTION_PREFIX = "return_"
const RETURN_BUTTONS = ["return_reschedule", "return_cancel", "return_other"]

let env: E2eEnvironment | undefined

function environment(): E2eEnvironment {
    if (!env) {
        throw new Error("Ambiente do teste não iniciou")
    }
    return env
}

function menuText(appointmentDatetime: Date): string {
    return `Você tem atendimento marcado em ${expectedWhen(appointmentDatetime)}.`
}

function cancelConfirmationText(appointmentDatetime: Date): string {
    return `Deseja mesmo cancelar o atendimento marcado em ${expectedWhen(appointmentDatetime)}? O cancelamento não pode ser desfeito.\n1. Sim, cancelar\n2. Não, manter`
}

function canceledText(protocol: string): string {
    return `Seu agendamento ${protocol} foi cancelado e o horário foi liberado. Para agendar novamente, envie uma mensagem para este número.`
}

function expectNoTypedData(sessions: E2eSession[], holder: { name: string; cpf: string }): void {
    const stored = JSON.stringify(sessions.map((session) => session.events))
    expect(stored).not.toContain(holder.name)
    expect(stored).not.toContain(holder.cpf)
    expect(stored).not.toContain(holder.cpf.replace(/\D/g, ""))
}

beforeAll(async () => {
    env = await startE2eEnvironment()
})

afterEach(() => {
    expect(environment().meta.unexpectedCalls).toEqual([])
})

afterAll(async () => {
    await stopE2eEnvironment(env)
})

describe("retorno do cidadão com agendamento futuro", () => {
    test("remarca um agendamento confirmado, que volta a pendente com o mesmo protocolo", async () => {
        const current = environment()
        const phone = E2E_PHONES.remarcar
        const holder = { name: "Titular Remarcar", cpf: E2E_CPFS.remarcar }
        const citizen = createCitizen(current, phone)

        const protocol = await bookThroughChat(current, citizen, holder)
        const booked = await appointmentByProtocol(protocol)
        const cookie = await loginStaff(current)
        const claimed = await panelAction(current, cookie, booked.id, "claim")
        expect(claimed.status).toBe(200)
        const confirmed = await appointmentByProtocol(protocol)
        expect(confirmed.status).toBe("CONFIRMED")
        expect(confirmed.assignedUserId).toBe(current.staff.id)

        await citizen.say("oi")
        expect(citizen.replyText()).toBe(menuText(confirmed.appointmentDatetime))
        expect(citizen.optionIds()).toEqual(RETURN_BUTTONS)

        await citizen.tap("return_reschedule")
        const newSlot = citizen.slotIds()[0]
        expect(newSlot).toBeDefined()
        expect(newSlot).not.toBe(`slot_${confirmed.appointmentDatetime.toISOString()}`)
        await citizen.tap(newSlot as string)

        expect(citizen.replyText()).toContain("Agendamento remarcado")
        expect(protocolOf(citizen.replyText())).toBe(protocol)

        const rescheduled = await appointmentByProtocol(protocol)
        expect(rescheduled.appointmentDatetime.toISOString()).toBe((newSlot as string).replace("slot_", ""))
        expect(rescheduled.rescheduledFrom?.toISOString()).toBe(confirmed.appointmentDatetime.toISOString())
        expect(rescheduled.status).toBe("PENDING")
        expect(rescheduled.assignedUserId).toBeNull()

        const history = await eventsOf([booked.id])
        expect(history.map((event) => event.type)).toEqual(["CREATED", "CLAIMED", "RESCHEDULED", "BACK_TO_PENDING"])
        expect(history[2]?.data).toEqual({
            from: confirmed.appointmentDatetime.toISOString(),
            to: rescheduled.appointmentDatetime.toISOString(),
        })
        expect(history[3]?.data).toMatchObject({ reason: "RESCHEDULED" })

        const sessions = await sessionsOfPhone(phone)
        expect(sessions).toHaveLength(2)
        const returnSession = sessions[1]!
        expect(returnSession.outcome).toBe("MANAGED_APPOINTMENT")
        expect(returnSession.draft).toBeNull()
        expect(returnSession.events.map((event) => event.type)).toEqual([
            "STARTED",
            "APPOINTMENT_CONSULTED",
            "APPOINTMENT_RESCHEDULED",
        ])
        expect(returnSession.events[2]?.data).toMatchObject({
            from: confirmed.appointmentDatetime.toISOString(),
            to: rescheduled.appointmentDatetime.toISOString(),
        })
        expectNoTypedData(sessions, holder)
    })

    test("cancela um agendamento pendente depois da confirmação e libera o horário", async () => {
        const current = environment()
        const phone = E2E_PHONES.cancelar
        const holder = { name: "Titular Cancelar", cpf: E2E_CPFS.cancelar }
        const citizen = createCitizen(current, phone)

        const protocol = await bookThroughChat(current, citizen, holder)
        const booked = await appointmentByProtocol(protocol)
        expect(booked.status).toBe("PENDING")
        await setCancellationNotice(true)

        await citizen.say("oi")
        expect(citizen.replyText()).toBe(menuText(booked.appointmentDatetime))
        expect(citizen.optionIds()).toEqual(RETURN_BUTTONS)

        await citizen.tap("return_cancel")
        expect(citizen.replyText()).toBe(cancelConfirmationText(booked.appointmentDatetime))
        expect(citizen.optionIds()).toEqual(["cancel_yes", "cancel_no"])
        expect((await appointmentByProtocol(protocol)).status).toBe("PENDING")

        await citizen.tap("cancel_yes")
        expect(citizen.replyText()).toBe(canceledText(protocol))

        expect((await appointmentByProtocol(protocol)).status).toBe("CANCELED")
        const history = await eventsOf([booked.id])
        expect(history.map((event) => event.type)).toEqual(["CREATED", "CANCELED_BY_CITIZEN"])
        expect(current.meta.sentTo(phone).filter((message) => message.type === "template")).toEqual([])

        const sessions = await sessionsOfPhone(phone)
        expect(sessions).toHaveLength(2)
        const returnSession = sessions[1]!
        expect(returnSession.outcome).toBe("MANAGED_APPOINTMENT")
        expect(returnSession.draft).toBeNull()
        expect(returnSession.events.map((event) => event.type)).toEqual([
            "STARTED",
            "APPOINTMENT_CONSULTED",
            "APPOINTMENT_CANCELED",
        ])
        expectNoTypedData(sessions, holder)

        const callsBefore = current.meta.graphCalls.length
        await goToSlotList(current, citizen, holder)
        const sent = current.meta.sentSince(callsBefore)
        const categoryListIndex = sent.findIndex((message) => message.optionIds.some((id) => id.startsWith("cat_")))
        expect(categoryListIndex).toBeGreaterThanOrEqual(0)
        const beforeCategoryList = sent.slice(0, categoryListIndex + 1).flatMap((message) => message.optionIds)
        expect(beforeCategoryList.some((id) => id.startsWith(RETURN_OPTION_PREFIX))).toBe(false)
        expect(citizen.slotIds()).toContain(`slot_${booked.appointmentDatetime.toISOString()}`)
    })
})
