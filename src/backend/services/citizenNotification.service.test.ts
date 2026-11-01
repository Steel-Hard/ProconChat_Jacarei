import { describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../clients/gateway.client"
import { FIXED_NOW } from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import type { CancellationNoticeTarget } from "../types/appointment.types"
import { createCitizenNotificationService } from "./citizenNotification.service"
import { MODELO_AVISO_CANCELAMENTO, parametrosAvisoCancelamento } from "./messageFormatter.service"

const PHONE = "5512999990000"
const ENCRYPTED = "v1:cifrado"

function target(overrides: Partial<CancellationNoticeTarget> = {}): CancellationNoticeTarget {
    return {
        status: "CANCELED",
        appointmentDatetime: new Date("2026-11-05T17:00:00.000Z"),
        name: "  Maria  da Silva",
        protocol: "1A2B3C4D",
        phoneEncrypted: ENCRYPTED,
        lastStaffCancelReason: "UNIT_CLOSED",
        lastCancellationNotice: null,
        ...overrides,
    }
}

function setup({
    notice = target(),
    sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>().mockResolvedValue({
        ok: true,
        providerMessageId: "wamid.X",
    }),
    decrypt = vi.fn((value: string) => (value === ENCRYPTED ? PHONE : "outro")),
}: {
    notice?: CancellationNoticeTarget
    sendTemplate?: ReturnType<typeof vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>>
    decrypt?: (value: string) => string
} = {}) {
    const appointments = new AppointmentRepositoryStub({ noticeTargets: { "1": notice, "2": { ...notice } } })
    const logger = { log: vi.fn() }
    const service = createCitizenNotificationService({ appointments, gateway: { sendTemplate }, decrypt, logger })
    return { appointments, sendTemplate, logger, service }
}

describe("citizenNotification.service", () => {
    it("grava FAILED e não chama o gateway quando o agendamento não tem telefone", async () => {
        const { appointments, sendTemplate, service } = setup({ notice: target({ phoneEncrypted: null }) })

        await service.notifyCancellation("1", 42, FIXED_NOW)

        expect(sendTemplate).not.toHaveBeenCalled()
        expect(appointments.notificationCalls).toEqual([
            { id: "1", outcome: "FAILED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW, providerMessageId: null },
        ])
    })

    it("chama o gateway com o telefone decifrado, o modelo de cancelamento e os parâmetros do motivo gravado", async () => {
        const { sendTemplate, service } = setup({ notice: target({ lastStaffCancelReason: "DUPLICATE" }) })

        await service.notifyCancellation("1", 42, FIXED_NOW)

        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(sendTemplate).toHaveBeenCalledWith({
            to: PHONE,
            name: MODELO_AVISO_CANCELAMENTO.name,
            languageCode: MODELO_AVISO_CANCELAMENTO.languageCode,
            bodyParameters: parametrosAvisoCancelamento({
                name: "  Maria  da Silva",
                protocol: "1A2B3C4D",
                appointmentDatetime: new Date("2026-11-05T17:00:00.000Z"),
                reason: "DUPLICATE",
            }),
        })
    })

    it("grava CITIZEN_NOTIFIED com kind CANCELLATION, o ator e o id da mensagem na Meta quando o gateway aceita", async () => {
        const { appointments, service } = setup()

        const outcome = await service.notifyCancellation("1", 42, FIXED_NOW)

        expect(outcome).toBe("NOTIFIED")
        expect(appointments.notificationCalls).toEqual([
            { id: "1", outcome: "NOTIFIED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW, providerMessageId: "wamid.X" },
        ])
    })

    it("grava FAILED e não chama o gateway quando o telefone não decifra", async () => {
        const { appointments, sendTemplate, logger, service } = setup({
            decrypt: () => {
                throw new Error("Valor criptografado inválido")
            },
        })

        const outcome = await service.notifyCancellation("1", 42, FIXED_NOW)

        expect(outcome).toBe("FAILED")
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(appointments.notificationCalls).toEqual([
            { id: "1", outcome: "FAILED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW, providerMessageId: null },
        ])
        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({
            event: "citizen_notification_failed",
            appointmentId: "1",
            reason: "PHONE_UNAVAILABLE",
        })
    })

    it.each(["REJECTED", "UNREACHABLE", "NOT_CONFIGURED"] as const)(
        "grava FAILED sem lançar quando o gateway devolve %s",
        async (reason) => {
            const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>().mockResolvedValue({ ok: false, reason })
            const { appointments, logger, service } = setup({ sendTemplate })

            const outcome = await service.notifyCancellation("1", 42, FIXED_NOW)

            expect(outcome).toBe("FAILED")
            expect(appointments.notificationCalls).toEqual([
                { id: "1", outcome: "FAILED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW, providerMessageId: null },
            ])
            expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({
                event: "citizen_notification_failed",
                appointmentId: "1",
                reason,
            })
            expect(JSON.stringify(logger.log.mock.calls)).not.toContain(PHONE)
        },
    )

    it("recusa com NOTIFICATION_NOT_RETRYABLE, sem chamar o gateway nem gravar, quando não houve cancelamento pela equipe", async () => {
        const { appointments, sendTemplate, service } = setup({ notice: target({ lastStaffCancelReason: null }) })

        await expect(service.notifyCancellation("1", 42, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(sendTemplate).not.toHaveBeenCalled()
        expect(appointments.notificationCalls).toEqual([])
    })

    it("recusa com NOTIFICATION_NOT_RETRYABLE, sem decifrar, chamar o gateway nem gravar, quando o último aviso releito já foi entregue", async () => {
        const decrypt = vi.fn(() => PHONE)
        const { appointments, sendTemplate, service } = setup({ notice: target({ lastCancellationNotice: "NOTIFIED" }), decrypt })

        await expect(service.notifyCancellation("1", 42, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(decrypt).not.toHaveBeenCalled()
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(appointments.notificationCalls).toEqual([])
    })

    it("libera a trava depois de recusar o aviso já entregue, e a chamada seguinte não recebe NOTIFICATION_IN_PROGRESS", async () => {
        const { service } = setup({ notice: target({ lastCancellationNotice: "NOTIFIED" }) })
        await expect(service.notifyCancellation("1", 42, FIXED_NOW)).rejects.toMatchObject({ code: "NOTIFICATION_NOT_RETRYABLE" })

        const second = service.notifyCancellation("1", 43, FIXED_NOW)

        await expect(second).rejects.toMatchObject({ statusCode: 409, code: "NOTIFICATION_NOT_RETRYABLE" })
    })

    describe("trava contra envios simultâneos", () => {
        function pendingGateway() {
            const releases: ((result: SendTemplateResult) => void)[] = []
            const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>(
                () => new Promise((resolve) => releases.push(resolve)),
            )
            return { sendTemplate, release: (index: number) => releases[index]?.({ ok: true, providerMessageId: null }) }
        }

        it("recusa o segundo envio do mesmo agendamento com NOTIFICATION_IN_PROGRESS e chama o gateway uma vez", async () => {
            const gateway = pendingGateway()
            const { service } = setup({ sendTemplate: gateway.sendTemplate })

            const first = service.notifyCancellation("1", 42, FIXED_NOW)
            await vi.waitFor(() => expect(gateway.sendTemplate).toHaveBeenCalledTimes(1))
            const second = service.notifyCancellation("1", 43, FIXED_NOW)

            await expect(second).rejects.toMatchObject({ statusCode: 409, code: "NOTIFICATION_IN_PROGRESS" })
            expect(gateway.sendTemplate).toHaveBeenCalledTimes(1)
            gateway.release(0)
            await expect(first).resolves.toBe("NOTIFIED")

            const third = service.notifyCancellation("1", 44, FIXED_NOW)
            await vi.waitFor(() => expect(gateway.sendTemplate).toHaveBeenCalledTimes(2))
            gateway.release(1)
            await expect(third).resolves.toBe("NOTIFIED")
        })

        it("não bloqueia envios simultâneos de agendamentos diferentes", async () => {
            const gateway = pendingGateway()
            const { service } = setup({ sendTemplate: gateway.sendTemplate })

            const first = service.notifyCancellation("1", 42, FIXED_NOW)
            const second = service.notifyCancellation("2", 42, FIXED_NOW)
            await vi.waitFor(() => expect(gateway.sendTemplate).toHaveBeenCalledTimes(2))
            gateway.release(0)
            gateway.release(1)

            await expect(Promise.all([first, second])).resolves.toEqual(["NOTIFIED", "NOTIFIED"])
        })

        it("libera a trava quando o envio lança", async () => {
            const sendTemplate = vi
                .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
                .mockRejectedValueOnce(new Error("inesperado"))
                .mockResolvedValue({ ok: true, providerMessageId: null })
            const { service } = setup({ sendTemplate })

            await expect(service.notifyCancellation("1", 42, FIXED_NOW)).rejects.toThrow("inesperado")

            await expect(service.notifyCancellation("1", 42, FIXED_NOW)).resolves.toBe("NOTIFIED")
        })
    })
})
