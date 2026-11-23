import { expect } from "vitest"
import type { Citizen } from "./citizen"
import type { E2eEnvironment } from "./e2eEnvironment"

export interface Holder {
    name: string
    cpf: string
}

const PROTOCOL_PATTERN = /Protocolo:\s*\*?([0-9A-F]{8})/
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo"

export function protocolOf(replyText: string): string {
    const match = PROTOCOL_PATTERN.exec(replyText)
    if (!match) {
        throw new Error("Protocolo não encontrado na resposta")
    }
    return match[1] as string
}

export function expectedWhen(datetime: Date): string {
    const parts = new Intl.DateTimeFormat("pt-BR", {
        timeZone: SAO_PAULO_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(datetime)
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
    return `${part("day")}/${part("month")} às ${part("hour")}:${part("minute")}`
}

export async function goToSlotList(env: E2eEnvironment, citizen: Citizen, holder: Holder): Promise<void> {
    await citizen.say("oi")
    await citizen.tapAcrossPages((id) => id === `cat_${env.categoryId}`)
    await citizen.tapAcrossPages((id) => id === `q_${env.questionId}`)
    expect(citizen.optionIds()).toEqual(expect.arrayContaining(["resolved_yes", "resolved_no"]))
    await citizen.tap("resolved_no")
    await citizen.tap("schedule_yes")
    await citizen.tap("attendee_self")
    await citizen.say(holder.name)
    await citizen.say(holder.cpf)
}

export async function bookThroughChat(env: E2eEnvironment, citizen: Citizen, holder: Holder): Promise<string> {
    await goToSlotList(env, citizen, holder)
    const firstSlot = citizen.slotIds()[0]
    expect(firstSlot).toBeDefined()
    await citizen.tap(firstSlot as string)
    expect(citizen.replyText()).toContain("Agendamento realizado")
    return protocolOf(citizen.replyText())
}
