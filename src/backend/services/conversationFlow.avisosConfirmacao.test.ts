import { beforeEach, describe, expect, test, vi } from "vitest"
import type { CitizenRescheduleResult } from "../types/schedule.types"
import { buildActiveSession, buildBookingDraft, buildReturningAppointment, mockBookResult, mockSlots, respostaPadrao, slotOptionId } from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

const PHONE = "5512999990000"
const PREFIXO = "Você receberá neste número avisos sobre este agendamento, como "

describe("conversationFlow.service: frase de avisos acompanha o lembrete e o aviso de cancelamento (#164)", () => {
    const harness = createConversationFlowHarness()
    const { findOrCreateActive, processarPergunta, getAvailableSlots, bookSlot, rescheduleByCitizen, findReturningAppointment } = harness

    beforeEach(() => {
        vi.clearAllMocks()
    })

    async function reservar(options: { reminderEnabled: boolean; noticeEnabled: boolean }) {
        const process = harness.createFlow({ isCancellationNoticeEnabled: async () => options.noticeEnabled })
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_SLOT", currentCategoryId: "1", currentQuestionId: "10", draft: buildBookingDraft() }),
        )
        getAvailableSlots.mockResolvedValueOnce(mockSlots)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)
        bookSlot.mockResolvedValueOnce({ ...mockBookResult, reminderEnabled: options.reminderEnabled, reminderHours: 24 })
        return process({ phone: PHONE, optionId: slotOptionId(mockSlots[0]!) })
    }

    test("lembrete ligado e aviso de cancelamento desligado cita só o lembrete", async () => {
        const result = await reservar({ reminderEnabled: true, noticeEnabled: false })

        expect(result.reply.text.endsWith(`${PREFIXO}um lembrete 24 horas antes do atendimento.`)).toBe(true)
    })

    test("os dois ligados citam o lembrete e o aviso de cancelamento", async () => {
        const result = await reservar({ reminderEnabled: true, noticeEnabled: true })

        expect(result.reply.text.endsWith(`${PREFIXO}um lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento.`)).toBe(true)
    })

    test("lembrete desligado e aviso de cancelamento ligado cita só o cancelamento", async () => {
        const result = await reservar({ reminderEnabled: false, noticeEnabled: true })

        expect(result.reply.text.endsWith(`${PREFIXO}o aviso em caso de cancelamento.`)).toBe(true)
    })

    test("os dois desligados tiram a frase e a mensagem termina nos documentos", async () => {
        const result = await reservar({ reminderEnabled: false, noticeEnabled: false })

        expect(result.reply.text).not.toContain("Você receberá")
        expect(result.reply.text.endsWith("• Contrato")).toBe(true)
    })

    test("na remarcação a frase também segue o lembrete e o aviso de cancelamento", async () => {
        const process = harness.createFlow({ isCancellationNoticeEnabled: async () => false })
        const rescheduled: CitizenRescheduleResult = {
            protocol: "AB12CD34",
            from: mockSlots[0]!.datetime,
            appointmentDatetime: mockSlots[1]!.datetime,
            unitAddress: "Rua do Procon, 100",
            unitAddressComplement: "Sala 2",
            documentsSent: { group: ["Procuração"], question: ["Contrato"] },
            byRepresentative: true,
            reminderEnabled: false,
            reminderHours: 2,
        }
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_SLOT", draft: { target_appointment_id: 7 }, listPage: 1 }),
        )
        findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment({ appointmentDatetime: mockSlots[0]!.datetime }))
        getAvailableSlots.mockResolvedValueOnce([mockSlots[0]!, mockSlots[1]!])
        rescheduleByCitizen.mockResolvedValueOnce(rescheduled)

        const result = await process({ phone: PHONE, optionId: slotOptionId(mockSlots[1]!) })

        expect(result.reply.text.split("\n")[0]).toBe("Agendamento remarcado")
        expect(result.reply.text).not.toContain("Você receberá")
    })

    test("se a leitura do interruptor falhar, o agendamento já gravado ainda recebe a confirmação sem a frase do cancelamento", async () => {
        const process = harness.createFlow({
            isCancellationNoticeEnabled: async () => {
                throw new Error("db down")
            },
        })
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_SLOT", currentCategoryId: "1", currentQuestionId: "10", draft: buildBookingDraft() }),
        )
        getAvailableSlots.mockResolvedValueOnce(mockSlots)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)
        bookSlot.mockResolvedValueOnce({ ...mockBookResult, reminderEnabled: true, reminderHours: 24 })

        const result = await process({ phone: PHONE, optionId: slotOptionId(mockSlots[0]!) })

        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toContain("Agendamento realizado")
        expect(result.reply.text).not.toContain("em caso de cancelamento")
        expect(result.reply.text).not.toContain("não foi gravado")
    })

    test("se a leitura do interruptor falhar, a remarcação já feita ainda recebe a confirmação", async () => {
        const process = harness.createFlow({
            isCancellationNoticeEnabled: async () => {
                throw new Error("db down")
            },
        })
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_SLOT", draft: { target_appointment_id: 7 }, listPage: 1 }),
        )
        findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment({ appointmentDatetime: mockSlots[0]!.datetime }))
        getAvailableSlots.mockResolvedValueOnce([mockSlots[0]!, mockSlots[1]!])
        rescheduleByCitizen.mockResolvedValueOnce({
            protocol: "AB12CD34",
            from: mockSlots[0]!.datetime,
            appointmentDatetime: mockSlots[1]!.datetime,
            unitAddress: "Rua do Procon, 100",
            unitAddressComplement: "Sala 2",
            documentsSent: { group: ["Procuração"], question: ["Contrato"] },
            byRepresentative: true,
            reminderEnabled: true,
            reminderHours: 2,
        })

        const result = await process({ phone: PHONE, optionId: slotOptionId(mockSlots[1]!) })

        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text.split("\n")[0]).toBe("Agendamento remarcado")
        expect(result.reply.text).not.toContain("em caso de cancelamento")
    })
})
