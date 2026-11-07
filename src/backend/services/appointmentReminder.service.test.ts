import { describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../clients/gateway.client"
import type { AppointmentReminderTarget } from "../repositories/appointmentReminder.repository"
import { AppointmentReminderStubRepository } from "../repositories/mock/appointmentReminderStub.repository"
import { createSweepAppointmentReminders } from "./appointmentReminder.service"
import { MODELO_LEMBRETE_ATENDIMENTO, parametrosLembreteAtendimento } from "./messageFormatter.service"

const FIXED_NOW = new Date("2026-11-04T17:00:00.000Z")
const PHONE = "5512999990000"
const ENCRYPTED = "v1:cifrado"

function target(overrides: Partial<AppointmentReminderTarget> = {}): AppointmentReminderTarget {
    return {
        id: "1",
        name: "  Maria  da Silva",
        protocol: "1A2B3C4D",
        appointmentDatetime: new Date("2026-11-05T17:00:00.000Z"),
        phoneEncrypted: ENCRYPTED,
        unitAddress: "Rua do Procon, 100",
        unitAddressComplement: "Sala 1",
        documentsSent: {
            group: ["RG ou CNH"],
            question: ["Comprovante de residência"],
        },
        ...overrides,
    }
}

function setup({
    targets = [target()],
    sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>().mockResolvedValue({
        ok: true,
        providerMessageId: "wamid.lembrete",
    }),
    decrypt = vi.fn((value: string) => (value === ENCRYPTED ? PHONE : "5512999990001")),
    clock = () => FIXED_NOW,
}: {
    targets?: AppointmentReminderTarget[]
    sendTemplate?: ReturnType<typeof vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>>
    decrypt?: (value: string) => string
    clock?: () => Date
} = {}) {
    const repository = new AppointmentReminderStubRepository(targets)
    const logger = { log: vi.fn() }
    const sweep = createSweepAppointmentReminders({ repository, gateway: { sendTemplate }, decrypt, clock, logger })
    return { repository, sendTemplate, decrypt, logger, sweep }
}

describe("appointmentReminder.service", () => {
    it("devolve 0 e não chama o gateway quando não há agendamentos na janela do lembrete", async () => {
        const { repository, sendTemplate, sweep } = setup({ targets: [] })

        const count = await sweep()

        expect(count).toBe(0)
        expect(repository.findDueCalls).toEqual([FIXED_NOW])
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(repository.recordCalls).toEqual([])
    })

    it("envia o modelo lembrete_atendimento com os documentos guardados no agendamento e grava SENT com o wamid", async () => {
        const due = target()
        const { repository, sendTemplate, sweep } = setup({ targets: [due] })

        const count = await sweep()

        expect(count).toBe(1)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(sendTemplate).toHaveBeenCalledWith({
            to: PHONE,
            name: MODELO_LEMBRETE_ATENDIMENTO.name,
            languageCode: MODELO_LEMBRETE_ATENDIMENTO.languageCode,
            bodyParameters: parametrosLembreteAtendimento({
                name: due.name,
                protocol: due.protocol,
                appointmentDatetime: due.appointmentDatetime,
                unitAddress: due.unitAddress,
                unitAddressComplement: due.unitAddressComplement,
                documentsSent: due.documentsSent,
            }),
        })
        expect(repository.recordCalls).toEqual([
            { id: "1", outcome: "SENT", now: FIXED_NOW, providerMessageId: "wamid.lembrete" },
        ])
    })

    it("não envia duas vezes para o mesmo agendamento em varreduras seguidas", async () => {
        const { sendTemplate, sweep } = setup({ targets: [target()] })

        const first = await sweep()
        const second = await sweep()

        expect(first).toBe(1)
        expect(second).toBe(0)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
    })

    it("grava FAILED e não chama o gateway quando o agendamento não tem telefone ou o telefone não decifra", async () => {
        const { repository, sendTemplate, logger, sweep } = setup({
            targets: [
                target({ id: "1", phoneEncrypted: null }),
                target({ id: "2", phoneEncrypted: "v1:invalido" }),
            ],
            decrypt: () => {
                throw new Error("Valor criptografado inválido")
            },
        })

        const count = await sweep()

        expect(count).toBe(0)
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(repository.recordCalls).toEqual([
            { id: "1", outcome: "FAILED", now: FIXED_NOW, providerMessageId: null },
            { id: "2", outcome: "FAILED", now: FIXED_NOW, providerMessageId: null },
        ])
        expect(logger.log.mock.calls.map((call) => JSON.parse(String(call[0])))).toEqual([
            { event: "appointment_reminder_failed", appointmentId: "1", reason: "PHONE_UNAVAILABLE" },
            { event: "appointment_reminder_failed", appointmentId: "2", reason: "PHONE_UNAVAILABLE" },
        ])
    })

    it.each(["REJECTED", "UNREACHABLE", "NOT_CONFIGURED"] as const)(
        "grava FAILED sem lançar e sem expor o telefone no log quando o gateway devolve %s",
        async (reason) => {
            const sendTemplate = vi
                .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
                .mockResolvedValue({ ok: false, reason })
            const { repository, logger, sweep } = setup({ sendTemplate })

            const count = await sweep()

            expect(count).toBe(0)
            expect(repository.recordCalls).toEqual([
                { id: "1", outcome: "FAILED", now: FIXED_NOW, providerMessageId: null },
            ])
            expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({
                event: "appointment_reminder_failed",
                appointmentId: "1",
                reason,
            })
            expect(JSON.stringify(logger.log.mock.calls)).not.toContain(PHONE)
        },
    )

    it("ignora agendamento cujo envio já está em andamento em chamada concorrente", async () => {
        let release: (result: SendTemplateResult) => void = () => undefined
        const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>(
            () =>
                new Promise((resolve) => {
                    release = resolve
                }),
        )
        const { sweep } = setup({ sendTemplate })

        const first = sweep()
        await vi.waitFor(() => expect(sendTemplate).toHaveBeenCalledTimes(1))
        const second = await sweep()
        release({ ok: true, providerMessageId: "wamid.1" })

        expect(second).toBe(0)
        await expect(first).resolves.toBe(1)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
    })
})
