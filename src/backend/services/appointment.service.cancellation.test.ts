import { describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../clients/gateway.client"
import { buildAppointmentDetail, conversationEventsOf, FIXED_DATES, FIXED_NOW } from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import type { AppointmentStatus, CancellationNoticeTarget, CancellationReason } from "../types/appointment.types"
import { createAppointmentService } from "./appointment.service"
import { createCitizenNotificationService } from "./citizenNotification.service"
import { CORPO_AVISO_CANCELAMENTO, renderizarModelo } from "./messageFormatter.service"

const MANAGER = { canManage: true }
const PHONE = "5512999990000"
const ENCRYPTED = "v1:cifrado"

function noticeTarget(overrides: Partial<CancellationNoticeTarget> = {}): CancellationNoticeTarget {
    return {
        status: "CANCELED",
        appointmentDatetime: new Date(FIXED_DATES.tomorrow),
        name: "Maria Silva",
        protocol: "A1B2C3D4",
        phoneEncrypted: ENCRYPTED,
        lastStaffCancelReason: "UNIT_CLOSED",
        lastCancellationNotice: null,
        ...overrides,
    }
}

function setup({
    notice = noticeTarget(),
    result = { ok: true, providerMessageId: "wamid.X" } as SendTemplateResult,
    status = "CONFIRMED" as AppointmentStatus,
} = {}) {
    const repository = new AppointmentRepositoryStub({
        details: [buildAppointmentDetail({ id: "1", status, appointment_datetime: FIXED_DATES.tomorrow })],
        noticeTargets: { "1": notice },
        afterAction: (_call, current) => ({ ...current, status: "CANCELED" }),
    })
    const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>(async () => {
        repository.callOrder.push("sendTemplate")
        return result
    })
    const notifications = createCitizenNotificationService({
        appointments: repository,
        gateway: { sendTemplate },
        decrypt: () => PHONE,
        logger: { log: vi.fn() },
    })
    const service = createAppointmentService({
        repository,
        conversationEvents: conversationEventsOf({}),
        notifications,
    })
    return { repository, sendTemplate, service }
}

describe("appointment.service: cancelamento pela equipe", () => {
    it("cancela no repositório antes de enviar o aviso", async () => {
        const { repository, service } = setup()

        await service.cancelAppointment("1", 42, "UNIT_CLOSED", "Unidade em reforma", MANAGER, FIXED_NOW)

        expect(repository.cancelCalls).toEqual([
            { id: "1", actorUserId: 42, reason: "UNIT_CLOSED", note: "Unidade em reforma", now: FIXED_NOW },
        ])
        expect(repository.callOrder.slice(0, 4)).toEqual([
            "cancel",
            "findCancellationNoticeTarget",
            "sendTemplate",
            "recordCitizenNotification",
        ])
    })

    it("com o envio falhando, continua devolvendo o detalhe cancelado e grava a falha", async () => {
        const { repository, service } = setup({ result: { ok: false, reason: "UNREACHABLE" } })

        const detail = await service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)

        expect(detail.status).toBe("CANCELED")
        expect(repository.notificationCalls).toEqual([
            { id: "1", outcome: "FAILED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW },
        ])
    })

    it("o detalhe calcula retry_cancellation_notice a partir do último aviso de cancelamento", async () => {
        const { service } = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "FAILED" }) })

        const detail = await service.getAppointmentDetail("1", MANAGER, FIXED_NOW)

        expect(detail.available_actions.retry_cancellation_notice).toEqual({ allowed: true, code: null })
    })

    it("retryCancellationNotice recusa com NOTIFICATION_NOT_RETRYABLE quando o último aviso foi entregue e não chama o gateway", async () => {
        const { sendTemplate, service } = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "NOTIFIED" }) })

        await expect(service.retryCancellationNotice("1", 42, MANAGER, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("retryCancellationNotice reenvia quando o último aviso falhou e grava o novo resultado com o ator", async () => {
        const { repository, sendTemplate, service } = setup({
            status: "CANCELED",
            notice: noticeTarget({ lastCancellationNotice: "FAILED", lastStaffCancelReason: "OTHER" }),
        })

        const detail = await service.retryCancellationNotice("1", 77, MANAGER, FIXED_NOW)

        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(sendTemplate.mock.calls[0]?.[0].bodyParameters[4]).toBe("não será possível realizar o atendimento neste horário")
        expect(repository.notificationCalls).toEqual([
            { id: "1", outcome: "NOTIFIED", kind: "CANCELLATION", actorUserId: 77, now: FIXED_NOW },
        ])
        expect(detail.id).toBe("1")
    })

    it("getCancellationPreview devolve os 4 motivos na ordem da spec com o texto renderizado do modelo", async () => {
        const { service } = setup({ notice: noticeTarget({ name: "  Maria  da Silva", protocol: "1A2B3C4D", appointmentDatetime: new Date("2026-11-05T17:00:00.000Z") }) })

        const preview = await service.getCancellationPreview("1")

        expect(preview.previews.map((item) => item.reason)).toEqual(["UNIT_CLOSED", "CITIZEN_REQUEST", "DUPLICATE", "OTHER"])
        expect(preview.previews[0]?.message).toBe(
            "Olá, Maria. Seu agendamento 1A2B3C4D no PROCON Jacareí, marcado para 05/11 às 14:00, foi cancelado. Motivo: a unidade estará fechada nesta data. Para agendar novamente, envie uma mensagem para este número.",
        )
    })

    it("getCancellationPreview recusa com 404 quando o agendamento não existe", async () => {
        const { service } = setup()

        await expect(service.getCancellationPreview("999")).rejects.toMatchObject({ statusCode: 404 })
    })

    it.each(["UNIT_CLOSED", "CITIZEN_REQUEST", "DUPLICATE", "OTHER"] as CancellationReason[])(
        "para o motivo %s, o texto dos parâmetros enviados é igual à mensagem da prévia",
        async (reason) => {
            const { sendTemplate, service } = setup({ notice: noticeTarget({ lastStaffCancelReason: reason }) })
            const preview = await service.getCancellationPreview("1")

            await service.cancelAppointment("1", 42, reason, "observação interna que não vai ao cidadão", MANAGER, FIXED_NOW)

            const sent = sendTemplate.mock.calls[0]?.[0]
            expect(sent).toBeDefined()
            const rendered = renderizarModelo(CORPO_AVISO_CANCELAMENTO, sent?.bodyParameters ?? [])
            expect(rendered).toBe(preview.previews.find((item) => item.reason === reason)?.message)
            expect(JSON.stringify(sent?.bodyParameters)).not.toContain("observação interna")
        },
    )

    it("nem o detalhe nem a prévia contêm o telefone decifrado", async () => {
        const { service } = setup()

        const detail = await service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)
        const preview = await service.getCancellationPreview("1")

        expect(JSON.stringify(detail)).not.toContain(PHONE)
        expect(JSON.stringify(detail)).not.toContain(ENCRYPTED)
        expect(JSON.stringify(preview)).not.toContain(PHONE)
        expect(JSON.stringify(preview)).not.toContain(ENCRYPTED)
    })
})
