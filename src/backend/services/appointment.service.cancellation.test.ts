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
    isEnabled = async () => true,
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
    const logger = { error: vi.fn() }
    const service = createAppointmentService({
        repository,
        conversationEvents: conversationEventsOf({}),
        notifications,
        cancellationNotice: { isEnabled },
        logger,
    })
    return { repository, sendTemplate, service, logger }
}

describe("appointment.service: cancelamento pela equipe", () => {
    it("cancela no repositório antes de enviar o aviso", async () => {
        const { repository, service } = setup()

        await service.cancelAppointment("1", 42, "UNIT_CLOSED", "Unidade em reforma", MANAGER, FIXED_NOW)

        expect(repository.cancelCalls).toEqual([
            { id: "1", actorUserId: 42, reason: "UNIT_CLOSED", note: "Unidade em reforma", now: FIXED_NOW, noticeDisabled: false },
        ])
        expect(repository.callOrder.slice(0, 4)).toEqual([
            "cancel",
            "findCancellationNoticeTarget",
            "sendTemplate",
            "recordCitizenNotification",
        ])
    })

    it("com o aviso desligado cancela com o registro de aviso desativado e não chama a Meta nem grava falha", async () => {
        const { repository, sendTemplate, service } = setup({ isEnabled: async () => false })

        const detail = await service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)

        expect(detail.status).toBe("CANCELED")
        expect(repository.cancelCalls).toEqual([
            { id: "1", actorUserId: 42, reason: "UNIT_CLOSED", note: undefined, now: FIXED_NOW, noticeDisabled: true },
        ])
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(repository.notificationCalls).toEqual([])
        expect(repository.callOrder).not.toContain("recordCitizenNotification")
        expect(repository.callOrder).not.toContain("sendTemplate")
    })

    it("com o aviso desligado e sem telefone cancela do mesmo jeito, sem falha de telefone", async () => {
        const { repository, service } = setup({ isEnabled: async () => false, notice: noticeTarget({ phoneEncrypted: null }) })

        const detail = await service.cancelAppointment("1", 42, "OTHER", undefined, MANAGER, FIXED_NOW)

        expect(detail.status).toBe("CANCELED")
        expect(repository.notificationCalls).toEqual([])
    })

    it("se a configuração do aviso não puder ser lida, não cancela e devolve o erro", async () => {
        const { repository, sendTemplate, service } = setup({
            isEnabled: async () => {
                throw new Error("banco indisponível")
            },
        })

        await expect(service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)).rejects.toThrow("banco indisponível")

        expect(repository.cancelCalls).toEqual([])
        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("retryCancellationNotice recusa o reenvio quando o último registro é de aviso desativado, mesmo com o aviso ligado depois", async () => {
        const { sendTemplate, service } = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "DISABLED" }) })

        await expect(service.retryCancellationNotice("1", 42, MANAGER, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("retryCancellationNotice recusa o reenvio de falha antiga quando o aviso está desligado e não chama a Meta", async () => {
        const { sendTemplate, service } = setup({
            status: "CANCELED",
            notice: noticeTarget({ lastCancellationNotice: "FAILED" }),
            isEnabled: async () => false,
        })

        await expect(service.retryCancellationNotice("1", 42, MANAGER, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("o detalhe não oferece o reenvio quando o último registro é de aviso desativado e informa o estado do aviso", async () => {
        const { service } = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "DISABLED" }) })

        const detail = await service.getAppointmentDetail("1", MANAGER, FIXED_NOW)

        expect(detail.available_actions.retry_cancellation_notice).toEqual({ allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" })
        expect(detail.cancellation_notice_status).toBe("DISABLED")
    })

    it("o detalhe informa o estado FAILED e NOTIFIED do aviso e nulo quando não houve cancelamento pela equipe", async () => {
        const failed = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "FAILED" }) })
        const notified = setup({ status: "CANCELED", notice: noticeTarget({ lastCancellationNotice: "NOTIFIED" }) })
        const never = setup({ status: "CONFIRMED", notice: noticeTarget({ status: "CONFIRMED", lastStaffCancelReason: null }) })

        expect((await failed.service.getAppointmentDetail("1", MANAGER, FIXED_NOW)).cancellation_notice_status).toBe("FAILED")
        expect((await notified.service.getAppointmentDetail("1", MANAGER, FIXED_NOW)).cancellation_notice_status).toBe("NOTIFIED")
        expect((await never.service.getAppointmentDetail("1", MANAGER, FIXED_NOW)).cancellation_notice_status).toBeNull()
    })

    it("com o envio falhando, continua devolvendo o detalhe cancelado e grava a falha", async () => {
        const { repository, service } = setup({ result: { ok: false, reason: "UNREACHABLE" } })

        const detail = await service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)

        expect(detail.status).toBe("CANCELED")
        expect(repository.notificationCalls).toEqual([
            { id: "1", outcome: "FAILED", kind: "CANCELLATION", actorUserId: 42, now: FIXED_NOW, providerMessageId: null },
        ])
    })

    it("com a gravação do resultado do aviso lançando depois do cancelamento, devolve o detalhe cancelado e loga só o id e o código", async () => {
        const { logger, repository, service } = setup()
        vi.spyOn(repository, "recordCitizenNotification").mockRejectedValueOnce(
            Object.assign(new Error(`falha ao gravar o aviso para ${PHONE}`), { code: "ECONNRESET" }),
        )

        const detail = await service.cancelAppointment("1", 42, "UNIT_CLOSED", undefined, MANAGER, FIXED_NOW)

        expect(detail.status).toBe("CANCELED")
        expect(logger.error).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledWith("Erro no aviso de cancelamento ao cidadão depois do cancelamento", {
            appointmentId: "1",
            code: "ECONNRESET",
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(PHONE)
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("falha ao gravar")
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

    it("retryCancellationNotice recusa com NOTIFICATION_NOT_RETRYABLE quando o aviso foi entregue entre a checagem e a trava, sem chamar o gateway", async () => {
        const { repository, sendTemplate, service } = setup({ status: "CANCELED" })
        vi.spyOn(repository, "findCancellationNoticeTarget")
            .mockResolvedValueOnce(noticeTarget({ lastCancellationNotice: "FAILED" }))
            .mockResolvedValueOnce(noticeTarget({ lastCancellationNotice: "NOTIFIED" }))

        await expect(service.retryCancellationNotice("1", 42, MANAGER, FIXED_NOW)).rejects.toMatchObject({
            statusCode: 409,
            code: "NOTIFICATION_NOT_RETRYABLE",
        })

        expect(sendTemplate).not.toHaveBeenCalled()
        expect(repository.notificationCalls).toEqual([])
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
            { id: "1", outcome: "NOTIFIED", kind: "CANCELLATION", actorUserId: 77, now: FIXED_NOW, providerMessageId: "wamid.X" },
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
